import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type {
  JizdaKolaRadek,
  Kategorie,
  KoloTyp,
  MereniRadek,
  MereniTimerStav,
  RostSlot
} from '@shared/types'
import { useTheme } from './hooks/useTheme'
import { Button, Label, Modal, Switch, Table, Tabs, Toast, toast } from '@heroui/react'
import { Btn } from './components/ui'
import { ArrowUpArrowDown, ChevronRight, Moon, Plus, Stopwatch, Sun, TrashBin } from '@gravity-ui/icons'
import { fmtTime, parseTimeLoose } from './lib/time'
import { safeCall } from './lib/api'

const T2 = 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
const T3 = 'color-mix(in srgb, var(--color-foreground) 35%, transparent)'
const T4 = 'color-mix(in srgb, var(--color-foreground) 22%, transparent)'
const CARD_ALT = 'color-mix(in srgb, var(--color-foreground) 4%, transparent)'
// Jemně tónované pozadí „pod" floating panely (sidebar, měřící karta).
const PANEL_SHADOW =
  '0 1px 3px color-mix(in srgb, var(--color-foreground) 9%, transparent), 0 10px 28px color-mix(in srgb, var(--color-foreground) 6%, transparent)'
const labelMini: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: T2,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
  flexShrink: 0
}

interface Kanal {
  jizdaId: number
  label: string
  koloTyp: KoloTyp | null
  kategorieId: number | null
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
  const [nove, setNove] = useState(false)
  const [potvrd, setPotvrd] = useState<{ typ: 'zapis' | 'zahodit'; jizdaId: number; label: string } | null>(null)
  const [aktivniRadek, setAktivniRadek] = useState<number | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [aktRost, setAktRost] = useState<RostSlot[] | null>(null)
  const [vybraneKolo, setVybraneKolo] = useState<KoloTyp>('Q1')
  const [vybranaKategorie, setVybranaKategorie] = useState<number | null>(null)
  const [jizdyKola, setJizdyKola] = useState<JizdaKolaRadek[]>([])
  const [dalsiJizda, setDalsiJizda] = useState<{
    jizdaId: number
    label: string
    koloTyp: KoloTyp
    kategorieId: number
  } | null>(null)
  const cisloRefs = useRef<Map<number, HTMLInputElement | null>>(new Map())
  const aktKlikRef = useRef<MereniRadek[]>([])

  const akt = kanaly.find((k) => k.jizdaId === aktivniId) ?? null
  aktKlikRef.current = akt?.klik ?? []

  // Stabilní handlery pro memoizované buňky řádků (CisloInput, CasCell) — díky
  // nim se při záznamu času překreslí jen nový řádek, ne všech 8 existujících.
  const focusDalsi = useCallback((id: number): void => {
    const klik = aktKlikRef.current
    const idx = klik.findIndex((c) => c.id === id)
    const dalsi = klik[idx + 1]
    if (dalsi) cisloRefs.current.get(dalsi.id)?.focus()
    else cisloRefs.current.get(id)?.blur()
  }, [])
  const onFocusRow = useCallback((id: number): void => setAktivniRadek(id), [])
  const onBlurRow = useCallback(
    (id: number): void => setAktivniRadek((c) => (c === id ? null : c)),
    []
  )
  const setRefCb = useCallback((id: number, el: HTMLInputElement | null): void => {
    cisloRefs.current.set(id, el)
  }, [])

  const oznam = useCallback((t: string): void => { toast(t) }, [])

