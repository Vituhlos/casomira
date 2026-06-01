import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Kategorie, KoloTyp, MereniRadek, RostSlot } from '@shared/types'
import { useTheme } from './hooks/useTheme'
import { Btn } from './components/ui'
import { Icon } from './components/Icon'
import { Modal } from './components/Modal'
import { Card, thStyle } from './components/table'
import { fmtTime, parseTimeLoose } from './lib/time'

// Jeden „kanál" měření = rozměřená jízda. Běžící hodiny drží okno (epoch-based),
// kliky jsou v DB (tabulka mereni) → přepínání mezi kanály nic neztratí.
interface Kanal {
  jizdaId: number
  label: string
  klik: MereniRadek[]
  running: boolean
  startEpoch: number | null
  baseMs: number // naběhaný čas před aktuálním během (kvůli pauze / obnovení)
}

// Všechna kola napříč rulesety — používá se jako popisová mapa.
const KOLA_LABEL: Record<KoloTyp, string> = {
  Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', SF: 'SF', F: 'Finále', F_A: 'F–A', F_B: 'F–B'
}

// Která kola má smysl měřit u dané kategorie — podle ruleset (CLAUDE.md §3):
//   STANDARD (RAC/RX): Q1, Q2, Q3, SF, F (žádná A/B finále).
//   SOTOLINA:          Q1, Q2, Q3, F-B, F-A (žádné SF/F).
function kolaProRuleset(ruleset: 'STANDARD' | 'SOTOLINA' | undefined): KoloTyp[] {
  if (ruleset === 'SOTOLINA') return ['Q1', 'Q2', 'Q3', 'F_B', 'F_A']
  return ['Q1', 'Q2', 'Q3', 'SF', 'F']
}

function elapsed(k: Kanal, t: number): number {
  return k.running && k.startEpoch != null ? k.baseMs + (t - k.startEpoch) : k.baseMs
}

