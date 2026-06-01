import { useState } from 'react'
import type { RaceType, Ruleset, Zavod } from '@shared/types'
import { Modal } from '../components/Modal'
import { Btn, DevBadge } from '../components/ui'
import { VYCHOZI_KATEGORIE } from '../data/raceDefaults'

function dnesISO(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const SOTOLINA_NAZEV = 'Šotolina'

// Nabídka kategorií (badge) pro daný typ. RX Cup NEMÁ šotolinové kategorie
// (CLAUDE.md §3b) — Šotolina se v RX vůbec nenabízí. RAC Race nabízí standardní
// kategorie + Šotolinu jako volitelnou s vlastním rulesetem.
function chipsProTyp(typ: RaceType): string[] {
  if (typ === 'RX') return VYCHOZI_KATEGORIE.RX
  return [...VYCHOZI_KATEGORIE.RAC, SOTOLINA_NAZEV]
}

// Ruleset podle názvu kategorie a typu závodu.
// • RAC: „Šotolina" → SOTOLINA, ostatní STANDARD.
// • RX:  vždy STANDARD (Šotolina v RX neexistuje, i kdyby si někdo název
//        „Šotolina" přidal ručně jako vlastní kategorii).
function rulesetPro(nazev: string, typ: RaceType): Ruleset {
  if (typ === 'RX') return 'STANDARD'
  return nazev === SOTOLINA_NAZEV ? 'SOTOLINA' : 'STANDARD'
}

interface RaceDialogProps {
  /** edit: jen základní údaje; new: i typ a kategorie. */
  mode: 'new' | 'edit'
  zavod?: Zavod // pro edit (předvyplnění)
  onCancel: () => void
  onSaved: (z: Zavod) => void
}

export function RaceDialog({ mode, zavod, onCancel, onSaved }: RaceDialogProps): React.JSX.Element {
  const [nazev, setNazev] = useState(zavod?.nazev ?? '')
  const [datum, setDatum] = useState(zavod?.datum ?? dnesISO())
  const [misto, setMisto] = useState(zavod?.misto ?? '')
  const [typ, setTyp] = useState<RaceType>(zavod?.typ ?? 'RAC')
  // Dostupné badge a které jsou vybrané. Výchozí = všechny standardní (bez Šotoliny).
  const [dostupne, setDostupne] = useState<string[]>(() => chipsProTyp(zavod?.typ ?? 'RAC'))
  const [vybrane, setVybrane] = useState<Set<string>>(
    () => new Set(VYCHOZI_KATEGORIE[zavod?.typ ?? 'RAC'])
  )
  const [vlastni, setVlastni] = useState('')
  const [uklada, setUklada] = useState(false)

  // Změna typu předvyplní jeho nabídku i výchozí výběr.
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
  const muzeUlozit = nazev.trim() !== '' && datum !== '' && (mode === 'edit' || vybraneNazvy.length > 0)

  const uloz = async (): Promise<void> => {
    if (!muzeUlozit || uklada) return
    setUklada(true)
    try {
      if (mode === 'edit' && zavod) {
        const z = await window.api.updateZavod({ id: zavod.id, nazev, datum, misto })
        onSaved(z)
      } else {
        const z = await window.api.createZavod({
          nazev,
          datum,
          misto,
          typ,
          kategorie: vybraneNazvy.map((n) => ({ nazev: n, ruleset: rulesetPro(n, typ) }))
        })
        onSaved(z)
      }
    } finally {
      setUklada(false)
    }
  }

  return (
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
            onClick={() => void uloz()}
            disabled={!muzeUlozit || uklada}
          >
            {mode === 'edit' ? 'Uložit' : 'Založit závod'}
          </Btn>
        </>
      }
    >
      {/* Základní údaje */}
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

      {mode === 'new' && (
        <>
          <Pole label="Typ závodu">
            <span style={{ display: 'inline-flex', gap: 2, background: 'var(--seg-track)', borderRadius: 8, padding: 2 }}>
              {(['RAC', 'RX'] as RaceType[]).map((t) => {
                const on = typ === t
                return (
                  <button
                    key={t}
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

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0 8px' }}>
            <span style={{ fontSize: 11.5, fontWeight: 560, color: 'var(--text-2)' }}>
              Kategorie <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({vybraneNazvy.length} vybráno)</span>
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>klikni pro výběr</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {dostupne.map((n) => {
              const on = vybrane.has(n)
              return (
                <button
                  key={n}
                  onClick={() => toggle(n)}
                  className={on ? 'chip chip--on' : 'chip'}
                  style={{ height: 30, padding: '0 13px', fontSize: 13, fontWeight: on ? 560 : 450 }}
                >
                  {n}
                </button>
              )
            })}
          </div>

          {/* Přidání vlastní kategorie */}
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
            />
            <Btn variant="bezel" icon="plus" onClick={pridejVlastni} disabled={vlastni.trim() === ''}>
              Přidat
            </Btn>
          </div>
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
              <b>RX Cup je ve vývoji</b> — bodování do seriálu zatím není finální. Závod
              můžeš normálně založit a zkoušet.
            </p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            Nabídka je dle typu závodu — klikni na kategorie, které chceš.{' '}
            {typ === 'RAC' ? (
              <>
                <b>Šotolina</b> jede dle svých pravidel (body 14→1, finále A/B).{' '}
              </>
            ) : (
              <>
                <b>RX Cup</b> nemá šotolinové kategorie.{' '}
              </>
            )}
            Vlastní kategorii přidáš polem výše.
          </p>
        </>
      )}
    </Modal>
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