  // Smaže jeden konkrétní čas (křížek) a nabídne vrácení přes toast s akcí.
  // Vrácení vloží čas znovu (i s číslem) — řádek se reloaduje z DB.
  const smazCas = useCallback(async (row: MereniRadek): Promise<void> => {
    await window.api.mereniSmazRadek(row.id)
    setKanaly((prev) =>
      prev.map((x) =>
        x.jizdaId === row.jizda_id ? { ...x, klik: x.klik.filter((c) => c.id !== row.id) } : x
      )
    )
    const obnova = async (): Promise<void> => {
      const novy = await window.api.mereniPridej(row.jizda_id, row.cas_ms)
      if (row.st_cislo != null) await window.api.mereniSetCislo(novy.id, row.st_cislo)
      const klik = await window.api.mereniList(row.jizda_id)
      setKanaly((prev) => prev.map((x) => (x.jizdaId === row.jizda_id ? { ...x, klik } : x)))
    }
    toast(`Čas ${fmtTime(row.cas_ms)} smazán`, {
      description: 'Naměřený čas byl odebrán z tabulky.',
      timeout: 10000,
      actionProps: {
        children: 'Vrátit',
        onPress: () => { void obnova(); toast.clear() }
      }
    })
  }, [])

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
    let kats: Kategorie[] = []
    if (z) {
      zId = z.id
      setZavodId(z.id)
      setZavodNazev(z.nazev)
      kats = await window.api.listKategorie(z.id)
      setKategorie(kats)
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
        koloTyp: k.koloTyp,
        kategorieId: k.kategorieId,
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
    // Přepínač kol + sidebar ukážou kolo a kategorii, kde se právě měří.
    const aktivniKanal = full.find((k) => k.jizdaId === aktivni)
    const aktKolo = aktivniKanal?.koloTyp
    const kolo = aktKolo && MERENA_KOLA.includes(aktKolo) ? aktKolo : 'Q1'
    setVybraneKolo(kolo)
    setVybranaKategorie(aktivniKanal?.kategorieId ?? kats[0]?.id ?? null)
    // Spolehlivý init mřížky jízd (nezávislý na timingu useEffectu).
    if (zId != null) setJizdyKola(await window.api.mereniJizdyKola(kolo))
    setNove(false)
    setPotvrd(null)
    setAktivniRadek(null)
  }, [])

  useEffect(() => { void nactiZavodAkanaly() }, [nactiZavodAkanaly])
  useEffect(() => window.api.onZavodChanged(() => void nactiZavodAkanaly()), [nactiZavodAkanaly])

  const nactiJizdyKola = useCallback(
    async (kolo: KoloTyp): Promise<void> => {
      if (zavodId == null) {
        setJizdyKola([])
        return
      }
      setJizdyKola(await window.api.mereniJizdyKola(kolo))
    },
    [zavodId]
  )

  useEffect(() => { void nactiJizdyKola(vybraneKolo) }, [vybraneKolo, nactiJizdyKola])
  useEffect(
    () => window.api.onDataChanged(() => void nactiJizdyKola(vybraneKolo)),
    [nactiJizdyKola, vybraneKolo]
  )

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

  // Pozn.: živý čas běží uvnitř <ZivyCas> (vlastní interval), ať překreslování
  // 19×/s zasáhne jen text hodin, ne celé okno Stopek (sidebar, tabulka, rošt…).

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
    // Ochrana proti ztrátě dat: má-li poslední čas přiřazené startovní číslo,
    // nevracíme ho (to už není „omylem zaznamenaný" klik). Operátor musí nejdřív
    // odebrat číslo z políčka — teprve pak lze čas vrátit.
    const posledni = k.klik[k.klik.length - 1]
    if (posledni.jezdec_id != null) {
      oznam('Poslední čas má přiřazené číslo — nejdřív odeber číslo, pak ho lze vrátit.')
      return
    }
    await window.api.mereniVratPosledni(k.jizdaId)
    setKanaly((prev) =>
      prev.map((x) => (x.jizdaId === k.jizdaId ? { ...x, klik: x.klik.slice(0, -1) } : x))
    )
  }, [kanaly, aktivniId, oznam])

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
      void window.api.ulozMereniTimer(akt.jizdaId, {
        jizdaId: akt.jizdaId, running: true, baseMs: akt.baseMs, startEpochMs: startEpoch
      })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (nove || potvrd) return
      const el = e.target as HTMLElement | null
      const editovatelne = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
      if (e.code === 'Space' && !editovatelne) {
        e.preventDefault()
        // Zafokusované tlačítko by jinak na mezerník zareagovalo (klik) —
        // sebereme mu focus, ať mezerník vždy znamená „záznam / start".
        if (el?.tagName === 'BUTTON') el.blur()
        if (akt?.running) void zaznamenej()
        else pauza()
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !editovatelne) {
        // Vrátit poslední záznam přes Ctrl/Cmd+Z — bezpečnější než Backspace,
        // který koliduje s mazáním v políčku startovního čísla.
        e.preventDefault()
        void vratPosledni()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zaznamenej, vratPosledni, pauza, akt, nove, potvrd])

  const zalozMereni = (
    jizdaId: number,
    label: string,
    koloTyp: KoloTyp | null = null,
    kategorieId: number | null = null
  ): void => {
    setNove(false)
    setDalsiJizda(null)
    if (kanaly.some((k) => k.jizdaId === jizdaId)) {
      setAktivniId(jizdaId)
      void window.api.ulozMereniAktivniJizdu(jizdaId)
      return
    }
    setKanaly((prev) => [
      ...prev,
      { jizdaId, label, koloTyp, kategorieId, klik: [], running: false, startEpoch: null, baseMs: 0 }
    ])
    setAktivniId(jizdaId)
    void window.api.ulozMereniAktivniJizdu(jizdaId)
  }

  const priradCislo = useCallback(async (row: MereniRadek, raw: string): Promise<boolean> => {
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
              jmeno: res.ok ? res.jezdec?.jmeno ?? null : c.jmeno,
              znacka: res.ok ? res.jezdec?.znacka ?? null : c.znacka,
              model: res.ok ? res.jezdec?.model ?? null : c.model
            }
          )
        }
      )
    )
    return res.ok || trimmed === ''
  }, [oznam])

  const opravCas = useCallback(async (row: MereniRadek, ms: number): Promise<void> => {
    const novy = await window.api.mereniOpravCas(row.id, ms)
    setKanaly((prev) =>
      prev.map((k) =>
        k.jizdaId !== row.jizda_id ? k
          : { ...k, klik: k.klik.map((c) => (c.id === row.id ? { ...c, cas_ms: novy.cas_ms } : c)) }
      )
    )
  }, [])

  // Po zápisu nabídne první neodměřenou jízdu (využívá stávající mereniDalsiJizda).
  const nabidniDalsiJizdu = async (): Promise<void> => {
    const d = await window.api.mereniDalsiJizda()
    if (!d) {
      setDalsiJizda(null)
      return
    }
    const list = await window.api.mereniJizdyKola(d.koloTyp)
    const found = list.find((j) => j.jizdaId === d.jizdaId)
    setDalsiJizda(
      found
        ? {
            jizdaId: found.jizdaId,
            label: found.label,
            koloTyp: found.koloTyp,
            kategorieId: found.kategorieId
          }
        : null
    )
  }

  const zapisDoVysledku = async (jizdaId: number): Promise<void> => {
    await window.api.zapisMereniDoVysledku(jizdaId)
    setPotvrd(null)
    oznam('Zapsáno do Výsledků — pořadí a body se spočítaly.')
    await nabidniDalsiJizdu()
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

  // Stabilní handler výběru kategorie (pro memoizovaný sidebar).
  const vyberKategorii = useCallback((id: number): void => {
    setVybranaKategorie(id)
    setNove(false)
  }, [])

  // Odvozené hodnoty pro layout — memoizované, ať se identity nemění při
  // každém renderu a nelámaly memoizaci dětí (segmenty, rošt).
  // Klíčem k Set je seznam jízd, ne celé `kanaly` (to se mění i při záznamu
  // času, ale seznam kanálů/běžících jízd zůstává stejný).
  const kanalIds = kanaly.map((k) => k.jizdaId).join(',')
  const beziIds = kanaly.filter((k) => k.running).map((k) => k.jizdaId).join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mereneSet = useMemo(() => new Set(kanaly.map((k) => k.jizdaId)), [kanalIds])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beziSet = useMemo(() => new Set(kanaly.filter((k) => k.running).map((k) => k.jizdaId)), [beziIds])
  const jizdyVybrane = useMemo(
    () => jizdyKola.filter((j) => j.kategorieId === vybranaKategorie),
    [jizdyKola, vybranaKategorie]
  )
  // Přiřazení (pro zvýraznění v roštu) — klíčem je SIGNATURA přiřazených jezdců,
  // ne celé `akt.klik`. Tím se Set (a tedy memoizovaný RostNahled) nemění při
  // pouhém záznamu času (přibyl klik bez čísla → přiřazení se nezměnilo).
  const prirazeniSig = (akt?.klik ?? [])
    .filter((c) => c.jezdec_id != null)
    .map((c) => c.jezdec_id)
    .join(',')
  const prirazeniRost = useMemo(
    () =>
      new Set(
        (akt?.klik ?? []).filter((c) => c.jezdec_id != null).map((c) => c.jezdec_id as number)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prirazeniSig]
  )
  // Měřící panel patří k vybrané jízdě jen pokud sedí do vybrané kategorie i kola.
  const aktSedi =
    akt != null &&
    (akt.kategorieId == null || akt.kategorieId === vybranaKategorie) &&
    (akt.koloTyp == null || akt.koloTyp === vybraneKolo)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        // Průhledné — prosvítá Windows 11 Mica materiál okna (viz windows.ts).
        background: 'transparent',
        color: 'var(--color-foreground)'
      }}
    >
      {/* Floating sidebar: hlavička „Stopky" + kategorie + patička s přepínačem režimu */}
      <SidebarKategorie
        zavodNazev={zavodNazev}
        kategorie={kategorie}
        vybrana={vybranaKategorie}
        onVyber={vyberKategorii}
        theme={theme}
        onToggleTheme={toggle}
      />

      {/* Obsah */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Navigace: floating panel (neprůhledný, ať je čitelná i na Mica skle) */}
          <div style={{ padding: '12px 20px 6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              padding: '8px 14px',
              background: 'var(--color-background)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 14,
              boxShadow: PANEL_SHADOW
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={labelMini}>Kolo</span>
              <div style={{ minWidth: 0, overflowX: 'auto' }}>
                <Tabs
                  className="stopky-segment w-fit"
                  selectedKey={vybraneKolo}
                  onSelectionChange={(k) => { setVybraneKolo(k as KoloTyp); setNove(false) }}
                >
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Kolo">
                      {MERENA_KOLA.map((t) => (
                        <Tabs.Tab key={t} id={t}>
                          <span style={{ whiteSpace: 'nowrap' }}>{KOLA_LABEL[t]}</span>
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      ))}
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>
              </div>
            </div>

            {!nove && jizdyVybrane.length > 0 && (
              <div
                style={{
                  width: 1,
                  height: 26,
                  background: 'var(--color-border)',
                  flexShrink: 0
                }}
              />
            )}
            {!nove && (
              <JizdyVyber
                jizdy={jizdyVybrane}
                aktivniId={aktivniId}
                merene={mereneSet}
                bezi={beziSet}
                onVyber={(jz) => zalozMereni(jz.jizdaId, jz.label, jz.koloTyp, jz.kategorieId)}
              />
            )}

            <div style={{ flex: 1 }} />
            <Btn
              variant="tertiary"
              icon={<Plus />}
              onClick={() => setNove(true)}
              title="Změřit jinou jízdu (ručně)"
            >
              Jiná jízda
            </Btn>
          </div>
          </div>

          {/* Další jízda (po zápisu) — fáze B */}
          {dalsiJizda && !nove && (
            <div style={{ padding: '10px 20px 0' }}>
              <DalsiJizdaBaner
                label={dalsiJizda.label}
                onJet={() => {
                  const d = dalsiJizda
                  setVybraneKolo(d.koloTyp)
                  setVybranaKategorie(d.kategorieId)
                  zalozMereni(d.jizdaId, d.label, d.koloTyp, d.kategorieId)
                }}
                onZavri={() => setDalsiJizda(null)}
              />
            </div>
          )}

          {nove && (
            <NoveMereni
              key={zavodId ?? 'none'}
              kategorie={kategorie}
              onZalozit={zalozMereni}
              onZrusit={() => setNove(false)}
            />
          )}

          <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 20px 18px',
                overflow: 'hidden'
              }}
            >
              {/* Měřící oblast nebo výzva k výběru jízdy */}
              {!akt || !aktSedi ? (
                <VyberVyzva
                  maKategorie={vybranaKategorie != null}
                  maJizdy={jizdyVybrane.length > 0}
                  kolo={vybraneKolo}
                />
              ) : (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 16,
                    background: 'var(--color-background)',
                    boxShadow: PANEL_SHADOW,
                    overflow: 'hidden'
                  }}
                >
                  {/* Stopky — pruh nad tabulkou */}
                  <StopkyPruh
                    akt={akt}
                    onStartZaznam={() => {
                      if (!akt.running && akt.baseMs === 0) pauza()
                      else void zaznamenej()
                    }}
                    onPauza={pauza}
                    onZapsat={() => void zkusZapsat()}
                    onZahodit={() =>
                      setPotvrd({ typ: 'zahodit', jizdaId: akt.jizdaId, label: akt.label })
                    }
                  />

                  {/* Tabulka naměřených časů + náhled roštu */}
                  <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '14px 18px' }}>
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
                          přiřazeno {akt.klik.filter((c) => c.jezdec_id != null).length} /{' '}
                          {akt.klik.length}
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
                                <Table.Column style={{ width: 210 }}>Jezdec</Table.Column>
                                <Table.Column>Auto</Table.Column>
                                <Table.Column style={{ width: 50 }} aria-label="Smazat" />
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
                                        <CasCell row={row} onCommit={opravCas} />
                                      </Table.Cell>
                                      <Table.Cell style={{ padding: '0 8px', height: 48, verticalAlign: 'middle' }}>
                                        <CisloInput
                                          row={row}
                                          setRef={setRefCb}
                                          onCommit={priradCislo}
                                          onFocusRow={onFocusRow}
                                          onBlurRow={onBlurRow}
                                          onEnter={focusDalsi}
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
                                      <Table.Cell style={{ fontSize: 13.5, padding: '0 14px', height: 48, verticalAlign: 'middle', color: T2 }}>
                                        {assigned && (row.znacka || row.model) ? (
                                          [row.znacka, row.model].filter(Boolean).join(' ')
                                        ) : (
                                          <span style={{ color: T4 }}>—</span>
                                        )}
                                      </Table.Cell>
                                      <Table.Cell style={{ padding: '0 8px', height: 48, verticalAlign: 'middle', textAlign: 'right' }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          isIconOnly
                                          onPress={() => void smazCas(row)}
                                          aria-label="Smazat čas"
                                        >
                                          <TrashBin />
                                        </Button>
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

                    {/* Read-only náhled roštu */}
                    <RostNahled sloty={aktRost} prirazeni={prirazeniRost} />
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {potvrd && (
        <Modal.Backdrop isOpen onOpenChange={(o) => { if (!o) setPotvrd(null) }}>
          <Modal.Container placement="center">
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {potvrd.typ === 'zapis' ? 'Přepsat výsledky?' : 'Zahodit měření?'}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
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
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">Zrušit</Button>
                {potvrd.typ === 'zapis' ? (
                  <Btn variant="primary" icon={<ArrowUpArrowDown />} onClick={() => void zapisDoVysledku(potvrd.jizdaId)}>
                    Zapsat
                  </Btn>
                ) : (
                  <Btn variant="danger" icon={<TrashBin />} onClick={() => void zahodKanal(potvrd.jizdaId)}>
                    Zahodit
                  </Btn>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {showCloseConfirm && (
        <Modal.Backdrop isOpen onOpenChange={(o) => { if (!o) setShowCloseConfirm(false) }}>
          <Modal.Container placement="center">
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Stopky — nezapsané měření</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55 }}>
                  Máš rozměřené stopky, které nejsou zapsané do výsledků.
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: T2 }}>
                  Data měření zůstanou uložená v aplikaci. Po znovuotevření stopek je najdeš tam, kde
                  jsi skončil. Nezapomeň je zapsat do výsledků v hlavní aplikaci.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">Zůstat</Button>
                <Btn
                  variant="danger"
                  onClick={() => {
                    setShowCloseConfirm(false)
                    void window.api.stopkyZavritPotvrzeno()
                  }}
                >
                  Zavřít i tak
                </Btn>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      <Toast.Provider placement="bottom" />
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
  onZalozit: (jizdaId: number, label: string, koloTyp: KoloTyp, kategorieId: number) => void
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
    <Modal.Backdrop isOpen onOpenChange={(o) => { if (!o) onZrusit() }}>
      <Modal.Container placement="center">
        <Modal.Dialog className="sm:max-w-[480px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Jiná jízda</Modal.Heading>
            <p style={{ fontSize: 12.5, color: T2, lineHeight: 1.5, marginTop: 6 }}>
              Vyber jízdu, kterou budeš měřit. Naměřené časy padnou rovnou do ní.
            </p>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Kategorie */}
              <div>
                <div style={labelStyle}>Kategorie</div>
                <KategorieSelect items={kategorie} value={katId} onChange={setKatId} />
              </div>

              {/* Kolo */}
              <div>
                <div style={labelStyle}>Kolo</div>
                <Tabs
                  className="stopky-segment w-fit"
                  selectedKey={typ}
                  onSelectionChange={(key) => setTyp(key as KoloTyp)}
                >
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Kolo">
                      {KOLA.map((t) => (
                        <Tabs.Tab key={t} id={t}>
                          <span style={{ whiteSpace: 'nowrap' }}>{KOLA_LABEL[t]}</span>
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
                      borderRadius: 9,
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
                          onPress={() =>
                            katId != null &&
                            onZalozit(jz.id, `${katNazev} · ${KOLA_LABEL[typ]} · ${jz.cislo}. jízda`, typ, katId)
                          }
                          style={{ opacity: jeHotovo && !jeNaRade ? 0.55 : 1, height: 34 }}
                        >
                          {jeHotovo ? (
                            <span style={{ color: T3, fontSize: 12, lineHeight: 1 }}>✓</span>
                          ) : jeNaRade ? (
                            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--color-primary)', flexShrink: 0, display: 'inline-block' }} />
                          ) : null}
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" slot="close">Zrušit</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
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

// ---- Navigace: přepínač kol + jízdy po kategoriích ----

type StavJizdy = 'aktivni' | 'odjeto' | 'merene' | 'ceka' | 'bezRostu'

function stavJizdy(jz: JizdaKolaRadek, aktivniId: number | null, merene: Set<number>): StavJizdy {
  if (jz.jizdaId === aktivniId) return 'aktivni'
  if (jz.maVysledky) return 'odjeto'
  if (merene.has(jz.jizdaId) || jz.pocetKliku > 0) return 'merene'
  if (jz.obsazenoRostem === 0) return 'bezRostu'
  return 'ceka'
}

// Floating sidebar: hlavička „Stopky" + seznam kategorií + patička s režimem.
const SidebarKategorie = memo(function SidebarKategorie({
  zavodNazev,
  kategorie,
  vybrana,
  onVyber,
  theme,
  onToggleTheme
}: {
  zavodNazev: string
  kategorie: Kategorie[]
  vybrana: number | null
  onVyber: (id: number) => void
  theme: string
  onToggleTheme: () => void
}): React.JSX.Element {
  const dark = theme === 'dark'
  return (
    <div
      style={{
        width: 244,
        minWidth: 244,
        flexShrink: 0,
        margin: 12,
        marginRight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 16,
        boxShadow: PANEL_SHADOW,
        overflow: 'hidden'
      }}
    >
      {/* Hlavička */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '15px 16px',
          borderBottom: '0.5px solid var(--color-border)'
        }}
      >
        <Stopwatch width={20} height={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 680, lineHeight: 1.2 }}>Stopky</div>
          {zavodNazev && (
            <div
              style={{
                fontSize: 11,
                color: T3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {zavodNazev}
            </div>
          )}
        </div>
      </div>

      {/* Kategorie */}
      <div style={{ ...labelMini, padding: '13px 16px 8px' }}>Kategorie</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 10px' }}>
        {kategorie.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T3, padding: '8px 10px', lineHeight: 1.5 }}>
            Žádné kategorie. Otevři závod v hlavním okně.
          </div>
        ) : (
          <Tabs
            orientation="vertical"
            className="stopky-sidebar-tabs w-full"
            selectedKey={vybrana != null ? String(vybrana) : ''}
            onSelectionChange={(k) => onVyber(Number(k))}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Kategorie">
                {kategorie.map((k) => (
                  <Tabs.Tab key={k.id} id={String(k.id)}>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {k.nazev}
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        )}
      </div>

      {/* Patička: přepínač světlý / tmavý režim */}
      <div
        style={{
          padding: '11px 14px',
          borderTop: '0.5px solid var(--color-border)'
        }}
      >
        <Switch isSelected={dark} onChange={onToggleTheme} size="md">
          <Switch.Control>
            <Switch.Thumb>
              <Switch.Icon>
                {dark ? (
                  <Moon className="size-3 text-inherit" />
                ) : (
                  <Sun className="size-3 text-inherit" />
                )}
              </Switch.Icon>
            </Switch.Thumb>
          </Switch.Control>
          <Switch.Content>
            <Label className="text-sm" style={{ color: T2 }}>
              {dark ? 'Tmavý režim' : 'Světlý režim'}
            </Label>
          </Switch.Content>
        </Switch>
      </div>
    </div>
  )
})

// Breadcrumb kategorie·kolo + tlačítka jízd vybrané kategorie a kola.
function JizdyVyber({
  jizdy,
  aktivniId,
  merene,
  bezi,
  onVyber
}: {
  jizdy: JizdaKolaRadek[]
  aktivniId: number | null
  merene: Set<number>
  bezi: Set<number>
  onVyber: (jz: JizdaKolaRadek) => void
}): React.JSX.Element | null {
  const vybrano =
    aktivniId != null && jizdy.some((j) => j.jizdaId === aktivniId) ? String(aktivniId) : ''
  if (jizdy.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <span style={labelMini}>Jízda</span>
      <div style={{ minWidth: 0, overflowX: 'auto' }}>
        <Tabs
          className="stopky-segment w-fit"
          selectedKey={vybrano}
          onSelectionChange={(k) => {
            const jz = jizdy.find((j) => String(j.jizdaId) === String(k))
            if (jz) onVyber(jz)
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Jízda">
              {jizdy.map((jz) => {
                const stav = stavJizdy(jz, aktivniId, merene)
                return (
                  <Tabs.Tab key={jz.jizdaId} id={String(jz.jizdaId)}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {stav === 'odjeto' && (
                        <span style={{ color: 'var(--color-medal-gold, #2e9e5b)', fontSize: 12, lineHeight: 1 }}>
                          ✓
                        </span>
                      )}
                      {bezi.has(jz.jizdaId) && (
                        <span
                          className="stopky-puls"
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 99,
                            background: 'var(--color-primary)',
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                      )}
                      {jz.jizdaCislo}. jízda
                      {jz.pocetKliku > 0 && (
                        <span className="tnum" style={{ opacity: 0.55, fontSize: 12 }}>
                          · {jz.pocetKliku}
                        </span>
                      )}
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                )
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
    </div>
  )
}

// Živý čas — vlastní interval. Tím se 19×/s překresluje jen text hodin,
// ne celé okno Stopek (sidebar, tabulka, rošt, segmenty). Klíč k plynulosti.
function ZivyCas({ akt }: { akt: Kanal }): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!akt.running) return
    const t = setInterval(() => setNow(Date.now()), 53)
    return () => clearInterval(t)
  }, [akt.running])
  return <>{fmtTime(elapsed(akt, now))}</>
}

// Stopky: vodorovný pruh nad tabulkou (hodiny + START/ZAZNAMENAT + ovládání).
function StopkyPruh({
  akt,
  onStartZaznam,
  onPauza,
  onZapsat,
  onZahodit
}: {
  akt: Kanal
  onStartZaznam: () => void
  onPauza: () => void
  onZapsat: () => void
  onZahodit: () => void
}): React.JSX.Element {
  const notStarted = !akt.running && akt.baseMs === 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '14px 18px',
        borderBottom: '0.5px solid var(--color-border)',
        background: 'var(--color-background)',
        flexWrap: 'wrap'
      }}
    >
      {/* Label + hodiny + nápověda */}
      <div style={{ minWidth: 200 }}>
        <div style={{ fontSize: 12, color: T2, marginBottom: 1 }}>{akt.label}</div>
        <div
          className="tnum"
          style={{
            fontSize: 54,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <ZivyCas akt={akt} />
        </div>
        <div style={{ fontSize: 11, color: T3, marginTop: 3 }}>
          {notStarted
            ? 'mezerník = start'
            : akt.running
              ? 'mezerník = záznam · Ctrl+Z vrátit'
              : 'mezerník = pokračovat'}
        </div>
      </div>

      {/* Velké tlačítko */}
      <Button
        variant="primary"
        onPress={onStartZaznam}
        className="font-[680] tracking-[0.02em]"
        style={{ height: 66, minWidth: 196, fontSize: 20 }}
      >
        {notStarted ? 'START' : 'ZAZNAMENAT'}
      </Button>

      <Btn variant="tertiary" onClick={onPauza} style={{ height: 44 }}>
        {akt.running ? 'Pauza' : akt.baseMs === 0 ? 'Start' : 'Pokračovat'}
      </Btn>

      <div style={{ flex: 1 }} />

      <Btn variant="primary" icon={<ArrowUpArrowDown />} onClick={onZapsat}>
        Zapsat do Výsledků
      </Btn>
      <Btn variant="danger-soft" icon={<TrashBin />} onClick={onZahodit}>
        Zahodit
      </Btn>
    </div>
  )
}

// Výzva uprostřed měřící plochy, když není vybraná žádná jízda k měření.
function VyberVyzva({
  maKategorie,
  maJizdy,
  kolo
}: {
  maKategorie: boolean
  maJizdy: boolean
  kolo: KoloTyp
}): React.JSX.Element {
  const text = !maKategorie
    ? 'Vyber kategorii vlevo.'
    : maJizdy
      ? 'Vyber jízdu nahoře a začni měřit.'
      : kolo === 'SF' || kolo === 'F'
        ? `${KOLA_LABEL[kolo]} se nasazuje až po klasifikaci — udělej to v hlavním okně. Pak se jízdy objeví tady.`
        : `Pro ${KOLA_LABEL[kolo]} zatím nejsou žádné jízdy. Sestav rošt v hlavním okně, pak se objeví tady.`
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        placeItems: 'center',
        border: '0.5px dashed var(--color-border)',
        borderRadius: 16,
        background: 'var(--color-background)'
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 340,
          lineHeight: 1.55,
          fontSize: 13.5,
          color: T3,
          padding: 24
        }}
      >
        {text}
      </div>
    </div>
  )
}

function DalsiJizdaBaner({
  label,
  onJet,
  onZavri
}: {
  label: string
  onJet: () => void
  onZavri: () => void
}): React.JSX.Element {
  return (
    <div
      className="stopky-baner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-background))',
        borderBottom: '0.5px solid var(--color-border)'
      }}
    >
      <span style={{ fontSize: 13, color: T2 }}>Hotovo. Další na řadě:</span>
      <b style={{ fontSize: 13.5, fontWeight: 620 }}>{label}</b>
      <div style={{ flex: 1 }} />
      <Btn variant="primary" icon={<ChevronRight />} onClick={onJet}>
        Jet
      </Btn>
      <Btn variant="plain" onClick={onZavri}>
        Zavřít
      </Btn>
    </div>
  )
}

