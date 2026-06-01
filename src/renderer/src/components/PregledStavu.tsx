import { useCallback, useEffect, useState } from 'react'
import type { PrehledZavodu, StavFaze } from '@shared/stav'
import type { RaceType } from '@shared/types'
import { STAV_FAZE_LABEL, STAV_FAZE_SYMBOL } from '../lib/stav'

const STORAGE_KEY = 'casomira-pregled-stavu'

function barvaStavu(stav: StavFaze): string {
  if (stav === 'done') return 'var(--stav-done, #34a853)'
  if (stav === 'partial') return 'var(--stav-partial, #e8a020)'
  return 'var(--text-4)'
}

interface PregledStavuProps {
  zavodId: number
  typ: RaceType
  aktivniKategorieId: number | null
  dataNonce: number
}

export function PregledStavu({
  zavodId,
  typ,
  aktivniKategorieId,
  dataNonce
}: PregledStavuProps): React.JSX.Element | null {
  const [otevreno, setOtevreno] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0'
    } catch {
      return true
    }
  })
  const [prehled, setPrehled] = useState<PrehledZavodu | null>(null)

  const nacti = useCallback((): void => {
    void window.api.getPrehledZavodu(zavodId, typ).then(setPrehled)
  }, [zavodId, typ])

  useEffect(() => {
    nacti()
  }, [nacti, dataNonce])

  useEffect(() => {
    const off = window.api.onDataChanged?.(() => nacti())
    return () => off?.()
  }, [nacti])

  const toggle = (): void => {
    setOtevreno((v) => {
      const next = !v
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  if (!prehled || prehled.kategorie.length === 0) return null

  const fazeSloupce = prehled.kategorie[0]?.faze ?? []

  return (
    <div
      className="no-print pregled-stavu"
      style={{
        flexShrink: 0,
        borderBottom: '0.5px solid var(--hairline)',
        background: 'var(--card-alt)'
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 22px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 12.5,
          fontWeight: 560,
          color: 'var(--text-2)',
          textAlign: 'left'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: otevreno ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
            color: 'var(--text-3)',
            fontSize: 10
          }}
        >
          ▶
        </span>
        Přehled stavu závodu
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 450, color: 'var(--text-4)' }}>
          {otevreno ? 'sbalit' : 'rozbalit'}
        </span>
      </button>

      {otevreno && (
        <div style={{ padding: '0 22px 12px', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 480,
              borderCollapse: 'collapse',
              fontSize: 12
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '4px 10px 6px 0',
                    fontWeight: 560,
                    color: 'var(--text-3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Kategorie
                </th>
                {fazeSloupce.map((f) => (
                  <th
                    key={f.id}
                    style={{
                      textAlign: 'center',
                      padding: '4px 6px 6px',
                      fontWeight: 560,
                      color: 'var(--text-3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prehled.kategorie.map((k) => (
                <tr
                  key={k.kategorieId}
                  style={{
                    background:
                      k.kategorieId === aktivniKategorieId
                        ? 'var(--seg-track)'
                        : 'transparent'
                  }}
                >
                  <td
                    style={{
                      padding: '5px 10px 5px 0',
                      fontWeight: k.kategorieId === aktivniKategorieId ? 620 : 500,
                      color: 'var(--text-1)',
                      whiteSpace: 'nowrap',
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={k.nazev}
                  >
                    {k.nazev}
                  </td>
                  {k.faze.map((f) => (
                    <td key={f.id} style={{ textAlign: 'center', padding: '5px 6px' }}>
                      <span
                        title={STAV_FAZE_LABEL[f.stav]}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 550,
                          color: barvaStavu(f.stav)
                        }}
                      >
                        <span className="tnum" aria-hidden>
                          {STAV_FAZE_SYMBOL[f.stav]}
                        </span>
                        <span className="pregled-stavu__label">{STAV_FAZE_LABEL[f.stav]}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-4)', lineHeight: 1.45 }}>
            ✓ hotovo · ◐ částečně · ○ prázdné (bez roštu nebo bez výsledků)
          </p>
        </div>
      )}
    </div>
  )
}
