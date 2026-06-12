import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Kategorie, KoloTyp, MereniRadek, MereniTimerStav, RostSlot } from '@shared/types'
import { useTheme } from './hooks/useTheme'
import { Button, Table, Tabs } from '@heroui/react'
import { Btn } from './components/ui'
import { ArrowUpArrowDown, ChevronRight, Moon, Plus, Stopwatch, Sun, TrashBin } from '@gravity-ui/icons'
import { Modal } from './components/Modal'
import { fmtTime, parseTimeLoose } from './lib/time'
import { safeCall } from './lib/api'

const T2 = 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
const T3 = 'color-mix(in srgb, var(--color-foreground) 35%, transparent)'
const T4 = 'color-mix(in srgb, var(--color-foreground) 22%, transparent)'
const CARD_ALT = 'color-mix(in srgb, var(--color-foreground) 4%, transparent)'

interface Kanal {
  jizdaId: number
  label: string
  klik: MereniRadek[]
  running: boolean
  startEpoch: number | null
  baseMs: number
}

const KOLA_LABEL: Partial<Record<KoloTyp, string>> = {
  Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', SF: 'SF', F: 'Finále'
}

const MERENA_KOLA: KoloTyp[] = ['Q1', 'Q2', 'Q3', 'SF', 'F']

function elapsed(k: Kanal, t: number): number {
  return k.running && k.startEpoch != null ? k.baseMs + (t - k.startEpoch) : k.baseMs
}

