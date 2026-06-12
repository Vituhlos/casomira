import { useCallback, useEffect, useState } from 'react'
import type { CelkoveRadek } from '@shared/types'
import { Button, Table } from '@heroui/react'
import { ArrowUpArrowDown } from '@gravity-ui/icons'

interface SloupecDef {
  hlavicka: string
  popis: string
  hodnota: (r: CelkoveRadek) => number | null
  format: 'poradi' | 'cislo'
}

const SLOUPCE_STANDARD: SloupecDef[] = [
  { hlavicka: 'PQ', popis: 'Pořadí po Q3', hodnota: (r) => r.pq, format: 'poradi' },
  { hlavicka: 'PSF', popis: 'Pořadí v semifinále', hodnota: (r) => r.psf, format: 'poradi' },
  { hlavicka: 'PF', popis: 'Pořadí ve finále', hodnota: (r) => r.pf, format: 'poradi' },
  { hlavicka: 'BQ', popis: 'Body z kvalifikace (po Q3)', hodnota: (r) => r.bq, format: 'cislo' }
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
    const off = window.api.onDataChanged?.(() => void nacti())
    return () => off?.()
  }, [nacti])

  const sloupce = SLOUPCE_STANDARD
  const sub = 'Pořadí řídí finále (vítěz finále = 1.) · body jen z kvalifikace, SF/F je nepřičítají'

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-[22px] font-[680] tracking-tight">Celkové výsledky</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onPress={() => void nacti()}>
            <ArrowUpArrowDown width={14} height={14} />
            Přegenerovat
          </Button>
        </div>
      </div>

      <div className="mx-5 mb-5">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Celkové výsledky">
              <Table.Header className="sticky top-0 z-10">
                <Table.Column isRowHeader>Pořadí</Table.Column>
                <Table.Column>St. č.</Table.Column>
                <Table.Column>Jezdec</Table.Column>
                {sloupce.map((s) => (
                  <Table.Column key={s.hlavicka} className="text-right" title={s.popis}>
                    {s.hlavicka}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="py-8 text-center text-sm text-muted">
                    Zatím není co zobrazit — zadej výsledky kvalifikace (a případně SF/finále).
                  </div>
                )}
              >
                {radky.map((r, i) => (
                  <Table.Row key={r.jezdec_id} id={r.jezdec_id} className={i % 2 ? 'bg-muted/[0.04]' : ''}>
                    <Table.Cell className="tabular-nums font-[620]">
                      <span style={{
                        color: r.poradi <= 3
                          ? 'var(--color-foreground)'
                          : 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
                      }}>
                        <MedalDot rank={r.poradi} />
                        {r.poradi}.
                      </span>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums font-[600]">{r.st_cislo}</Table.Cell>
                    <Table.Cell>
                      <b style={{ fontWeight: 590 }}>{r.prijmeni}</b>{' '}
                      <span className="text-muted">{r.jmeno}</span>
                    </Table.Cell>
                    {sloupce.map((s) => {
                      const h = s.hodnota(r)
                      if (s.format === 'poradi') {
                        return (
                          <Table.Cell key={s.hlavicka} className="tabular-nums text-right" style={{
                            color: h != null
                              ? 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
                              : 'color-mix(in srgb, var(--color-foreground) 22%, transparent)'
                          }}>
                            {h != null ? `${h}.` : '—'}
                          </Table.Cell>
                        )
                      }
                      return (
                        <Table.Cell key={s.hlavicka} className="tabular-nums text-right font-[680]">
                          {h ?? 0}
                        </Table.Cell>
                      )
                    })}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  )
}

function MedalDot({ rank }: { rank: number }): React.JSX.Element | null {
  const color =
    rank === 1 ? 'var(--color-medal-gold)' :
    rank === 2 ? 'var(--color-medal-silver)' :
    rank === 3 ? 'var(--color-medal-bronze)' : null
  if (!color) return null
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7,
      borderRadius: 99, background: color,
      marginRight: 8, verticalAlign: 'middle'
    }} />
  )
}
