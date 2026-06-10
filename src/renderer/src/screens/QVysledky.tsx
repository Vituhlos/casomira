import { useCallback, useEffect, useState } from 'react'
import type { KoloTyp, QAgregatRadek } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { Badge, Medal } from '../components/ui'
import { Card, Row, tdStyle, thStyle } from '../components/table'
import { Tooltip } from '../components/Tooltip'
import { fmtTime } from '../lib/time'

interface QVysledkyProps {
  kategorieId: number
  typ: KoloTyp
  label: string
}

export function QVysledky({ kategorieId, typ, label }: QVysledkyProps): React.JSX.Element {
  const [radky, setRadky] = useState<QAgregatRadek[]>([])

  const nacti = useCallback(async (): Promise<void> => {
    setRadky(await window.api.getQAgregat(kategorieId, typ))
  }, [kategorieId, typ])

  useEffect(() => {
    void nacti()
    const off = window.api.onDataChanged?.(() => void nacti())
    return off
  }, [nacti])

  const setBody = async (jezdecId: number, body: number | null): Promise<void> => {
    setRadky(await window.api.setQAgregatBodyOverride(kategorieId, typ, jezdecId, body))
  }

  const prazdne = radky.length === 0

  return (
    <div className="screen-enter">
      <ContentHead
        title={`Výsledky po ${label}`}
        sub="Všechny jízdy · seřazeno dle nejlepšího času · body lze upravit přímo v tabulce"
      />

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={thStyle}>Pořadí</th>
              <th style={thStyle}>St. č.</th>
              <th style={thStyle}>Příjmení</th>
              <th style={thStyle}>Jméno</th>
              <th style={thStyle}>Značka</th>
              <th style={thStyle}>Model</th>
              <th style={{ ...thStyle, textAlign: 'right', paddingRight: 14 + 32 }}>Čas</th>
              <th style={{ ...thStyle, textAlign: 'right', paddingRight: 14 + 21 }}>Body</th>
            </tr>
          </thead>
          <tbody>
            {prazdne && (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', height: 80 }}
                >
                  Zatím žádné výsledky — zadej časy v záložce Výsledky.
                </td>
              </tr>
            )}
            {radky.map((r, i) => (
              <Row key={r.jezdec_id} i={i} zebra penalized={r.body_rucni != null || r.delta_z_jizdy !== 0}>
                <td
                  style={{
                    ...tdStyle,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 620,
                    color: r.poradi != null && r.poradi <= 3 ? 'var(--foreground)' : 'var(--muted)'
                  }}
                >
                  {r.poradi != null ? (
                    <>
                      <Medal rank={r.poradi} />
                      {r.poradi}.
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-4)' }}>—</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span className="tnum" style={{ fontWeight: 600 }}>{r.st_cislo}</span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 590 }}>{r.prijmeni}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{r.jmeno}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{r.znacka}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{r.model}</td>
                <td style={{ ...tdStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    {r.stav === 'OK' ? (
                      <span
                        className="tnum"
                        title={`${r.cislo_jizdy}. jízda`}
                        style={{ fontVariantNumeric: 'tabular-nums', width: 112, textAlign: 'right', display: 'inline-block' }}
                      >
                        {r.cas_ms != null ? fmtTime(r.cas_ms + r.penalizace_ms) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </span>
                    ) : (
                      <span title={`${r.cislo_jizdy}. jízda`} style={{ width: 112, display: 'inline-flex', justifyContent: 'flex-end' }}>
                        <Badge status={r.stav} />
                      </span>
                    )}
                    {/* rezervované místo pro caret — konzistentní zarovnání */}
                    <span style={{ width: 26, flexShrink: 0 }} />
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <BodyCell
                    body={r.body}
                    bodyAuto={r.body_auto}
                    overridden={r.body_rucni != null}
                    deltaZJizdy={r.delta_z_jizdy}
                    onCommit={(val) => void setBody(r.jezdec_id, val)}
                  />
                </td>
              </Row>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
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
        width: 48,
        textAlign: 'right',
        border: `1px solid ${focused ? 'var(--accent)' : 'transparent'}`,
        background: focused ? 'var(--surface)' : 'transparent',
        padding: '3px 5px',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 13.5,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 620,
        color: overridden
          ? 'var(--accent)'
          : deltaZJizdy !== 0
            ? 'color-mix(in srgb, var(--accent) 70%, var(--muted))'
            : body != null ? 'var(--foreground)' : 'var(--muted)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none'
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
              className="opacity-0 group-hover:opacity-[.65] hover:!opacity-100 hover:bg-black/[.06] dark:hover:bg-white/[.1] hover:text-[var(--foreground)] bg-transparent border-none cursor-pointer rounded-[5px] transition-[opacity,background,color] duration-[120ms] ease-linear focus-visible:outline-none focus-visible:opacity-100 focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_38%,transparent)]"
              style={{ width: 16, height: 16, display: 'inline-grid', placeItems: 'center', fontSize: 13, lineHeight: 1, padding: 0, color: 'var(--muted)' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommit(null)}
            >
              ×
            </button>
          </Tooltip>
        )}
      </span>
    </span>
  )
}