export function StopkyApp(): React.JSX.Element {
  const { theme, toggle } = useTheme()
  const [kategorie, setKategorie] = useState<Kategorie[]>([])
  const [zavodId, setZavodId] = useState<number | null>(null)
  const [zavodNazev, setZavodNazev] = useState('')
  const [kanaly, setKanaly] = useState<Kanal[]>([])
  const [aktivniId, setAktivniId] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [nove, setNove] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [potvrd, setPotvrd] = useState<{ typ: 'zapis' | 'zahodit'; jizdaId: number; label: string } | null>(null)
  const [aktivniRadek, setAktivniRadek] = useState<number | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [aktRost, setAktRost] = useState<RostSlot[] | null>(null)
  const cisloRefs = useRef<Map<number, HTMLInputElement | null>>(new Map())

  const akt = kanaly.find((k) => k.jizdaId === aktivniId) ?? null

  const focusDalsi = (id: number): void => {
    if (!akt) return
    const idx = akt.klik.findIndex((c) => c.id === id)
    const dalsi = akt.klik[idx + 1]
    if (dalsi) cisloRefs.current.get(dalsi.id)?.focus()
    else cisloRefs.current.get(id)?.blur()
  }

  const oznam = useCallback((t: string): void => setToast(t), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const timerPayload = (k: Kanal): MereniTimerStav => ({
    jizdaId: k.jizdaId,
    running: k.running,
    baseMs: k.baseMs,
    startEpochMs: k.startEpoch
  })

  const ulozVsechnyKanaly = useCallback(
    (list: Kanal[], aktivni: number | null): void => {
      if (zavodId == null) return
      for (const k of list) {
        void window.api.ulozMereniTimer(k.jizdaId, timerPayload(k))
      }
      void window.api.ulozMereniAktivniJizdu(aktivni)
    },
    [zavodId]
  )

  const nactiZavodAkanaly = useCallback(async (): Promise<void> => {
    const z = await window.api.getAktivniZavod()
    let zId: number | null = null
    if (z) {
      zId = z.id
      setZavodId(z.id)
      setZavodNazev(z.nazev)
      setKategorie(await window.api.listKategorie(z.id))
    } else {
      setZavodId(null)
      setZavodNazev('')
      setKategorie([])
    }
    const [ks, timery, ulozenaAktivni] = await Promise.all([
      window.api.mereniKanaly(),
      zId != null ? window.api.nactiMereniTimery() : Promise.resolve([]),
      zId != null ? window.api.nactiMereniAktivniJizdu() : Promise.resolve(null)
    ])
    const timerMap = new Map(timery.map((t) => [t.jizdaId, t]))
    const full: Kanal[] = []
    for (const k of ks) {
      const klik = await window.api.mereniList(k.jizdaId)
      const t = timerMap.get(k.jizdaId)
      const last = klik.length ? klik[klik.length - 1].cas_ms : 0
      full.push({
        jizdaId: k.jizdaId,
        label: k.label,
        klik,
        running: t?.running ?? false,
        startEpoch: t?.running && t.startEpochMs != null ? t.startEpochMs : null,
        baseMs: t != null ? t.baseMs : last
      })
    }
    const aktivni =
      ulozenaAktivni != null && full.some((k) => k.jizdaId === ulozenaAktivni)
        ? ulozenaAktivni
        : (full[0]?.jizdaId ?? null)
    setKanaly(full)
    setAktivniId(aktivni)
    setNove(false)
    setPotvrd(null)
    setAktivniRadek(null)
  }, [])

  useEffect(() => { void nactiZavodAkanaly() }, [nactiZavodAkanaly])
  useEffect(() => window.api.onZavodChanged(() => void nactiZavodAkanaly()), [nactiZavodAkanaly])

  useEffect(() => {
    if (zavodId == null || kanaly.length === 0) return
    const t = setTimeout(() => ulozVsechnyKanaly(kanaly, aktivniId), 350)
    return () => clearTimeout(t)
  }, [kanaly, aktivniId, zavodId, ulozVsechnyKanaly])

  useEffect(() => {
    const flush = (): void => ulozVsechnyKanaly(kanaly, aktivniId)
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [kanaly, aktivniId, ulozVsechnyKanaly])

  useEffect(() => {
    if (!akt?.running) return
    const t = setInterval(() => setNow(Date.now()), 53)
    return () => clearInterval(t)
  }, [akt?.running, aktivniId])

  useEffect(() => window.api.onStopkyRequestConfirm(() => setShowCloseConfirm(true)), [])

  useEffect(() => {
    if (!akt) { setAktRost(null); return }
    let live = true
    safeCall(
      window.api.getRostJizda(akt.jizdaId).then((slots) => {
        if (live) setAktRost(slots)
      }),
      (msg) => { if (live) oznam(`Nepodařilo se načíst rošt: ${msg}`) }
    )
    return () => { live = false }
  }, [akt?.jizdaId])

  const updKanal = (jizdaId: number, patch: Partial<Kanal>): void =>
    setKanaly((prev) => prev.map((k) => (k.jizdaId === jizdaId ? { ...k, ...patch } : k)))

  const zaznamenej = useCallback(async (): Promise<void> => {
    const k = kanaly.find((x) => x.jizdaId === aktivniId)
    if (!k || !k.running || k.startEpoch == null) return
    const cas = k.baseMs + (Date.now() - k.startEpoch)
    const row = await window.api.mereniPridej(k.jizdaId, cas)
    setKanaly((prev) => {
      const next = prev.map((x) =>
        x.jizdaId === k.jizdaId ? { ...x, klik: [...x.klik, row] } : x
      )
      const updated = next.find((x) => x.jizdaId === k.jizdaId)
      if (updated) void window.api.ulozMereniTimer(updated.jizdaId, timerPayload(updated))
      return next
    })
  }, [kanaly, aktivniId])

  const vratPosledni = useCallback(async (): Promise<void> => {
    const k = kanaly.find((x) => x.jizdaId === aktivniId)
    if (!k || k.klik.length === 0) return
    await window.api.mereniVratPosledni(k.jizdaId)
    setKanaly((prev) =>
      prev.map((x) => (x.jizdaId === k.jizdaId ? { ...x, klik: x.klik.slice(0, -1) } : x))
    )
  }, [kanaly, aktivniId])

  const pauza = (): void => {
    if (!akt) return
    if (akt.running) {
      const base = akt.baseMs + (akt.startEpoch != null ? Date.now() - akt.startEpoch : 0)
      const patch = { running: false, startEpoch: null, baseMs: base }
      updKanal(akt.jizdaId, patch)
      void window.api.ulozMereniTimer(akt.jizdaId, {
        jizdaId: akt.jizdaId, running: false, baseMs: base, startEpochMs: null
      })
    } else {
      const startEpoch = Date.now()
      updKanal(akt.jizdaId, { running: true, startEpoch })
      setNow(startEpoch)
      void window.api.ulozMereniTimer(akt.jizdaId, {
        jizdaId: akt.jizdaId, running: true, baseMs: akt.baseMs, startEpochMs: startEpoch
      })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (nove || potvrd) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (akt?.running) void zaznamenej()
        else pauza()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        void vratPosledni()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zaznamenej, vratPosledni, pauza, akt, nove, potvrd])

  const zalozMereni = (jizdaId: number, label: string): void => {
    setNove(false)
    if (kanaly.some((k) => k.jizdaId === jizdaId)) {
      setAktivniId(jizdaId)
      return
    }
    setKanaly((prev) => [
      ...prev,
      { jizdaId, label, klik: [], running: false, startEpoch: null, baseMs: 0 }
    ])
    setAktivniId(jizdaId)
  }

  const priradCislo = async (row: MereniRadek, raw: string): Promise<boolean> => {
    const trimmed = raw.trim()
    const parsed = trimmed === '' ? null : Number.parseInt(trimmed, 10)
    const valid = parsed !== null && !Number.isNaN(parsed)
    const res = await window.api.mereniSetCislo(row.id, valid ? parsed : null)
    if (res.duplicitni) oznam(`Číslo ${parsed} už je přiřazené jinému času v této jízdě.`)
    else if (trimmed !== '' && !res.ok) oznam(`Startovní číslo ${trimmed} v této kategorii není.`)
    setKanaly((prev) =>
      prev.map((k) =>
        k.jizdaId !== row.jizda_id ? k : {
          ...k,
          klik: k.klik.map((c) =>
            c.id !== row.id ? c : {
              ...c,
              jezdec_id: res.ok ? res.jezdec?.id ?? null : c.jezdec_id,
              st_cislo: res.ok ? res.jezdec?.st_cislo ?? null : c.st_cislo,
              prijmeni: res.ok ? res.jezdec?.prijmeni ?? null : c.prijmeni,
              jmeno: res.ok ? res.jezdec?.jmeno ?? null : c.jmeno
            }
          )
        }
      )
    )
    return res.ok || trimmed === ''
  }

  const opravCas = async (row: MereniRadek, ms: number): Promise<void> => {
    const novy = await window.api.mereniOpravCas(row.id, ms)
    setKanaly((prev) =>
      prev.map((k) =>
        k.jizdaId !== row.jizda_id ? k
          : { ...k, klik: k.klik.map((c) => (c.id === row.id ? { ...c, cas_ms: novy.cas_ms } : c)) }
      )
    )
  }

  const zapisDoVysledku = async (jizdaId: number): Promise<void> => {
    await window.api.zapisMereniDoVysledku(jizdaId)
    setPotvrd(null)
    oznam('Zapsáno do Výsledků — pořadí a body se spočítaly.')
  }

  const zkusZapsat = async (): Promise<void> => {
    if (!akt) return
    if (akt.klik.filter((c) => c.jezdec_id != null).length === 0) {
      oznam('Nejdřív přiřaď startovní čísla k časům.')
      return
    }
    if (await window.api.mereniMaVysledky(akt.jizdaId)) {
      setPotvrd({ typ: 'zapis', jizdaId: akt.jizdaId, label: akt.label })
    } else {
      await zapisDoVysledku(akt.jizdaId)
    }
  }

  const zahodKanal = async (jizdaId: number): Promise<void> => {
    await window.api.mereniSmazKanal(jizdaId)
    setPotvrd(null)
    setKanaly((prev) => {
      const zbytek = prev.filter((k) => k.jizdaId !== jizdaId)
      if (aktivniId === jizdaId) setAktivniId(zbytek.length ? zbytek[0].jizdaId : null)
      return zbytek
    })
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background)',
        color: 'var(--color-foreground)'
      }}
    >
      {/* Horní lišta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          borderBottom: '0.5px solid var(--color-border)'
        }}
      >
        <Stopwatch width={20} height={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 680 }}>Stopky</div>
          {zavodNazev && (
            <div style={{ fontSize: 11.5, color: T3 }}>{zavodNazev}</div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <Btn
          variant="bezel"
          icon={theme === 'dark' ? <Sun /> : <Moon />}
          onClick={toggle}
          title={theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
        />
      </div>

      {/* Pruh kanálů */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          flexWrap: 'wrap',
          borderBottom: '0.5px solid var(--color-border)'
        }}
      >
        {kanaly.map((k) => {
          const on = k.jizdaId === aktivniId
          return (
            <Button
              key={k.jizdaId}
              variant={on ? 'primary' : 'outline'}
              size="sm"
              onPress={() => {
                if (aktivniId != null && aktivniId !== k.jizdaId) {
                  const pred = kanaly.find((x) => x.jizdaId === aktivniId)
                  if (pred) void window.api.ulozMereniTimer(pred.jizdaId, timerPayload(pred))
                }
                setAktivniId(k.jizdaId)
                setNove(false)
                void window.api.ulozMereniAktivniJizdu(k.jizdaId)
              }}
            >
              <span style={{ fontWeight: on ? 580 : 500 }}>{k.label}</span>
              <span className="tnum" style={{ opacity: on ? 0.85 : 0.6, fontWeight: on ? 580 : 500 }}>
                · {k.klik.length}
              </span>
              {k.running && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: on ? 'rgba(255,255,255,0.75)' : T3,
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
              )}
            </Button>
          )
        })}
        <Btn variant="bezel" icon={<Plus />} onClick={() => setNove(true)}>
          Nové měření
        </Btn>
      </div>

      {/* Obsah */}
      {nove ? (
        <NoveMereni
          key={zavodId ?? 'none'}
          kategorie={kategorie}
          onZalozit={zalozMereni}
          onZrusit={() => setNove(false)}
        />
      ) : !akt ? (
        <Prazdno onNove={() => setNove(true)} />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* Levý sloupec: hodiny + ovládání */}
          <div
            style={{
              width: 340,
              minWidth: 340,
              flexShrink: 0,
              borderRight: '0.5px solid var(--color-border)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div style={{ fontSize: 12.5, color: T2 }}>{akt.label}</div>
            <div
              className="tnum"
              style={{
                fontSize: 52,
                fontWeight: 680,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {fmtTime(elapsed(akt, now))}
            </div>

            {(() => {
              const notStarted = !akt.running && akt.baseMs === 0
              const paused = !akt.running && akt.baseMs > 0
              return (
                <>
                  <Button
                    variant="primary"
                    isDisabled={paused}
                    onPress={() => notStarted ? pauza() : void zaznamenej()}
                    className="w-full font-[680] tracking-[0.02em]"
                    style={{ height: 92, borderRadius: 12, fontSize: 22 }}
                  >
                    {notStarted ? 'START' : 'ZAZNAMENAT'}
                  </Button>
                  <div style={{ fontSize: 11.5, color: T3, textAlign: 'center' }}>
                    {notStarted
                      ? 'mezerník = start'
                      : akt.running
                        ? 'mezerník = záznam · Backspace = vrátit poslední'
                        : 'mezerník = pokračovat'}
                  </div>
                </>
              )
            })()}

            <div style={{ display: 'flex', gap: 12, marginTop: 2, marginBottom: 2 }}>
              <Btn variant="bezel" onClick={pauza} style={{ flex: 1, height: 46, fontSize: 14 }}>
                {akt.running ? 'Pauza' : akt.baseMs === 0 ? 'Start' : 'Pokračovat'}
              </Btn>
              <Btn
                variant="bezel"
                onClick={() => void vratPosledni()}
                disabled={akt.klik.length === 0}
                style={{ flex: 1, height: 46, fontSize: 14 }}
              >
                Vrátit poslední
              </Btn>
            </div>

            <div style={{ flex: 1 }} />
            <Btn variant="primary" icon={<ArrowUpArrowDown />} onClick={() => void zkusZapsat()}>
              Zapsat do Výsledků
            </Btn>
            <Btn
              variant="plain"
              icon={<TrashBin />}
              onClick={() => setPotvrd({ typ: 'zahodit', jizdaId: akt.jizdaId, label: akt.label })}
            >
              Zahodit měření
            </Btn>
          </div>

          {/* Střední sloupec: tabulka naměřených časů */}
          <div style={{ flex: 1, minWidth: 600, overflowY: 'auto', padding: '18px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '0 2px 8px'
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 620 }}>Naměřené časy</span>
                <span style={{ fontSize: 12, color: T3 }}>
                  přiřazeno {akt.klik.filter((c) => c.jezdec_id != null).length} / {akt.klik.length}
                </span>
              </div>

              {akt.klik.length === 0 ? (
                <div
                  style={{
                    padding: '30px 16px',
                    textAlign: 'center',
                    color: T3,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 12,
                    background: 'var(--color-background)'
                  }}
                >
                  Zatím žádný záznam.
                  <br />
                  Zmáčkni <b>mezerník</b> (nebo velké tlačítko) při průjezdu cílem.
                </div>
              ) : (
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Naměřené časy">
                      <Table.Header className="sticky top-0 z-10">
                        <Table.Column isRowHeader style={{ width: 52 }}>#</Table.Column>
                        <Table.Column style={{ width: 134 }}>Čas</Table.Column>
                        <Table.Column style={{ width: 116 }}>St. č.</Table.Column>
                        <Table.Column>Jezdec</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {akt.klik.map((row, i) => {
                          const assigned = row.jezdec_id != null
                          const active = aktivniRadek === row.id
                          return (
                            <Table.Row
                              id={row.id}
                              key={row.id}
                              style={{
                                background: active
                                  ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-background))'
                                  : i % 2 ? CARD_ALT : 'transparent',
                                boxShadow: active ? 'inset 3px 0 0 var(--color-primary)' : 'none'
                              }}
                            >
                              <Table.Cell
                                style={{ color: T3, fontVariantNumeric: 'tabular-nums', fontSize: 14, padding: '0 14px', height: 48, verticalAlign: 'middle' }}
                              >
                                {i + 1}.
                              </Table.Cell>
                              <Table.Cell style={{ padding: '0 14px', height: 48, verticalAlign: 'middle' }}>
                                <CasCell cas={row.cas_ms} onCommit={(ms) => void opravCas(row, ms)} />
                              </Table.Cell>
                              <Table.Cell style={{ padding: '0 8px', height: 48, verticalAlign: 'middle' }}>
                                <CisloInput
                                  row={row}
                                  setRef={(el) => cisloRefs.current.set(row.id, el)}
                                  onCommit={(raw) => priradCislo(row, raw)}
                                  onFocusRow={() => setAktivniRadek(row.id)}
                                  onBlurRow={() => setAktivniRadek((c) => (c === row.id ? null : c))}
                                  onEnter={() => focusDalsi(row.id)}
                                />
                              </Table.Cell>
                              <Table.Cell style={{ fontSize: 14.5, padding: '0 14px', height: 48, verticalAlign: 'middle' }}>
                                {assigned ? (
                                  <span>
                                    <b style={{ fontWeight: 600 }}>{row.prijmeni}</b>{' '}
                                    <span style={{ color: T2 }}>{row.jmeno}</span>
                                  </span>
                                ) : (
                                  <span style={{ color: T4 }}>čeká na číslo</span>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          )
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </div>
          </div>

          {/* Pravý sloupec: read-only náhled roštu */}
          <RostNahled
            sloty={aktRost}
            prirazeni={new Set(akt.klik.filter(c => c.jezdec_id != null).map(c => c.jezdec_id as number))}
          />
        </div>
      )}

      {potvrd && (
        <Modal
          title={potvrd.typ === 'zapis' ? 'Přepsat výsledky?' : 'Zahodit měření?'}
          width={440}
          onClose={() => setPotvrd(null)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setPotvrd(null)}>Zrušit</Btn>
              {potvrd.typ === 'zapis' ? (
                <Btn variant="primary" icon={<ArrowUpArrowDown />} onClick={() => void zapisDoVysledku(potvrd.jizdaId)}>
                  Zapsat
                </Btn>
              ) : (
                <Btn variant="danger" icon={<TrashBin />} onClick={() => void zahodKanal(potvrd.jizdaId)}>
                  Zahodit
                </Btn>
              )}
            </>
          }
        >
          {potvrd.typ === 'zapis' ? (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
              Jízda <b>{potvrd.label}</b> už má zadané výsledky. Naměřené časy přepíšou časy
              přiřazených jezdců a přepočítá se pořadí i body.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
              Smazat všechny zaznamenané časy měření <b>{potvrd.label}</b>? Tuto akci nelze vrátit.
            </p>
          )}
        </Modal>
      )}

      {showCloseConfirm && (
        <Modal
          title="Stopky — nezapsané měření"
          width={440}
          onClose={() => setShowCloseConfirm(false)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setShowCloseConfirm(false)}>Zůstat</Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  setShowCloseConfirm(false)
                  void window.api.stopkyZavritPotvrzeno()
                }}
              >
                Zavřít i tak
              </Btn>
            </>
          }
        >
          <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55 }}>
            Máš rozměřené stopky, které nejsou zapsané do výsledků.
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: T2 }}>
            Data měření zůstanou uložená v aplikaci. Po znovuotevření stopek je najdeš tam, kde
            jsi skončil. Nezapomeň je zapsat do výsledků v hlavní aplikaci.
          </p>
        </Modal>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            background: 'var(--color-background)',
            border: '0.5px solid var(--color-border)',
            boxShadow: '0 4px 16px color-mix(in srgb, var(--color-foreground) 12%, transparent)',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            maxWidth: '80vw'
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ---- Nové měření ----
function NoveMereni({
  kategorie,
  onZalozit,
  onZrusit
}: {
  kategorie: Kategorie[]
  onZalozit: (jizdaId: number, label: string) => void
  onZrusit: () => void
}): React.JSX.Element {
  const [katId, setKatId] = useState<number | null>(kategorie[0]?.id ?? null)
  const [typ, setTyp] = useState<KoloTyp>('Q1')
  const [jizdy, setJizdy] = useState<{ id: number; cislo: number; filled: number }[]>([])
  const [hotovo, setHotovo] = useState<Set<number>>(new Set())

  const aktKat = kategorie.find((k) => k.id === katId) ?? null
  void aktKat
  const KOLA = MERENA_KOLA

  useEffect(() => {
    safeCall(window.api.mereniDalsiJizda().then((d) => {
      if (!d) return
      if (kategorie.some((k) => k.id === d.katId)) setKatId(d.katId)
      if (MERENA_KOLA.includes(d.koloTyp)) setTyp(d.koloTyp)
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!KOLA.includes(typ)) setTyp(KOLA[0] ?? 'Q1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [katId])

  useEffect(() => {
    if (katId == null) { setJizdy([]); setHotovo(new Set()); return }
    let live = true
    void Promise.all([
      window.api.getRosty(katId, typ),
      window.api.mereniJizdyHotovo(katId, typ)
    ]).then(([r, hots]) => {
      if (!live) return
      setJizdy(r.jizdy.map((jz) => ({ id: jz.id, cislo: jz.cislo, filled: jz.sloty.filter((s) => s.jezdec).length })))
      setHotovo(new Set(hots))
    })
    return () => { live = false }
  }, [katId, typ])

  const katNazev = kategorie.find((k) => k.id === katId)?.nazev ?? ''
  const naRadeId = jizdy.find((jz) => !hotovo.has(jz.id))?.id ?? null

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        overflowY: 'auto',
        padding: 24,
        background: 'var(--color-background)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--color-background)',
          borderRadius: 12,
          boxShadow: '0 2px 12px color-mix(in srgb, var(--color-foreground) 8%, transparent)',
          border: '0.5px solid var(--color-border)',
          overflow: 'hidden'
        }}
      >
        {/* Hlavička karty */}
        <div style={{ padding: '20px 24px 18px', borderBottom: '0.5px solid var(--color-border)' }}>
          <div style={{ fontSize: 17, fontWeight: 680, marginBottom: 4 }}>Nové měření</div>
          <div style={{ fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
            Vyber jízdu, kterou budeš měřit. Naměřené časy padnou rovnou do ní.
          </div>
        </div>

        {/* Tělo karty */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Kategorie */}
          <div>
            <div style={labelStyle}>Kategorie</div>
            <KategorieSelect items={kategorie} value={katId} onChange={setKatId} />
          </div>

          {/* Kolo */}
          <div>
            <div style={labelStyle}>Kolo</div>
            <Tabs selectedKey={typ} onSelectionChange={(key) => setTyp(key as KoloTyp)}>
              <Tabs.ListContainer>
                <Tabs.List aria-label="Kolo">
                  {KOLA.map((t) => (
                    <Tabs.Tab key={t} id={t}>
                      {KOLA_LABEL[t]}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>

          {/* Jízda */}
          <div>
            <div style={labelStyle}>Jízda</div>
            {jizdy.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: T3,
                  lineHeight: 1.55,
                  padding: '12px 14px',
                  background: CARD_ALT,
                  borderRadius: 6,
                  border: '0.5px solid var(--color-border)'
                }}
              >
                Pro <b style={{ color: T2, fontWeight: 580 }}>{katNazev} · {KOLA_LABEL[typ]}</b> zatím není žádná jízda.
                <br />Vytvoř rošt v hlavním okně.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {jizdy.map((jz) => {
                  const jeHotovo = hotovo.has(jz.id)
                  const jeNaRade = jz.id === naRadeId
                  return (
                    <Button
                      key={jz.id}
                      variant={jeNaRade ? 'primary' : 'outline'}
                      size="sm"
                      onPress={() => onZalozit(jz.id, `${katNazev} · ${KOLA_LABEL[typ]} · ${jz.cislo}. jízda`)}
                      style={{ opacity: jeHotovo && !jeNaRade ? 0.55 : 1, height: 34 }}
                      startContent={
                        jeHotovo ? (
                          <span style={{ color: T3, fontSize: 12, lineHeight: 1 }}>✓</span>
                        ) : jeNaRade ? (
                          <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--color-primary)', flexShrink: 0, display: 'inline-block' }} />
                        ) : undefined
                      }
                    >
                      {jz.cislo}. jízda
                      <span style={{ fontSize: 12, color: T3, fontVariantNumeric: 'tabular-nums' }}>
                        ({jz.filled})
                      </span>
                    </Button>
                  )
                })}
              </div>
            )}
            {jizdy.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 14, fontSize: 11.5, color: T3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: T3 }}>✓</span> hotovo
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--color-primary)', display: 'inline-block' }} /> na řadě
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Patička karty */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '0.5px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
          }}
        >
          <Btn variant="plain" onClick={onZrusit}>Zrušit</Btn>
        </div>
      </div>
    </div>
  )
}

const DROPDOWN_CAP = 320
const DROPDOWN_GAP = 4
const DROPDOWN_EDGE = 8

function KategorieSelect({
  items,
  value,
  onChange
}: {
  items: Kategorie[]
  value: number | null
  onChange: (id: number) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top?: number; bottom?: number; left: number; width: number; maxH: number
  } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const openDropdown = (): void => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP - DROPDOWN_EDGE
    const spaceAbove = rect.top - DROPDOWN_GAP - DROPDOWN_EDGE
    const goDown = spaceBelow >= 80 || spaceBelow >= spaceAbove
    if (goDown) {
      setCoords({ top: rect.bottom + DROPDOWN_GAP, left: rect.left, width: rect.width, maxH: Math.min(DROPDOWN_CAP, Math.max(spaceBelow, 0)) })
    } else {
      setCoords({ bottom: window.innerHeight - rect.top + DROPDOWN_GAP, left: rect.left, width: rect.width, maxH: Math.min(DROPDOWN_CAP, spaceAbove) })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      const t = e.target as Node
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onResize = (): void => setOpen(false)
    document.addEventListener('mousedown', handler)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const selected = items.find((k) => k.id === value)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={triggerRef} style={{ width: '100%' }}>
        <Button
          variant="outline"
          onPress={() => open ? setOpen(false) : openDropdown()}
          className="w-full justify-between"
          style={{ height: 34, fontSize: 13.5, fontWeight: 450, paddingInline: '12px 10px' }}
        >
          <span style={{ flex: 1, textAlign: 'left', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected?.nazev ?? '—'}
          </span>
          <ChevronRight
            width={14}
            height={14}
            style={{
              transform: open ? 'rotate(270deg)' : 'rotate(90deg)',
              transition: 'transform 0.15s ease',
              color: T3,
              flexShrink: 0,
              marginLeft: 6
            }}
          />
        </Button>
      </div>
      {open && coords && createPortal(
        <div
          ref={listRef}
          style={{
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
            background: 'var(--color-background)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
            maxHeight: coords.maxH,
            overflowY: 'auto'
          }}
        >
          {items.map((k) => (
            <Button
              key={k.id}
              variant="ghost"
              onPress={() => { onChange(k.id); setOpen(false) }}
              className="w-full justify-start rounded-none px-3"
              style={{ fontWeight: k.id === value ? 580 : 450, fontSize: 13.5 }}
            >
              {k.nazev}
            </Button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function Prazdno({ onNove }: { onNove: () => void }): React.JSX.Element {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: T3 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, marginBottom: 12 }}>Žádné měření. Založ ho pro vybranou jízdu.</div>
        <Btn variant="primary" icon={<Plus />} onClick={onNove}>Nové měření</Btn>
      </div>
    </div>
  )
}

function RostNahled({
  sloty,
  prirazeni
}: {
  sloty: RostSlot[] | null
  prirazeni: Set<number>
}): React.JSX.Element {
  const obsazeno = sloty?.filter((s) => s.jezdec != null).length ?? 0
  const hotovoPocet = sloty?.filter((s) => s.jezdec != null && prirazeni.has(s.jezdec.id)).length ?? 0

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        flexShrink: 0,
        borderLeft: '0.5px solid var(--color-border)',
        padding: '18px 18px 22px',
        overflowY: 'auto',
        background: 'var(--color-background)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '0 2px 8px'
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 620 }}>Rošt jízdy</span>
        {obsazeno > 0 && (
          <span
            className="tnum"
            style={{ fontSize: 12, color: T3 }}
            title="Přiřazených k naměřenému času / celkem na roštu"
          >
            {hotovoPocet} / {obsazeno}
          </span>
        )}
      </div>

      {!sloty || sloty.length === 0 ? (
        <div
          style={{
            padding: '24px 14px',
            fontSize: 12.5,
            color: T3,
            textAlign: 'center',
            lineHeight: 1.55,
            border: '0.5px solid var(--color-border)',
            borderRadius: 12,
            background: 'var(--color-background)'
          }}
        >
          Rošt ještě není nasazen.
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Rošt jízdy">
              <Table.Header className="sticky top-0 z-10">
                <Table.Column isRowHeader style={{ width: 30 }}>#</Table.Column>
                <Table.Column style={{ width: 46 }}>St.č.</Table.Column>
                <Table.Column>Jezdec</Table.Column>
              </Table.Header>
              <Table.Body>
                {sloty.map((slot, i) => {
                  const hotovo = slot.jezdec != null && prirazeni.has(slot.jezdec.id)
                  return (
                    <Table.Row
                      id={slot.pozice}
                      key={slot.pozice}
                      style={{
                        opacity: hotovo ? 0.42 : 1,
                        transition: 'opacity 0.15s',
                        background: i % 2 ? CARD_ALT : 'transparent'
                      }}
                    >
                      <Table.Cell style={{ ...rostTd, color: T3, fontVariantNumeric: 'tabular-nums' }}>
                        {slot.pozice}.
                      </Table.Cell>
                      <Table.Cell style={{ ...rostTd, color: 'var(--color-primary)', fontWeight: 660, fontVariantNumeric: 'tabular-nums', paddingLeft: 0 }}>
                        {slot.jezdec?.st_cislo ?? <span style={{ color: T4 }}>—</span>}
                      </Table.Cell>
                      <Table.Cell style={{ ...rostTd, minWidth: 0 }}>
                        {slot.jezdec ? (
                          <>
                            <div
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: 580,
                                color: 'var(--color-foreground)'
                              }}
                            >
                              {slot.jezdec.prijmeni}
                              {slot.jezdec.jmeno && (
                                <> <span style={{ color: T2, fontWeight: 440 }}>{slot.jezdec.jmeno}</span></>
                              )}
                            </div>
                            {(slot.jezdec.znacka || slot.jezdec.model) && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T3,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: 2
                                }}
                              >
                                {[slot.jezdec.znacka, slot.jezdec.model].filter(Boolean).join(' ')}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: T4 }}>prázdná pozice</span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </div>
  )
}

const rostTd: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12.5,
  color: 'var(--color-foreground)',
  verticalAlign: 'top'
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 580,
  color: T2,
  letterSpacing: '0.01em',
  marginBottom: 7,
  textTransform: 'uppercase' as const
}

function CasCell({ cas, onCommit }: { cas: number; onCommit: (ms: number) => void }): React.JSX.Element {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState('')
  if (!edit) {
    return (
      <Button
        variant="ghost"
        onPress={() => { setV(fmtTime(cas)); setEdit(true) }}
        title="Upravit čas"
        style={{ height: 32, minWidth: 'auto', padding: '0 6px', borderRadius: 5, fontSize: 17, fontWeight: 560, fontVariantNumeric: 'tabular-nums' }}
      >
        {fmtTime(cas)}
      </Button>
    )
  }
  const uloz = (): void => {
    const ms = parseTimeLoose(v)
    if (ms != null) onCommit(ms)
    setEdit(false)
  }
  return (
    <input
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={uloz}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setEdit(false)
      }}
      style={{
        width: 110,
        height: 32,
        padding: '0 6px',
        border: '1px solid var(--color-primary)',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 16,
        fontVariantNumeric: 'tabular-nums',
        background: 'var(--color-background)',
        color: 'var(--color-foreground)',
        outline: 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}

function CisloInput({
  row,
  onCommit,
  onFocusRow,
  onBlurRow,
  onEnter,
  setRef
}: {
  row: MereniRadek
  onCommit: (raw: string) => Promise<boolean>
  onFocusRow: () => void
  onBlurRow: () => void
  onEnter: () => void
  setRef: (el: HTMLInputElement | null) => void
}): React.JSX.Element {
  const [v, setV] = useState(row.st_cislo != null ? String(row.st_cislo) : '')
  const [focused, setFocused] = useState(false)
  const [warn, setWarn] = useState(false)
  useEffect(() => {
    setV(row.st_cislo != null ? String(row.st_cislo) : '')
  }, [row.st_cislo])
  const border = focused ? 'var(--color-primary)' : warn ? '#c93636' : 'var(--color-border)'
  return (
    <input
      ref={setRef}
      value={v}
      placeholder="—"
      inputMode="numeric"
      onChange={(e) => { setV(e.target.value); if (warn) setWarn(false) }}
      onFocus={() => { setFocused(true); onFocusRow() }}
      onBlur={async () => {
        setFocused(false)
        onBlurRow()
        const ok = await onCommit(v)
        setWarn(!ok)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onEnter() }
      }}
      style={{
        width: 86,
        height: 34,
        padding: '0 8px',
        border: `1px solid ${border}`,
        borderRadius: 6,
        font: 'inherit',
        fontSize: 15,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        background: 'var(--color-background)',
        color: warn ? '#c93636' : 'var(--color-foreground)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 26%, transparent)' : 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}
