import { useEffect, useState } from 'react'
import type { Kategorie, RaceType, Zavod } from '@shared/types'
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