export function StopkyApp(): React.JSX.Element {
  const { theme, toggle } = useTheme()
  const [kategorie, setKategorie] = useState<Kategorie[]>([])
  const [zavodNazev, setZavodNazev] = useState('')
  const [kanaly, setKanaly] = useState<Kanal[]>([])
  const [aktivniId, setAktivniId] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [nove, setNove] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [potvrd, setPotvrd] = useState<{ typ: 'zapis' | 'zahodit'; jizdaId: number; label: string } | null>(null)
  const [aktivniRadek, setAktivniRadek] = useState<number | null>(null) // řádek s fokusem
  const [aktRost, setAktRost] = useState<RostSlot[] | null>(null)
  const cisloRefs = useRef<Map<number, HTMLInputElement | null>>(new Map())

  const akt = kanaly.find((k) => k.jizdaId === aktivniId) ?? null

  // Enter v poli čísla → skok na pole čísla dalšího řádku (po posledním skončí).
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

  // Načtení závodu, kategorií a existujících kanálů (přežijí restart).
  useEffect(() => {
    void (async () => {
      const z = await window.api.getAktivniZavod()
      if (z) {
        setZavodNazev(z.nazev)
        setKategorie(await window.api.listKategorie(z.id))
      }
      const ks = await window.api.mereniKanaly()
      const full: Kanal[] = []
      for (const k of ks) {
        const klik = await window.api.mereniList(k.jizdaId)
        const last = klik.length ? klik[klik.length - 1].cas_ms : 0
        full.push({ jizdaId: k.jizdaId, label: k.label, klik, running: false, startEpoch: null, baseMs: last })
      }
      setKanaly(full)
      setAktivniId(full.length ? full[0].jizdaId : null)
    })()
  }, [])

  // Běžící hodiny — překresluj jen když aktivní kanál běží.
  useEffect(() => {
    if (!akt?.running) return
    const t = setInterval(() => setNow(Date.now()), 53)
    return () => clearInterval(t)
  }, [akt?.running, aktivniId])

  // Načti rošt aktivní jízdy pro read-only náhled vedle tabulky časů.
  useEffect(() => {
    if (!akt) { setAktRost(null); return }
    let live = true
    void window.api.getRostJizda(akt.jizdaId).then((slots) => {
      if (live) setAktRost(slots)
    })
    return () => { live = false }
  }, [akt?.jizdaId])

  const updKanal = (jizdaId: number, patch: Partial<Kanal>): void =>
    setKanaly((prev) => prev.map((k) => (k.jizdaId === jizdaId ? { ...k, ...patch } : k)))

  const zaznamenej = useCallback(async (): Promise<void> => {
    const k = kanaly.find((x) => x.jizdaId === aktivniId)
    if (!k || !k.running || k.startEpoch == null) return
    const cas = k.baseMs + (Date.now() - k.startEpoch)
    const row = await window.api.mereniPridej(k.jizdaId, cas)
    setKanaly((prev) => prev.map((x) => (x.jizdaId === k.jizdaId ? { ...x, klik: [...x.klik, row] } : x)))
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
      updKanal(akt.jizdaId, { running: false, startEpoch: null, baseMs: base })
    } else {
      updKanal(akt.jizdaId, { running: true, startEpoch: Date.now() })
      setNow(Date.now())
    }
  }

  // Klávesy: mezerník = start/záznam, Backspace = vrátit poslední (ne v inputech).
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
        k.jizdaId !== row.jizda_id
          ? k
          : {
              ...k,
              klik: k.klik.map((c) =>
                c.id !== row.id
                  ? c
                  : {
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
        k.jizdaId !== row.jizda_id
          ? k
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
        background: 'var(--content-bg)',
        color: 'var(--text-1)'
      }}
    >
      {/* Horní lišta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          borderBottom: '0.5px solid var(--hairline)'
        }}
      >
        <Icon name="stopwatch" size={20} style={{ color: 'var(--accent)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 680 }}>Stopky</div>
          {zavodNazev && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{zavodNazev}</div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <Btn
          variant="bezel"
          icon={theme === 'dark' ? 'sun' : 'moon'}
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
          borderBottom: '0.5px solid var(--hairline)'
        }}
      >
        {kanaly.map((k) => {
          const on = k.jizdaId === aktivniId
          // Stejná geometrie jako `<Btn>` (height 28, padding 0 12, radius
          // var(--r-ctrl), font 13) — jen aktivní stav přebíjí pozadí/barvu
          // na modrou, aby byl jasně vidět vybraný kanál.
          return (
            <button
              key={k.jizdaId}
              onClick={() => {
                setAktivniId(k.jizdaId)
                setNove(false)
              }}
              className={on ? 'btn btn--primary' : 'btn btn--bezel'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 12px',
                borderRadius: 'var(--r-ctrl)',
                fontSize: 13,
                fontWeight: on ? 580 : 500,
                lineHeight: 1,
                whiteSpace: 'nowrap'
              }}
            >
              <span>{k.label}</span>
              <span
                className="tnum"
                style={{ opacity: on ? 0.85 : 0.6, fontWeight: on ? 580 : 500 }}
              >
                · {k.klik.length}
              </span>
              {k.running && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: on ? 'rgba(255,255,255,0.9)' : '#e0443e',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
              )}
            </button>
          )
        })}
        <Btn variant="bezel" icon="plus" onClick={() => setNove(true)}>
          Nové měření
        </Btn>
      </div>

      {/* Obsah */}
      {nove ? (
        <NoveMereni
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
              borderRight: '0.5px solid var(--hairline)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{akt.label}</div>
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
                  <button
                    onClick={() => notStarted ? pauza() : void zaznamenej()}
                    disabled={paused}
                    className="btn btn--primary"
                    style={{
                      height: 92,
                      borderRadius: 'var(--r-card)',
                      fontSize: 22,
                      fontWeight: 680,
                      letterSpacing: '0.02em',
                      opacity: paused ? 0.45 : 1
                    }}
                  >
                    {notStarted ? 'START' : 'ZAZNAMENAT'}
                  </button>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center' }}>
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
            <Btn variant="primary" icon="sort" onClick={() => void zkusZapsat()}>
              Zapsat do Výsledků
            </Btn>
            <Btn
              variant="plain"
              icon="trash"
              onClick={() => setPotvrd({ typ: 'zahodit', jizdaId: akt.jizdaId, label: akt.label })}
            >
              Zahodit měření
            </Btn>
          </div>

          {/* Střední sloupec: tabulka naměřených časů (hlavní). minWidth musí
              stačit pro: padding 18+18 + Card margin 22+22 + fixní sloupce
              52+134+116 + sloupec „Jezdec" na delší jména (~200 px).
              Min. šířka okna v windows.ts je na to dimenzovaná. */}
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
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  přiřazeno {akt.klik.filter((c) => c.jezdec_id != null).length} / {akt.klik.length}
                </span>
              </div>

              {akt.klik.length === 0 ? (
                <Card>
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5, lineHeight: 1.6 }}>
                    Zatím žádný záznam.
                    <br />
                    Zmáčkni <b>mezerník</b> (nebo velké tlačítko) při průjezdu cílem.
                  </div>
                </Card>
              ) : (
                <Card>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 52 }} />
                      <col style={{ width: 134 }} />
                      <col style={{ width: 116 }} />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Čas</th>
                        <th style={thStyle}>St. č.</th>
                        <th style={thStyle}>Jezdec</th>
                      </tr>
                    </thead>
                    <tbody>
                      {akt.klik.map((row, i) => {
                        const assigned = row.jezdec_id != null
                        const active = aktivniRadek === row.id
                        const bg = active
                          ? 'color-mix(in srgb, var(--accent) 14%, var(--card))'
                          : assigned
                            ? 'color-mix(in srgb, #34c759 13%, var(--card))'
                            : i % 2
                              ? 'var(--card-alt)'
                              : 'transparent'
                        return (
                          <tr
                            key={row.id}
                            style={{
                              background: bg,
                              boxShadow: active ? 'inset 3px 0 0 var(--accent)' : 'none'
                            }}
                          >
                            <td style={{ ...bunka, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
                              {i + 1}.
                            </td>
                            <td style={bunka}>
                              <CasCell cas={row.cas_ms} onCommit={(ms) => void opravCas(row, ms)} />
                            </td>
                            <td style={{ ...bunka, padding: '0 8px' }}>
                              <CisloInput
                                row={row}
                                setRef={(el) => cisloRefs.current.set(row.id, el)}
                                onCommit={(raw) => priradCislo(row, raw)}
                                onFocusRow={() => setAktivniRadek(row.id)}
                                onBlurRow={() => setAktivniRadek((c) => (c === row.id ? null : c))}
                                onEnter={() => focusDalsi(row.id)}
                              />
                            </td>
                            <td style={{ ...bunka, fontSize: 14.5, minWidth: 0 }}>
                              {assigned ? (
                                <span>
                                  <b style={{ fontWeight: 600 }}>{row.prijmeni}</b>{' '}
                                  <span style={{ color: 'var(--text-2)' }}>{row.jmeno}</span>
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-4)' }}>čeká na číslo</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </div>

          {/* Pravý sloupec: read-only náhled roštu jízdy */}
          <RostNahled sloty={aktRost} prirazeni={new Set(akt.klik.filter(c => c.jezdec_id != null).map(c => c.jezdec_id as number))} />
        </div>
      )}

      {potvrd && (
        <Modal
          title={potvrd.typ === 'zapis' ? 'Přepsat výsledky?' : 'Zahodit měření?'}
          width={440}
          onClose={() => setPotvrd(null)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setPotvrd(null)}>
                Zrušit
              </Btn>
              {potvrd.typ === 'zapis' ? (
                <Btn variant="primary" icon="sort" onClick={() => void zapisDoVysledku(potvrd.jizdaId)}>
                  Zapsat
                </Btn>
              ) : (
                <Btn variant="danger" icon="trash" onClick={() => void zahodKanal(potvrd.jizdaId)}>
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

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            background: 'var(--card)',
            border: '0.5px solid var(--hairline)',
            boxShadow: 'var(--shadow-win)',
            borderRadius: 'var(--r-ctrl)',
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

// ---- Založení nového měření ----
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
  // Lišta kol podle ruleset vybrané kategorie (Šotolina ukáže F-A/F-B, ne SF/F).
  const KOLA = kolaProRuleset(aktKat?.ruleset)

  // Při prvním otevření načteme návrh předvýběru (první neodměřená jízda).
  useEffect(() => {
    void window.api.mereniDalsiJizda().then((d) => {
      if (!d) return
      if (kategorie.some((k) => k.id === d.katId)) setKatId(d.katId)
      if ((['Q1', 'Q2', 'Q3', 'SF', 'F', 'F_A', 'F_B'] as KoloTyp[]).includes(d.koloTyp)) {
        setTyp(d.koloTyp)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pokud aktuální „typ" není v nabídce pro vybranou kategorii (např. uživatel
  // přepne kategorii ze STANDARD na SOTOLINA a měl zvoleno SF), spadni na Q1.
  useEffect(() => {
    if (!KOLA.includes(typ)) setTyp(KOLA[0] ?? 'Q1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [katId])

  // Při změně kategorie nebo kola načteme jízdy a jejich stav (hotovo / prázdné).
  useEffect(() => {
    if (katId == null) {
      setJizdy([])
      setHotovo(new Set())
      return
    }
    let live = true
    void Promise.all([
      window.api.getRosty(katId, typ),
      window.api.mereniJizdyHotovo(katId, typ)
    ]).then(([r, hots]) => {
      if (!live) return
      setJizdy(
        r.jizdy.map((jz) => ({
          id: jz.id,
          cislo: jz.cislo,
          filled: jz.sloty.filter((s) => s.jezdec).length
        }))
      )
      setHotovo(new Set(hots))
    })
    return () => {
      live = false
    }
  }, [katId, typ])

  const katNazev = kategorie.find((k) => k.id === katId)?.nazev ?? ''

  // První jízda (dle cislo) bez hotovo = „na řadě".
  const naRadeId = jizdy.find((jz) => !hotovo.has(jz.id))?.id ?? null

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        overflowY: 'auto',
        padding: 24,
        background: 'var(--content-bg)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--card)',
          borderRadius: 'var(--r-card)',
          boxShadow: 'var(--shadow-card)',
          border: '0.5px solid var(--hairline)',
          overflow: 'hidden'
        }}
      >
        {/* Hlavička karty */}
        <div
          style={{
            padding: '20px 24px 18px',
            borderBottom: '0.5px solid var(--hairline)'
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 680, marginBottom: 4 }}>
            Nové měření
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
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

          {/* Kolo — segmentový přepínač */}
          <div>
            <div style={labelStyle}>Kolo</div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                background: 'var(--seg-track)',
                borderRadius: 9,
                padding: 3
              }}
            >
              {KOLA.map((t) => {
                const on = typ === t
                return (
                  <button
                    key={t}
                    onClick={() => setTyp(t)}
                    className={on ? 'seg-tab seg-tab--active' : 'seg-tab'}
                    style={{
                      height: 30,
                      padding: '0 13px',
                      fontSize: 13,
                      fontWeight: on ? 590 : 460,
                      color: on ? 'var(--text-1)' : 'var(--text-2)',
                      borderRadius: 7
                    }}
                  >
                    {KOLA_LABEL[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Jízda — dlaždice se stavem */}
          <div>
            <div style={labelStyle}>Jízda</div>
            {jizdy.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-3)',
                  lineHeight: 1.55,
                  padding: '12px 14px',
                  background: 'var(--card-alt)',
                  borderRadius: 'var(--r-ctrl)',
                  border: '0.5px solid var(--hairline)'
                }}
              >
                Pro <b style={{ color: 'var(--text-2)', fontWeight: 580 }}>{katNazev} · {KOLA_LABEL[typ]}</b> zatím není žádná jízda.
                <br />Vytvoř rošt v hlavním okně.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {jizdy.map((jz) => {
                  const jeHotovo = hotovo.has(jz.id)
                  const jeNaRade = jz.id === naRadeId
                  return (
                    <button
                      key={jz.id}
                      onClick={() => onZalozit(jz.id, `${katNazev} · ${KOLA_LABEL[typ]} · ${jz.cislo}. jízda`)}
                      style={{
                        height: 34,
                        padding: '0 14px',
                        borderRadius: 'var(--r-ctrl)',
                        fontSize: 13.5,
                        fontWeight: jeNaRade ? 600 : 520,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: jeNaRade
                          ? '1.5px solid var(--accent)'
                          : '0.5px solid var(--hairline)',
                        background: jeNaRade
                          ? 'color-mix(in srgb, var(--accent) 10%, var(--card))'
                          : jeHotovo
                            ? 'color-mix(in srgb, #34c759 10%, var(--card))'
                            : 'var(--card)',
                        color: jeNaRade
                          ? 'var(--accent)'
                          : jeHotovo
                            ? 'var(--text-2)'
                            : 'var(--text-1)',
                        cursor: 'pointer'
                      }}
                    >
                      {jeHotovo && (
                        <span style={{ color: '#34c759', fontSize: 12, lineHeight: 1 }}>✓</span>
                      )}
                      {jeNaRade && !jeHotovo && (
                        <span style={{
                          width: 6, height: 6, borderRadius: 99,
                          background: 'var(--accent)', flexShrink: 0
                        }} />
                      )}
                      {jz.cislo}. jízda
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                        ({jz.filled})
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {/* Legenda */}
            {jizdy.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--text-3)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#34c759' }}>✓</span> hotovo
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 99,
                    background: 'var(--accent)', display: 'inline-block'
                  }} /> na řadě
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Patička karty */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '0.5px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
          }}
        >
          <Btn variant="plain" onClick={onZrusit}>
            Zrušit
          </Btn>
        </div>
      </div>
    </div>
  )
}

const DROPDOWN_CAP = 320   // absolutní maximum výšky nabídky
const DROPDOWN_GAP = 4     // mezera mezi tlačítkem a nabídkou
const DROPDOWN_EDGE = 8    // minimální rezerva od okraje okna

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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const openDropdown = (): void => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP - DROPDOWN_EDGE
    const spaceAbove = rect.top - DROPDOWN_GAP - DROPDOWN_EDGE
    // Otevři dolů pokud je tam alespoň 80 px nebo tam je víc místa než nahoře.
    const goDown = spaceBelow >= 80 || spaceBelow >= spaceAbove
    if (goDown) {
      setCoords({
        top: rect.bottom + DROPDOWN_GAP,
        left: rect.left,
        width: rect.width,
        maxH: Math.min(DROPDOWN_CAP, Math.max(spaceBelow, 0))
      })
    } else {
      setCoords({
        bottom: window.innerHeight - rect.top + DROPDOWN_GAP,
        left: rect.left,
        width: rect.width,
        maxH: Math.min(DROPDOWN_CAP, spaceAbove)
      })
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
      <button
        ref={triggerRef}
        className="btn btn--bezel"
        onClick={() => open ? setOpen(false) : openDropdown()}
        style={{
          width: '100%',
          height: 34,
          padding: '0 10px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 'var(--r-ctrl)',
          fontSize: 13.5,
          fontWeight: 450
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.nazev ?? '—'}
        </span>
        <Icon
          name="chevron"
          size={14}
          style={{
            transform: open ? 'rotate(270deg)' : 'rotate(90deg)',
            transition: 'transform 0.15s ease',
            color: 'var(--text-3)',
            flexShrink: 0,
            marginLeft: 6
          }}
        />
      </button>
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
            background: 'var(--card)',
            border: '0.5px solid var(--hairline)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
            maxHeight: coords.maxH,
            overflowY: 'auto',
            animation: 'macIn 0.12s ease both'
          }}
        >
          {items.map((k) => (
            <button
              key={k.id}
              className="menu-item"
              onClick={() => {
                onChange(k.id)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 12px',
                fontSize: 13.5,
                fontWeight: k.id === value ? 580 : 450
              }}
            >
              {k.nazev}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function Prazdno({ onNove }: { onNove: () => void }): React.JSX.Element {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, marginBottom: 12 }}>Žádné měření. Založ ho pro vybranou jízdu.</div>
        <Btn variant="primary" icon="plus" onClick={onNove}>
          Nové měření
        </Btn>
      </div>
    </div>
  )
}

// Read-only náhled roštu právě měřené jízdy — pravý sloupec ve stejném
// stylu jako prostřední tabulka časů: titulek nad kartou (Card) s tabulkou
// (hlavička + zebra řádky). Přiřazení čísel se NEdělá tady, jen vizuální
// reference; jakmile je jezdec přiřazený k nějakému času, jeho řádek tlumíme.
function RostNahled({
  sloty,
  prirazeni
}: {
  sloty: RostSlot[] | null
  prirazeni: Set<number>
}): React.JSX.Element {
  const obsazeno = sloty?.filter((s) => s.jezdec != null).length ?? 0
  const hotovoPocet =
    sloty?.filter((s) => s.jezdec != null && prirazeni.has(s.jezdec.id)).length ?? 0

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        flexShrink: 0,
        borderLeft: '0.5px solid var(--hairline)',
        padding: '18px 18px 22px',
        overflowY: 'auto',
        background: 'var(--content-bg)'
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
            style={{ fontSize: 12, color: 'var(--text-3)' }}
            title="Přiřazených k naměřenému času / celkem na roštu"
          >
            {hotovoPocet} / {obsazeno}
          </span>
        )}
      </div>

      <Card style={{ margin: 0 }}>
        {!sloty || sloty.length === 0 ? (
          <div
            style={{
              padding: '24px 14px',
              fontSize: 12.5,
              color: 'var(--text-3)',
              textAlign: 'center',
              lineHeight: 1.55
            }}
          >
            Rošt ještě není nasazen.
          </div>
        ) : (
          <table
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: 30 }} />
              <col style={{ width: 46 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>St.č.</th>
                <th style={thStyle}>Jezdec</th>
              </tr>
            </thead>
            <tbody>
              {sloty.map((slot, i) => {
                const hotovo = slot.jezdec != null && prirazeni.has(slot.jezdec.id)
                return (
                  <tr
                    key={slot.pozice}
                    className={i % 2 ? 'trow trow--zebra' : 'trow'}
                    style={{ opacity: hotovo ? 0.42 : 1, transition: 'opacity 0.15s' }}
                  >
                    <td
                      style={{
                        ...rostTd,
                        color: 'var(--text-3)',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {slot.pozice}.
                    </td>
                    <td
                      style={{
                        ...rostTd,
                        color: 'var(--accent)',
                        fontWeight: 660,
                        fontVariantNumeric: 'tabular-nums',
                        paddingLeft: 0
                      }}
                    >
                      {slot.jezdec?.st_cislo ?? (
                        <span style={{ color: 'var(--text-4)' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...rostTd, minWidth: 0 }}>
                      {slot.jezdec ? (
                        <>
                          <div
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 580,
                              color: 'var(--text-1)'
                            }}
                          >
                            {slot.jezdec.prijmeni}
                            {slot.jezdec.jmeno && (
                              <>
                                {' '}
                                <span style={{ color: 'var(--text-2)', fontWeight: 440 }}>
                                  {slot.jezdec.jmeno}
                                </span>
                              </>
                            )}
                          </div>
                          {(slot.jezdec.znacka || slot.jezdec.model) && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--text-3)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginTop: 2
                              }}
                            >
                              {[slot.jezdec.znacka, slot.jezdec.model]
                                .filter(Boolean)
                                .join(' ')}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-4)' }}>prázdná pozice</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// Buňka v náhledu roštu — kompaktnější než tdStyle z table.tsx, aby se vůz
// vešel na druhý řádek pod jméno a řádky nebyly přebujelé.
const rostTd: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '0.5px solid var(--divider)',
  fontSize: 12.5,
  color: 'var(--text-1)',
  verticalAlign: 'top'
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 580,
  color: 'var(--text-2)',
  letterSpacing: '0.01em',
  marginBottom: 7,
  textTransform: 'uppercase' as const
}


// Buňka tabulky časů — vyšší řádek a víc vzduchu pro čtení na dálku.
const bunka: React.CSSProperties = {
  padding: '0 14px',
  height: 48,
  borderBottom: '0.5px solid var(--divider)',
  verticalAlign: 'middle'
}

// Buňka času — klik ji změní na editaci (mm:ss.sss).
function CasCell({ cas, onCommit }: { cas: number; onCommit: (ms: number) => void }): React.JSX.Element {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState('')
  if (!edit) {
    return (
      <button
        className="btn btn--plain"
        onClick={() => {
          setV(fmtTime(cas))
          setEdit(true)
        }}
        title="Upravit čas"
        style={{
          height: 32,
          padding: '0 6px',
          borderRadius: 5,
          font: 'inherit',
          fontSize: 17,
          fontWeight: 560,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-1)'
        }}
      >
        {fmtTime(cas)}
      </button>
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
        border: '1px solid var(--accent)',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 16,
        fontVariantNumeric: 'tabular-nums',
        background: 'var(--window)',
        color: 'var(--text-1)',
        outline: 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}

// Vstup startovního čísla. Enter uloží (přes blur) a skočí na další řádek;
// po potvrzení zčervená, když číslo neexistuje/koliduje.
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
  const border = focused ? 'var(--accent)' : warn ? '#c93636' : 'var(--hairline)'
  return (
    <input
      ref={setRef}
      value={v}
      placeholder="—"
      inputMode="numeric"
      onChange={(e) => {
        setV(e.target.value)
        if (warn) setWarn(false)
      }}
      onFocus={() => {
        setFocused(true)
        onFocusRow()
      }}
      onBlur={async () => {
        setFocused(false)
        onBlurRow()
        const ok = await onCommit(v)
        setWarn(!ok)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter() // přesun fokusu na další řádek vyvolá blur → uložení
        }
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
        background: focused ? 'var(--window)' : 'var(--card)',
        color: warn ? '#c93636' : 'var(--text-1)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--accent) 26%, transparent)' : 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}
