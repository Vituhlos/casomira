import { useCallback, useEffect, useState } from 'react'
import type { KoloTyp, QAgregatRadek } from '@shared/types'
import { consumePreload } from '../lib/preload'
import { useAtomicReveal } from '../hooks/useAtomicReveal'
import { Chip, Table } from '@heroui/react'
import { MedalDot } from '../components/MedalDot'
import { Tooltip } from '../components/Tooltip'
import { fmtTime } from '../lib/time'

interface QVysledkyProps {
  kategorieId: number
  typ: KoloTyp
  label: string
}

export function QVysledky({ kategorieId, typ, label }: QVysledkyProps): React.JSX.Element {
  const [radky, setRadky] = useState<QAgregatRadek[] | null>(null)
  const shown = useAtomicReveal(radky !== null)

  const nacti = useCallback(async (): Promise<void> => {
    const p = consumePreload<QAgregatRadek[]>(`${kategorieId}:${typ}:agregat`)
    setRadky(await (p ?? window.api.getQAgregat(kategorieId, typ)))
  }, [kategorieId, typ])

  useEffect(() => {
    void nacti()
    const off = window.api.onDataChanged?.(() => void nacti())
    return off
  }, [nacti])

  const setBody = useCallback(async (jezdecId: number, body: number | null): Promise<void> => {
    setRadky(await window.api.setQAgregatBodyOverride(kategorieId, typ, jezdecId, body))
  }, [kategorieId, typ])

  return (
    <div className="race-table-screen">
      <div className="px-5 pb-3 pt-4">
        <h2 className="text-[22px] font-[680] tracking-tight">Výsledky po {label}</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Všechny jízdy · seřazeno dle nejlepšího času · body lze upravit přímo v tabulce
        </p>
      </div>

      {radky == null ? (
        <div className="heat-empty-state text-sm text-muted">Načítám výsledky po {label}…</div>
      ) : (
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div
            className="race-table-wrap"
            style={{ opacity: shown ? 1 : 0, pointerEvents: shown ? undefined : 'none', height: '100%' }}
          >
            <Table className="race-table-root">
          <Table.ScrollContainer className="race-table-scroll">
            <Table.Content aria-label={`Výsledky po ${label}`}>
              <Table.Header className="sticky top-0 z-10">
                <Table.Column isRowHeader>Pořadí</Table.Column>
                <Table.Column>St. č.</Table.Column>
                <Table.Column>Příjmení</Table.Column>
                <Table.Column>Jméno</Table.Column>
                <Table.Column>Značka</Table.Column>
                <Table.Column>Model</Table.Column>
                <Table.Column className="text-right">Čas</Table.Column>
                <Table.Column className="text-right">Body</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="py-8 text-center text-sm text-muted">
                    Zatím žádné výsledky — zadej časy v záložce Výsledky.
                  </div>
                )}
              >
                {radky.map((r, i) => (
                  <Table.Row
                    key={r.jezdec_id}
                    id={r.jezdec_id}
                    className={
                      r.body_rucni != null || r.delta_z_jizdy !== 0
                        ? 'bg-warning/[0.05]'
                        : i % 2 ? 'bg-muted/[0.04]' : ''
                    }
                  >
                    <Table.Cell className="tabular-nums font-[620]">
                      <span style={{
                        color: r.poradi != null && r.poradi <= 3
                          ? 'var(--color-foreground)'
                          : 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
                      }}>
                        {r.poradi != null ? (
                          <>
                            <MedalDot rank={r.poradi} />
                            {r.poradi}.
                          </>
                        ) : (
                          <span style={{ color: 'color-mix(in srgb, var(--color-foreground) 22%, transparent)' }}>—</span>
                        )}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums font-[600]">{r.st_cislo}</Table.Cell>
                    <Table.Cell className="font-[590]">{r.prijmeni}</Table.Cell>
                    <Table.Cell className="text-muted">{r.jmeno}</Table.Cell>
                    <Table.Cell className="text-muted">{r.znacka}</Table.Cell>
                    <Table.Cell className="text-muted">{r.model}</Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.stav === 'OK' ? (
                          <span
                            className="inline-block tabular-nums text-right"
                            title={`${r.cislo_jizdy}. jízda`}
                            style={{ minWidth: 100 }}
                          >
                            {r.cas_ms != null
                              ? fmtTime(r.cas_ms + r.penalizace_ms)
                              : <span style={{ color: 'color-mix(in srgb, var(--color-foreground) 22%, transparent)' }}>—</span>
                            }
                          </span>
                        ) : (
                          <span className="inline-flex justify-end" title={`${r.cislo_jizdy}. jízda`}>
                            <StavChip stav={r.stav as 'DNF' | 'DNS' | 'DQ'} />
                          </span>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <BodyCell
                        body={r.body}
                        bodyAuto={r.body_auto}
                        overridden={r.body_rucni != null}
                        deltaZJizdy={r.delta_z_jizdy}
                        onCommit={(val) => void setBody(r.jezdec_id, val)}
                      />
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
              Načítám výsledky po {label}…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StavChip({ stav }: { stav: 'DNF' | 'DNS' | 'DQ' }): React.JSX.Element {
  return (
    <Chip
      size="sm"
      variant="soft"
      color={stav === 'DNF' ? 'warning' : stav === 'DQ' ? 'danger' : 'default'}
    >
      {stav}
    </Chip>
  )
}

interface BodyCellProps {
  body: number | null
  bodyAuto: number | null
  overridden: boolean
  deltaZJizdy: number
  onCommit: (v: number | null) => void
}

function BodyCell({ body, bodyAuto, overridden, deltaZJizdy, onCommit }: BodyCellProps): React.JSX.Element {
  const [v, setV] = useState(body != null ? String(body) : '')
  const [focused, setFocused] = useState(false)
  useEffect(() => setV(body != null ? String(body) : ''), [body])

  const commit = (): void => {
    setFocused(false)
    const orig = body != null ? String(body) : ''
    const t = v.trim()
    if (t === orig) { setV(orig); return }
    if (t === '') { onCommit(null); return }
    const n = Number.parseInt(t, 10)
    if (!Number.isNaN(n)) onCommit(n)
    else setV(orig)
  }

  const tooltipParts: string[] = []
  if (deltaZJizdy !== 0) tooltipParts.push(`Bodová penalizace z jízdy: ${deltaZJizdy > 0 ? '+' : ''}${deltaZJizdy}`)
  if (overridden) tooltipParts.push('Ručně upravené body agregátu · smaž pro návrat k automatu')
  else if (bodyAuto != null) tooltipParts.push(`Automat: ${bodyAuto}`)
  const tooltip = tooltipParts.join(' · ') || undefined

  const input = (
    <input
      value={v}
      inputMode="numeric"
      onChange={(e) => setV(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setV(body != null ? String(body) : ''); e.currentTarget.blur() }
      }}
      style={{
        width: 48, textAlign: 'right',
        border: `1px solid ${focused ? 'var(--color-primary)' : 'transparent'}`,
        background: focused ? 'var(--color-background)' : 'transparent',
        padding: '3px 5px', borderRadius: 5,
        font: 'inherit', fontSize: 13.5,
        fontVariantNumeric: 'tabular-nums', fontWeight: 620,
        color: overridden
          ? 'var(--color-primary)'
          : deltaZJizdy !== 0
            ? 'color-mix(in srgb, var(--color-primary) 80%, var(--color-foreground))'
            : body != null
              ? 'var(--color-foreground)'
              : 'color-mix(in srgb, var(--color-foreground) 35%, transparent)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--color-primary) 28%, transparent)' : 'none'
      }}
    />
  )

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
      {tooltip ? <Tooltip text={tooltip}>{input}</Tooltip> : input}
      <span style={{ width: 16, flexShrink: 0, display: 'inline-flex', justifyContent: 'center' }}>
        {overridden && (
          <Tooltip text="Zrušit ruční úpravu (zpět na automat)">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommit(null)}
              style={{
                width: 16, height: 16,
                display: 'inline-grid', placeItems: 'center',
                fontSize: 13, lineHeight: 1, padding: 0,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
              }}
            >
              ×
            </button>
          </Tooltip>
        )}
      </span>
    </span>
  )
}
