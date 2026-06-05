import { useEffect, useRef, useState } from 'react'
import type { Kategorie, RaceType, SportityEventView, SportityNodeView, Zavod } from '@shared/types'
import { Modal } from '../components/Modal'
import { Btn, DevBadge } from '../components/ui'
import { VYCHOZI_KATEGORIE } from '../data/raceDefaults'
import { safeCall } from '../lib/api'

function dnesISO(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function chipsProTyp(typ: RaceType): string[] {
  if (typ === 'RX') return VYCHOZI_KATEGORIE.RX
  return [...VYCHOZI_KATEGORIE.RAC, 'Šotolina']
}

function sjednotDostupne(typ: RaceType, nazvyZKategorie: string[]): string[] {
  const chips = chipsProTyp(typ)
  const extra = nazvyZKategorie.filter((n) => !chips.includes(n))
  return [...chips, ...extra]
}

interface RaceDialogProps {
  /** edit: údaje závodu + kategorie; new: i volba typu. */
  mode: 'new' | 'edit'
  zavod?: Zavod
  onCancel: () => void
  onSaved: (z: Zavod) => void
}

export function RaceDialog({ mode, zavod, onCancel, onSaved }: RaceDialogProps): React.JSX.Element {
  const [nazev, setNazev] = useState(zavod?.nazev ?? '')
  const [datum, setDatum] = useState(zavod?.datum ?? dnesISO())
  const [misto, setMisto] = useState(zavod?.misto ?? '')
  const [typ, setTyp] = useState<RaceType>(zavod?.typ ?? 'RAC')
  const [dostupne, setDostupne] = useState<string[]>(() => chipsProTyp(zavod?.typ ?? 'RAC'))
  const [vybrane, setVybrane] = useState<Set<string>>(
    () => new Set(VYCHOZI_KATEGORIE[zavod?.typ ?? 'RAC'])
  )
  const [existujici, setExistujici] = useState<Kategorie[]>([])
  const [vlastni, setVlastni] = useState('')
  const [uklada, setUklada] = useState(false)
  const [nacita, setNacita] = useState(mode === 'edit')
  const [confirmOdebrani, setConfirmOdebrani] = useState<string | null>(null)

  // Sportity — zobrazí se jen pokud je API klíč nastaven a spojení funguje
  const [sportityDostupne, setSportityDostupne] = useState(false)
  const sportityChecked = useRef(false)
  const [sportityHeslo, setSportityHeslo] = useState('')
  const [sportityEvents, setSportityEvents] = useState<SportityEventView[]>([])
  const [sportityLoadingEvents, setSportityLoadingEvents] = useState(false)
  const [sportityEventId, setSportityEventId] = useState('')
  const [sportityFolders, setSportityFolders] = useState<SportityNodeView[]>([])
  const [sportityLoadingFolders, setSportityLoadingFolders] = useState(false)
  const [sportityFolderId, setSportityFolderId] = useState('')
  const [sportityFolderName, setSportityFolderName] = useState('')

  useEffect(() => {
    if (mode !== 'new' || sportityChecked.current) return
    sportityChecked.current = true
    safeCall(
      window.api.getSportitySettings().then(async (s) => {
        if (!s.apiKeySet) return
        const res = await window.api.testSportityConnection()
        if (res.ok) setSportityDostupne(true)
      })
    )
  }, [mode])

  useEffect(() => {
    if (mode !== 'edit' || !zavod) return
    let live = true
    setNacita(true)
    safeCall(
      window.api.listKategorie(zavod.id).then((cats) => {
        if (!live) return
        setExistujici(cats)
        setDostupne(sjednotDostupne(zavod.typ, cats.map((c) => c.nazev)))
        setVybrane(new Set(cats.map((c) => c.nazev)))
        setNacita(false)
      })
    )
    return () => {
      live = false
    }
  }, [mode, zavod?.id, zavod?.typ])

  const zmenTyp = (t: RaceType): void => {
    setTyp(t)
    setDostupne(chipsProTyp(t))
    setVybrane(new Set(VYCHOZI_KATEGORIE[t]))
    setVlastni('')
  }

  const toggle = (n: string): void =>
    setVybrane((prev) => {
      const s = new Set(prev)
      if (s.has(n)) s.delete(n)
      else s.add(n)
      return s
    })

  const pridejVlastni = (): void => {
    const n = vlastni.trim()
    if (!n) return
    setDostupne((prev) => (prev.includes(n) ? prev : [...prev, n]))
    setVybrane((prev) => new Set(prev).add(n))
    setVlastni('')
  }

  const nactiSportityEvents = async (): Promise<void> => {
    setSportityLoadingEvents(true)
    setSportityEvents([])
    setSportityEventId('')
    setSportityFolders([])
    setSportityFolderId('')
    try {
      const evs = await window.api.sportityListEvents()
      setSportityEvents(evs)
    } finally {
      setSportityLoadingEvents(false)
    }
  }

  const nactiSportityFolders = async (eventId: string): Promise<void> => {
    if (!sportityHeslo.trim()) return
    setSportityLoadingFolders(true)
    setSportityFolders([])
    setSportityFolderId('')
    try {
      const docs = await window.api.sportityListDocuments(sportityHeslo.trim(), eventId || null)
      setSportityFolders(docs.filter((d) => d.type === 'folder'))
    } finally {
      setSportityLoadingFolders(false)
    }
  }

  const vybraneNazvy = dostupne.filter((n) => vybrane.has(n))
  const muzeUlozit =
    nazev.trim() !== '' && datum !== '' && vybraneNazvy.length > 0 && !nacita

  const ulozSkutecne = async (): Promise<void> => {
    setConfirmOdebrani(null)
    setUklada(true)
    try {
      const kategorie = vybraneNazvy.map((n) => ({ nazev: n, ruleset: 'STANDARD' as const }))
      if (mode === 'edit' && zavod) {
        const z = await window.api.updateZavod({ id: zavod.id, nazev, datum, misto, kategorie })
        onSaved(z)
      } else {
        const z = await window.api.createZavod({ nazev, datum, misto, typ, kategorie })
        if (sportityDostupne && sportityHeslo.trim() && sportityFolderId) {
          await window.api.saveSportityZavodMap(
            z.id,
            sportityHeslo.trim(),
            sportityEventId || null,
            sportityFolderId,
            sportityFolderName
          )
        }
        onSaved(z)
      }
    } finally {
      setUklada(false)
    }
  }

  const uloz = (): void => {
    if (!muzeUlozit || uklada) return
    if (mode === 'edit' && zavod) {
      const jeVybrana = (katNazev: string): boolean =>
        vybraneNazvy.some((v) => v.toLocaleLowerCase('cs') === katNazev.toLocaleLowerCase('cs'))
      const sDaty = existujici
        .filter((k) => !jeVybrana(k.nazev))
        .filter((k) => k.pocet > 0)
      if (sDaty.length > 0) {
        setConfirmOdebrani(sDaty.map((k) => `${k.nazev} (${k.pocet} jezdců)`).join(', '))
        return
      }
    }
    void ulozSkutecne()
  }

  const kategorieSekce = (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0 8px' }}>
        <span style={{ fontSize: 11.5, fontWeight: 560, color: 'var(--text-2)' }}>
          Kategorie{' '}
          <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({vybraneNazvy.length} vybráno)</span>
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>klikni pro výběr</span>
      </div>

      {nacita ? (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-3)' }}>Načítám kategorie…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {dostupne.map((n) => {
            const on = vybrane.has(n)
            const kat = existujici.find((k) => k.nazev === n)
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                className={on ? 'chip chip--on' : 'chip'}
                style={{ height: 30, padding: '0 13px', fontSize: 13, fontWeight: on ? 560 : 450 }}
                title={kat && kat.pocet > 0 ? `${kat.pocet} jezdců — odebráním smažeš kategorii` : undefined}
              >
                {n}
                {kat && kat.pocet > 0 ? (
                  <span style={{ marginLeft: 6, opacity: 0.75, fontSize: 11 }}>{kat.pocet}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={vlastni}
          onChange={(e) => setVlastni(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              pridejVlastni()
            }
          }}
          placeholder="přidat vlastní kategorii…"
          style={{ ...inputStyle, flex: 1 }}
          disabled={nacita}
        />
        <Btn variant="bezel" icon="plus" onClick={pridejVlastni} disabled={vlastni.trim() === '' || nacita}>
          Přidat
        </Btn>
      </div>
    </>
  )

  return (
    <>
    <Modal
      title={mode === 'edit' ? 'Upravit závod' : 'Nový závod'}
      width={560}
      onClose={onCancel}
      footer={
        <>
          <Btn variant="plain" onClick={onCancel}>
            Zrušit
          </Btn>
          <Btn
            variant="primary"
            icon="flag"
            onClick={uloz}
            disabled={!muzeUlozit || uklada}
          >
            {mode === 'edit' ? 'Uložit' : 'Založit závod'}
          </Btn>
        </>
      }
    >
      <Pole label="Název závodu">
        <input
          value={nazev}
          onChange={(e) => setNazev(e.target.value)}
          placeholder="např. MČR Autocross — Přerov"
          style={inputStyle}
          autoFocus
        />
      </Pole>

      <div style={{ display: 'flex', gap: 12 }}>
        <Pole label="Datum" style={{ flex: 1 }}>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} />
        </Pole>
        <Pole label="Místo (nepovinné)" style={{ flex: 1 }}>
          <input
            value={misto}
            onChange={(e) => setMisto(e.target.value)}
            placeholder="např. Přerov"
            style={inputStyle}
          />
        </Pole>
      </div>

      {mode === 'new' ? (
        <>
          <Pole label="Typ závodu">
            <span
              style={{
                display: 'inline-flex',
                gap: 2,
                background: 'var(--seg-track)',
                borderRadius: 8,
                padding: 2
              }}
            >
              {(['RAC', 'RX'] as RaceType[]).map((t) => {
                const on = typ === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => zmenTyp(t)}
                    className={on ? 'seg-tab seg-tab--active' : 'seg-tab'}
                    style={{
                      height: 28,
                      padding: '0 16px',
                      fontSize: 12.5,
                      fontWeight: on ? 590 : 450,
                      color: on ? 'var(--text-1)' : 'var(--text-2)',
                      borderRadius: 6
                    }}
                  >
                    {t === 'RAC' ? (
                      'RAC Race'
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        RX Cup
                        <DevBadge />
                      </span>
                    )}
                  </button>
                )
              })}
            </span>
          </Pole>
          {kategorieSekce}
          {sportityDostupne && (
            <SportitySekce
              heslo={sportityHeslo}
              onHeslo={setSportityHeslo}
              events={sportityEvents}
              loadingEvents={sportityLoadingEvents}
              onNactiEvents={() => void nactiSportityEvents()}
              eventId={sportityEventId}
              onEventId={(id) => {
                setSportityEventId(id)
                setSportityFolders([])
                setSportityFolderId('')
                if (id !== undefined) void nactiSportityFolders(id)
              }}
              folders={sportityFolders}
              loadingFolders={sportityLoadingFolders}
              folderId={sportityFolderId}
              onFolderId={(id, name) => { setSportityFolderId(id); setSportityFolderName(name) }}
            />
          )}
          {typ === 'RX' && (
            <p
              style={{
                margin: '0 0 10px',
                padding: '8px 10px',
                fontSize: 11.5,
                color: 'var(--text-2)',
                lineHeight: 1.5,
                background: 'rgba(255, 159, 10, 0.08)',
                borderRadius: 'var(--r-ctrl)',
                border: '0.5px solid rgba(255, 159, 10, 0.22)'
              }}
            >
              <b>RX Cup je ve vývoji</b> — bodování do seriálu zatím není finální. Závod můžeš normálně
              založit a zkoušet.
            </p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            Nabídka je dle typu závodu — klikni na kategorie, které chceš.{' '}
            {typ === 'RAC' ? null : (
              <>
                <b>RX Cup</b> nemá kategorii Šotolina.{' '}
              </>
            )}
            Vlastní kategorii přidáš polem výše.
          </p>
        </>
      ) : (
        <>
          <Pole label="Typ závodu">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                padding: '0 12px',
                borderRadius: 'var(--r-ctrl)',
                fontSize: 12.5,
                fontWeight: 560,
                background: 'var(--seg-track)',
                color: 'var(--text-2)'
              }}
            >
              {typ === 'RAC' ? 'RAC Race' : 'RX Cup'}
              {typ === 'RX' && (
                <span style={{ marginLeft: 8 }}>
                  <DevBadge />
                </span>
              )}
            </span>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.45 }}>
              Typ závodu nelze po založení změnit. Kategorie můžeš přidat nebo odebrat (odebrání smaže
              i data kategorie).
            </p>
          </Pole>
          {kategorieSekce}
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {typ === 'RAC' ? (
              <>
                U RAC můžeš přidat <b>Šotolinu</b> nebo vlastní název. Číslo u chipu = počet jezdců v
                kategorii.
              </>
            ) : (
              <>U RX Cup nelze přidat kategorii Šotolina (jiné pravidlo než RAC).</>
            )}
          </p>
        </>
      )}
    </Modal>

    {confirmOdebrani && (
      <Modal
        title="Odebrat kategorie s daty?"
        width={460}
        onClose={() => setConfirmOdebrani(null)}
        footer={
          <>
            <Btn variant="plain" onClick={() => setConfirmOdebrani(null)}>
              Zrušit
            </Btn>
            <Btn variant="danger" onClick={() => void ulozSkutecne()}>
              Odebrat a uložit
            </Btn>
          </>
        }
      >
        <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55 }}>
          Odebereš kategorie: <b>{confirmOdebrani}</b>.
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)' }}>
          Smažou se včetně startovek, roštů, výsledků a PDF dat v databázi. Tuto akci nelze
          vrátit.
        </p>
      </Modal>
    )}
  </>
  )
}