const RostNahled = memo(function RostNahled({
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
        width: 360,
        minWidth: 360,
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
})

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

const CasCell = memo(function CasCell({
  row,
  onCommit
}: {
  row: MereniRadek
  onCommit: (row: MereniRadek, ms: number) => void
}): React.JSX.Element {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState('')
  const cas = row.cas_ms
  if (!edit) {
    return (
      <Button
        variant="ghost"
        onPress={() => { setV(fmtTime(cas)); setEdit(true) }}
        aria-label="Upravit čas"
        style={{ height: 32, minWidth: 'auto', padding: '0 6px', borderRadius: 5, fontSize: 17, fontWeight: 560, fontVariantNumeric: 'tabular-nums' }}
      >
        {fmtTime(cas)}
      </Button>
    )
  }
  const uloz = (): void => {
    const ms = parseTimeLoose(v)
    if (ms != null) onCommit(row, ms)
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
})

const CisloInput = memo(function CisloInput({
  row,
  onCommit,
  onFocusRow,
  onBlurRow,
  onEnter,
  setRef
}: {
  row: MereniRadek
  onCommit: (row: MereniRadek, raw: string) => Promise<boolean>
  onFocusRow: (id: number) => void
  onBlurRow: (id: number) => void
  onEnter: (id: number) => void
  setRef: (id: number, el: HTMLInputElement | null) => void
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
      ref={(el) => setRef(row.id, el)}
      value={v}
      placeholder="—"
      inputMode="numeric"
      onChange={(e) => { setV(e.target.value); if (warn) setWarn(false) }}
      onFocus={() => { setFocused(true); onFocusRow(row.id) }}
      onBlur={async () => {
        setFocused(false)
        onBlurRow(row.id)
        const ok = await onCommit(row, v)
        setWarn(!ok)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onEnter(row.id) }
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
})
