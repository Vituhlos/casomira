import { useCallback, useEffect, useState } from 'react'
import type { KlasifikaceRadek, KoloTyp } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { Btn, Medal } from '../components/ui'
import { Card, Row, tdStyle, thStyle } from '../components/table'

interface StandingsProps {
  kategorieId: number
  koloTypy: KoloTyp[]
  title: string
  /**
   * Zobrazit sloupec „Los" (a vysvětlivku v podtitulku). True pro Šotolinu
   * — tam je los tiebreakem (CLAUDE.md §7). Pro STANDARD se nepoužívá.
   */
  ukazLos?: boolean
}

export function Standings({
  kategorieId,
  koloTypy,
  title,
  ukazLos = false
}: StandingsProps): React.JSX.Element {
  const [radky, setRadky] = useState<KlasifikaceRadek[]>([])
  const klic = koloTypy.join(',')

  const nacti = useCallback(async (): Promise<void> => {
    setRadky(await window.api.getKlasifikace(kategorieId, koloTypy))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategorieId, klic])

  useEffect(() => {
    void nacti()
  }, [nacti])

  const sub = ukazLos
    ? 'Součet bodů · řazeno sestupně · při shodě rozhoduje los do 1. jízdy'
    : 'Součet bodů ze všech jízd · řazeno sestupně'

  // Šířka sloupce „Jezdec" se mírně zmenší, když přibude Los, aby řádek nepřetekl.
  const wJezdec = ukazLos ? 210 : 240
  const colSpanPrazdne = 3 + (ukazLos ? 1 : 0) + koloTypy.length + 1

  return (
    <div className="screen-enter">
      <ContentHead title={title} sub={sub}>
        <Btn icon="sort" onClick={() => void nacti()}>
          Seřadit
        </Btn>
      </ContentHead>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 64 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: wJezdec }} />
            {ukazLos && <col style={{ width: 56 }} />}
            {koloTypy.map((t) => (
              <col key={t} style={{ width: 72 }} />
            ))}
            <col style={{ width: 90 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>Pořadí</th>
              <th style={thStyle}>St. č.</th>
              <th style={thStyle}>Jezdec</th>
              {ukazLos && (
                <th
                  style={{ ...thStyle, textAlign: 'right' }}
                  title="Los do 1. jízdy (tiebreak)"
                >
                  Los
                </th>
              )}
              {koloTypy.map((t) => (
                <th key={t} style={{ ...thStyle, textAlign: 'right' }}>
                  {t}
                </th>
              ))}
              <th style={{ ...thStyle, textAlign: 'right' }}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {radky.length === 0 && (
              <tr>
                <td
                  colSpan={colSpanPrazdne}
                  style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3)', height: 80 }}
                >
                  Zatím žádné body — zadej výsledky v jednotlivých kolech.
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
                {ukazLos && (
                  <td
                    className="tnum"
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      color: r.los != null ? 'var(--text-2)' : 'var(--text-4)'
                    }}
                  >
                    {r.los ?? '—'}
                  </td>
                )}
                {koloTypy.map((t) => (
                  <td
                    key={t}
                    style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-2)' }}
                    className="tnum"
                  >
                    {r.perKolo[t] ?? 0}
                  </td>
                ))}
                <td
                  style={{
                    ...tdStyle,
                    textAlign: 'right',
                    fontWeight: 680,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {r.celkem}
                </td>
              </Row>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