function Pole({
  label,
  children,
  style
}: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}): React.JSX.Element {
  return (
    <div style={{ margin: '0 0 12px', ...style }}>
      <div style={{ fontSize: 11.5, fontWeight: 560, color: 'var(--text-2)', margin: '0 0 4px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function SportitySekce({
  heslo, onHeslo,
  events, loadingEvents, onNactiEvents, eventId, onEventId,
  folders, loadingFolders, folderId, onFolderId
}: {
  heslo: string
  onHeslo: (v: string) => void
  events: SportityEventView[]
  loadingEvents: boolean
  onNactiEvents: () => void
  eventId: string
  onEventId: (id: string) => void
  folders: SportityNodeView[]
  loadingFolders: boolean
  folderId: string
  onFolderId: (id: string, name: string) => void
}): React.JSX.Element {
  return (
    <div
      style={{
        margin: '4px 0 12px',
        padding: '12px',
        border: '0.5px solid var(--hairline)',
        borderRadius: 'var(--r-ctrl)',
        background: 'var(--card-alt)'
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 560, color: 'var(--text-2)', marginBottom: 10 }}>
        Sportity
      </div>

      {/* Heslo kanálu + načíst */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={heslo}
          onChange={(e) => onHeslo(e.target.value)}
          placeholder="Heslo kanálu"
          style={{ ...inputStyle, flex: 1 }}
        />
        <Btn
          variant="bezel"
          onClick={onNactiEvents}
          disabled={!heslo.trim() || loadingEvents}
        >
          {loadingEvents ? 'Načítám…' : 'Načíst'}
        </Btn>
      </div>

      {/* Event picker */}
      {events.length > 0 && (
        <PickerList
          items={events.map((e) => ({ id: e.id, label: e.name }))}
          value={eventId}
          onChange={onEventId}
          placeholder="— bez eventu —"
          style={{ marginBottom: 10 }}
        />
      )}

      {/* Folder picker */}
      {loadingFolders && (
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-3)' }}>Načítám složky…</p>
      )}
      {folders.length > 0 && (
        <>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 4 }}>
            Složka s výsledky:
          </div>
          <PickerList
            items={folders.map((f) => ({ id: f.id, label: f.name }))}
            value={folderId}
            onChange={(id) => {
              const f = folders.find((x) => x.id === id)
              onFolderId(id, f?.name ?? '')
            }}
          />
        </>
      )}

      {folderId && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-3)' }}>
          Sportity mapování se uloží automaticky po vytvoření závodu.
        </p>
      )}
    </div>
  )
}

function PickerList({
  items,
  value,
  onChange,
  placeholder,
  style
}: {
  items: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  style?: React.CSSProperties
}): React.JSX.Element {
  const all = placeholder ? [{ id: '', label: placeholder }, ...items] : items
  return (
    <div
      style={{
        maxHeight: 140,
        overflowY: 'auto',
        border: '0.5px solid var(--hairline)',
        borderRadius: 'var(--r-ctrl)',
        ...style
      }}
    >
      {all.map((item, i) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '7px 12px',
              fontSize: 13,
              font: 'inherit',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
              background: active ? 'var(--accent)' : i % 2 === 0 ? 'transparent' : 'var(--card-alt)',
              color: active ? 'var(--accent-text)' : 'var(--text-1)',
              fontWeight: active ? 560 : 440,
              cursor: 'pointer'
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 10px',
  border: '0.5px solid var(--hairline)',
  borderRadius: 'var(--r-ctrl)',
  background: 'var(--card)',
  color: 'var(--text-1)',
  font: 'inherit',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box'
}
