import { useCallback, useEffect, useState } from 'react'
import type { KlasifikaceRadek, KoloTyp } from '@shared/types'
import { consumePreload } from '../lib/preload'
import { useAtomicReveal } from '../hooks/useAtomicReveal'
import { Button, Table } from '@heroui/react'
import { ArrowUpArrowDown } from '@gravity-ui/icons'
import { MedalDot } from '../components/MedalDot'

interface StandingsProps {
  kategorieId: number
  koloTypy: KoloTyp[]
  title: string
  ukazLos?: boolean
}

export function Standings({
  kategorieId,
  koloTypy,
  title,
  ukazLos = false
}: StandingsProps): React.JSX.Element {
  const [radky, setRadky] = useState<KlasifikaceRadek[] | null>(null)
  const shown = useAtomicReveal(radky !== null)
  const klic = koloTypy.join(',')

  const nacti = useCallback(async (): Promise<void> => {
    const p = consumePreload<KlasifikaceRadek[]>(`${kategorieId}:klasifikace:${klic}`)
    setRadky(await (p ?? window.api.getKlasifikace(kategorieId, koloTypy)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategorieId, klic])

  useEffect(() => {
    void nacti()
  }, [nacti])

  useEffect(() => {
    const off = window.api.onDataChanged?.(() => void nacti())
    return off
  }, [nacti])

  const sub = ukazLos
    ? 'Součet bodů · řazeno sestupně · při shodě rozhoduje los do 1. jízdy'
    : 'Součet bodů ze všech jízd · řazeno sestupně'

  return (
    <div className="race-table-screen">
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-[22px] font-[680] tracking-tight">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onPress={() => void nacti()}>
            <ArrowUpArrowDown width={14} height={14} />
            Seřadit
          </Button>
        </div>
      </div>

      {radky == null ? (
        <div className="heat-empty-state text-sm text-muted">Načítám {title}…</div>
      ) : (
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div
            className="race-table-wrap"
            style={{ opacity: shown ? 1 : 0, pointerEvents: shown ? undefined : 'none', height: '100%' }}
          >
            <Table className="race-table-root">
              <Table.ScrollContainer className="race-table-scroll">
                <Table.Content aria-label={title}>
                  <Table.Header className="sticky top-0 z-10">
                <Table.Column isRowHeader>Pořadí</Table.Column>
                <Table.Column>St. č.</Table.Column>
                <Table.Column>Jezdec</Table.Column>
                {ukazLos && (
                  <Table.Column className="text-right">
                    <span title="Los do 1. jízdy (tiebreak)">Los</span>
                  </Table.Column>
                )}
                {koloTypy.map((t) => (
                  <Table.Column key={t} className="text-right">{t}</Table.Column>
                ))}
                <Table.Column className="text-right">Celkem</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="py-8 text-center text-sm text-muted">
                    Zatím žádné body — zadej výsledky v jednotlivých kolech.
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
                    {ukazLos && (
                      <Table.Cell className="tabular-nums text-right text-muted">
                        {r.los ?? '—'}
                      </Table.Cell>
                    )}
                    {koloTypy.map((t) => (
                      <Table.Cell key={t} className="tabular-nums text-right text-muted">
                        {r.perKolo[t] ?? 0}
                      </Table.Cell>
                    ))}
                    <Table.Cell className="tabular-nums text-right font-[680]">
                      {r.celkem}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
          </div>
          {!shown && (
            <div
              className="heat-empty-state text-sm text-muted"
              style={{ position: 'absolute', inset: 0 }}
              aria-hidden
            >
              Načítám {title}…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

