import { useCallback, useEffect, useState } from 'react'
import type { CelkoveRadek } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { Btn, Medal } from '../components/ui'
import { Card, Row, tdStyle, thStyle } from '../components/table'

interface SloupecDef {
  hlavicka: string
  popis: string
  hodnota: (r: CelkoveRadek) => number | null
  zarovnani: 'left' | 'right'
  format: 'poradi' | 'cislo'
}

// Sloupce STANDARD: PQ / PSF / PF / BQ.
const SLOUPCE_STANDARD: SloupecDef[] = [
  { hlavicka: 'PQ', popis: 'Pořadí po Q3', hodnota: (r) => r.pq, zarovnani: 'right', format: 'poradi' },
  { hlavicka: 'PSF', popis: 'Pořadí v semifinále', hodnota: (r) => r.psf, zarovnani: 'right', format: 'poradi' },
  { hlavicka: 'PF', popis: 'Pořadí ve finále', hodnota: (r) => r.pf, zarovnani: 'right', format: 'poradi' },
  { hlavicka: 'BQ', popis: 'Body z kvalifikace (po Q3)', hodnota: (r) => r.bq, zarovnani: 'right', format: 'cislo' }
]


export function Overall({
  kategorieId
}: {
  kategorieId: number
}): React.JSX.Element {
  const [radky, setRadky] = useState<CelkoveRadek[]>([])

  const nacti = useCallback(async (): Promise<void> => {
    setRadky(await window.api.getCelkove(kategorieId))
  }, [kategorieId])

  useEffect(() => {
    void nacti()
  }, [nacti])

  const sloupce = SLOUPCE_STANDARD
  const sub = 'Pořadí řídí finále (vítěz finále = 1.) · body jen z kvalifikace, SF/F je nepřičítají'

  return (
    <div className="screen-enter">
      <ContentHead title="Celkové výsledky" sub={sub}>
        <Btn icon="sort" onClick={() => void nacti()}>
          Obnovit
        </Btn>
      </ContentHead>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 64 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 230 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 72 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>Pořadí</th>
              <th style={thStyle}>St. č.</th>
              <th style={thStyle}>Jezdec</th>
              {sloupce.map((s) => (
                <th key={s.hlavicka} title={s.popis} style={{ ...thStyle, textAlign: 'right' }}>
                  {s.hlavicka}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {radky.length === 0 && (
              <tr>
                <td
                  colSpan={3 + sloupce.length}
                  style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3)', height: 80 }}
                >
                  Zatím není co zobrazit — zadej výsledky kvalifikace (a případně SF/finále).
                </td>
              </tr>
            )}
            {radky.map((r, i) => (
              <Row key={r.jezdec_id} i={i} zebra>
                <td
                  style={{
                    ...tdStyle,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 620,
                    color: r.poradi <= 3 ? 'var(--text-1)' : 'var(--text-2)'
                  }}
                >
                  <Medal rank={r.poradi} />
                  {r.poradi}.
                </td>
                <td style={tdStyle}>
                  <span className="tnum" style={{ fontWeight: 600 }}>
                    {r.st_cislo}
                  </span>
                </td>
                <td style={tdStyle}>
                  <b style={{ fontWeight: 590 }}>{r.prijmeni}</b>{' '}
                  <span style={{ color: 'var(--text-2)' }}>{r.jmeno}</span>
                </td>
                {sloupce.map((s) => {
                  const h = s.hodnota(r)
                  if (s.format === 'poradi') return <Pos key={s.hlavicka} hodnota={h} />
                  return (
                    <td
                      key={s.hlavicka}
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 680,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {h ?? 0}
                    </td>
                  )
                })}
              </Row>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// Buňka pořadí (PQ/PSF/PF) — číslo s tečkou, nebo „—" když jezdec v tom kole nebyl.
function Pos({ hodnota }: { hodnota: number | null }): React.JSX.Element {
  return (
    <td
      className="tnum"
      style={{
        ...tdStyle,
        textAlign: 'right',
        color: hodnota != null ? 'var(--text-2)' : 'var(--text-4)'
      }}
    >
      {hodnota != null ? `${hodnota}.` : '—'}
    </td>
  )
}
