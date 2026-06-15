import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { KoloTyp, Stav, VysledekJizda, VysledekKolo, VysledekRadek } from '@shared/types'
import { Chip, Table } from '@heroui/react'
import { MedalDot } from '../components/MedalDot'
import { PenalizaceDialog, type PenalizaceTarget } from '../components/PenalizaceDialog'
import { Tooltip } from '../components/Tooltip'
import { fmtTime, parseTimeLoose } from '../lib/time'
import { jizdaNekompletni } from '../lib/stav'
import { safeCall } from '../lib/api'

interface ResultsProps {
  kategorieId: number
  typ: KoloTyp
  label: string
  bezBodovani?: boolean
  extraControls?: ReactNode
}

function maZasahReditele(r: VysledekRadek): boolean {
  return r.penalizace_ms > 0 || r.body_rucni != null || r.rucni_poradi != null
}

function jenCasovaPenalizace(r: VysledekRadek): boolean {
  return (
    r.penalizace_ms > 0 &&
    r.stav === 'OK' &&
    r.namereny_cas_ms != null &&
    r.body_rucni == null &&
    r.rucni_poradi == null
  )
}

function tooltipPenalizace(r: VysledekRadek): string {
  const parts: string[] = []
  if (r.penalizace_ms > 0 && r.namereny_cas_ms != null) {
    const s = r.penalizace_ms / 1000
    parts.push(
      `Naměřeno ${fmtTime(r.namereny_cas_ms)} → výsledný ${fmtTime(r.namereny_cas_ms + r.penalizace_ms)} (+${s} s)`
    )
  } else if (r.penalizace_ms > 0) {
    parts.push(`Časová penalizace +${r.penalizace_ms / 1000} s`)
  }
  if (r.rucni_poradi != null) parts.push(`Posun na ${r.rucni_poradi}. místo`)
  if (r.uprava_typ === 'BODOVA_PENALIZACE' && r.uprava_hodnota != null) {
    const d = r.uprava_hodnota
    parts.push(`Bodová penalizace ${d >= 0 ? '+' : ''}${d} bodů`)
  } else if (r.body_rucni != null && r.body != null && r.uprava_typ !== 'BODOVA_PENALIZACE') {
    parts.push(`Ruční body: ${r.body}`)
  }
  if (r.uprava_duvod) parts.push(r.uprava_duvod)
  return parts.join(' · ') || 'Zásah ředitele'
}

function stavZeZkratky(text: string): Stav | null {
  const x = text.trim().toLowerCase()
  if (x === 'dnf' || x === 'f') return 'DNF'
  if (x === 'dns' || x === 's') return 'DNS'
  if (x === 'dq' || x === 'q') return 'DQ'
  return null
}

const COL_HEADERS_BEZ_BODOVANI = ['Pořadí', 'St. č.', 'Příjmení', 'Jméno', 'Značka', 'Model', 'Čas']
const COL_HEADERS_STD = [...COL_HEADERS_BEZ_BODOVANI, 'Body']

interface MenuState {
  jizdaId: number
  jezdecId: number
  x: number
  y: number
}

export function Results({ kategorieId, typ, label, bezBodovani = false, extraControls }: ResultsProps): React.JSX.Element {
  const [kolo, setKolo] = useState<VysledekKolo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [penalizace, setPenalizace] = useState<PenalizaceTarget | null>(null)

  const nacti = useCallback((): void => {
    safeCall(window.api.getVysledky(kategorieId, typ).then(setKolo), setLoadError)
  }, [kategorieId, typ])

  useEffect(() => {
    let live = true
    setLoadError(null)
    safeCall(
      window.api.getVysledky(kategorieId, typ).then((k) => { if (live) setKolo(k) }),
      (msg) => { if (live) setLoadError(msg) }
    )
    const off = window.api.onDataChanged?.(() => { if (live) nacti() })
    return () => { live = false; off?.() }
  }, [kategorieId, typ])

  const nahradJizdu = (j: VysledekJizda): void => {
    setKolo((prev) =>
      prev ? { ...prev, jizdy: prev.jizdy.map((x) => (x.id === j.id ? j : x)) } : prev
    )
  }

  const setCas = async (jizdaId: number, jezdecId: number, ms: number | null): Promise<void> => {
    nahradJizdu(await window.api.setVysledek({ jizdaId, jezdecId, cas_ms: ms }))
  }
  const setStav = async (jizdaId: number, jezdecId: number, stav: Stav): Promise<void> => {
    nahradJizdu(await window.api.setVysledek({ jizdaId, jezdecId, stav }))
  }
  const setBody = async (jizdaId: number, jezdecId: number, body: number | null): Promise<void> => {
    nahradJizdu(await window.api.setBodyOverride(jizdaId, jezdecId, body))
  }

  const otevriMenu = (e: React.MouseEvent, jizdaId: number, jezdecId: number): void => {
    e.stopPropagation()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ jizdaId, jezdecId, x: r.left, y: r.bottom + 4 })
  }
  const vyberZMenu = (stav: Stav): void => {
    if (menu) void setStav(menu.jizdaId, menu.jezdecId, stav)
    setMenu(null)
  }

  const otevriPenalizaci = (): void => {
    if (!menu || !kolo) return
    const jz = kolo.jizdy.find((j) => j.id === menu.jizdaId)
    const r = jz?.vysledky.find((x) => x.jezdec_id === menu.jezdecId)
    if (r && jz) {
      const maxPoradi = jz.vysledky.filter((x) => x.poradi != null).length
      setPenalizace({ jizdaId: menu.jizdaId, radek: r, maxPoradi: Math.max(1, maxPoradi) })
    }
    setMenu(null)
  }

  const prazdne = (kolo?.jizdy ?? []).every((j) => j.vysledky.length === 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-[22px] font-[680] tracking-tight">Výsledky — {label}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Napiš čas (mm:ss.sss) nebo stav (dnf/dns/dq) · nebo klikni na odznak vpravo
          </p>
        </div>
        {extraControls && <div className="flex items-center gap-2">{extraControls}</div>}
      </div>

      {loadError && (
        <div className="px-5 pb-3.5 text-[13px] text-danger">
          Nepodařilo se načíst výsledky: {loadError}
        </div>
      )}

      {prazdne && (
        <div className="px-5 pb-5 text-[13px] text-muted">
          Nejprve sestav rošty ({label}) — výsledky se zadávají jezdcům z roštu.
        </div>
      )}

      {(kolo?.jizdy ?? []).map((jz) => {
        const nekompletni = jizdaNekompletni(jz.vysledky)
        const colHeaders = bezBodovani ? COL_HEADERS_BEZ_BODOVANI : COL_HEADERS_STD

        return (
          <div key={jz.id} className="mx-5 mb-4">
            <div className="mb-2 text-[13px] font-[620]">
              <span className="inline-flex items-center gap-2">
                {jz.cislo}. JÍZDA
                {nekompletni && (
                  <span className="inline-flex h-5 items-center rounded-full border border-border bg-muted/10 px-2 text-[11px] font-[600] tracking-[0.02em] text-muted">
                    nekompletní
                  </span>
                )}
              </span>
            </div>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={`${jz.cislo}. jízda — ${label}`}>
                  <Table.Header className="sticky top-0 z-10">
                    {colHeaders.map((h, idx) => (
                      <Table.Column
                        key={h}
                        isRowHeader={idx === 0}
                        className={idx >= 6 ? 'text-right' : ''}
                      >
                        {h}
                      </Table.Column>
                    ))}
                  </Table.Header>
                  <Table.Body
                    renderEmptyState={() => (
                      <div className="py-4 text-center text-sm text-muted">Prázdná jízda</div>
                    )}
                  >
                    {jz.vysledky.map((r, i) => (
                      <Table.Row
                        key={r.jezdec_id}
                        id={r.jezdec_id}
                        className={maZasahReditele(r) ? 'bg-warning/[0.05]' : i % 2 ? 'bg-muted/[0.04]' : ''}
                      >
                        <Table.Cell className="tabular-nums font-[620]">
                          <span style={{
                            color: r.poradi && r.poradi <= 3
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
                            {jenCasovaPenalizace(r) ? (
                              <span style={{
                                fontSize: 10, fontWeight: 650,
                                padding: '2px 6px', borderRadius: 99, flexShrink: 0,
                                background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                                color: 'var(--color-primary)'
                              }}>
                                pen.
                              </span>
                            ) : (
                              maZasahReditele(r) && <PenalizaceBadge tooltip={tooltipPenalizace(r)} />
                            )}
                            {r.stav === 'OK' ? (
                              <TimeCell
                                ms={r.namereny_cas_ms}
                                penalizaceMs={r.penalizace_ms}
                                tooltip={jenCasovaPenalizace(r) ? tooltipPenalizace(r) : undefined}
                                onTime={(ms) => void setCas(jz.id, r.jezdec_id, ms)}
                                onStav={(s) => void setStav(jz.id, r.jezdec_id, s)}
                              />
                            ) : (
                              <StatusBadge
                                stav={r.stav}
                                cas={r.namereny_cas_ms}
                                onOpen={(e) => otevriMenu(e, jz.id, r.jezdec_id)}
                              />
                            )}
                            <Caret onOpen={(e) => otevriMenu(e, jz.id, r.jezdec_id)} />
                          </div>
                        </Table.Cell>
                        {!bezBodovani && (
                          <Table.Cell className="text-right">
                            <BodyCell
                              body={r.body}
                              overridden={r.body_rucni != null}
                              onCommit={(val) => void setBody(jz.id, r.jezdec_id, val)}
                            />
                          </Table.Cell>
                        )}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )
      })}

      {menu &&
        createPortal(
          <>
            <div onMouseDown={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
            <div style={{
              position: 'fixed', left: menu.x, top: menu.y, zIndex: 1001,
              minWidth: 140,
              background: 'var(--color-background)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 8,
              boxShadow: '0 4px 20px color-mix(in srgb, var(--color-foreground) 14%, transparent)',
              padding: 4
            }}>
              <MenuItem label="Penalizace ředitele…" onClick={otevriPenalizaci} accent />
              <div style={{ height: 1, margin: '4px 8px', background: 'var(--color-border)' }} />
              <MenuItem label="Čas" onClick={() => vyberZMenu('OK')} />
              <MenuItem label="DNF" onClick={() => vyberZMenu('DNF')} />
              <MenuItem label="DNS" onClick={() => vyberZMenu('DNS')} />
              <MenuItem label="DQ" onClick={() => vyberZMenu('DQ')} />
            </div>
          </>,
          document.body
        )}

      {penalizace && (
        <PenalizaceDialog
          target={penalizace}
          onClose={() => setPenalizace(null)}
          onSaved={() => nacti()}
        />
      )}
    </div>
  )
}

function PenalizaceBadge({ tooltip }: { tooltip: string }): React.JSX.Element {
  return (
    <Tooltip text={tooltip}>
      <span style={{
        fontSize: 10, fontWeight: 650, letterSpacing: 0.2,
        padding: '2px 6px', borderRadius: 99, flexShrink: 0,
        background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
        color: 'var(--color-primary)'
      }}>
        pen.
      </span>
    </Tooltip>
  )
}

interface TimeCellProps {
  ms: number | null
  penalizaceMs?: number
  tooltip?: string
  onTime: (ms: number | null) => void
  onStav: (stav: Stav) => void
}

function TimeCell({ ms, penalizaceMs = 0, tooltip, onTime, onStav }: TimeCellProps): React.JSX.Element {
  const hasPen = penalizaceMs > 0 && ms != null
  const [warn, setWarn] = useState(false)
  const [focused, setFocused] = useState(false)
  const [v, setV] = useState(() => fmtTime(ms))

  useEffect(() => {
    if (focused) return
    if (ms == null) setV('')
    else if (hasPen) setV(fmtTime(ms + penalizaceMs))
    else setV(fmtTime(ms))
    setWarn(false)
  }, [ms, penalizaceMs, focused, hasPen])

  const commit = (): void => {
    setFocused(false)
    const t = v.trim()
    if (t === '') { setWarn(false); onTime(null); return }
    const stav = stavZeZkratky(t)
    if (stav) { setWarn(false); onStav(stav); return }
    const parsed = parseTimeLoose(t)
    if (parsed !== null) { setWarn(false); onTime(parsed); return }
    setWarn(true)
  }

  const border = focused ? 'var(--color-primary)' : warn ? 'var(--color-danger)' : 'transparent'

  const input = (
    <input
      value={v}
      placeholder="mm:ss.sss"
      title={warn ? 'Zadej čas (mm:ss.sss) nebo stav: dnf / dns / dq' : undefined}
      onChange={(e) => { setV(e.target.value); if (warn) setWarn(false) }}
      onFocus={() => { setFocused(true); setV(fmtTime(ms)) }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      style={{
        width: hasPen && !focused ? 128 : 112,
        textAlign: 'right',
        border: `1px solid ${border}`,
        background: focused ? 'var(--color-background)' : 'transparent',
        padding: '4px 6px', borderRadius: 5,
        font: 'inherit', fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        color: warn
          ? 'var(--color-danger)'
          : hasPen && !focused ? 'var(--color-primary)' : 'var(--color-foreground)',
        fontWeight: hasPen && !focused ? 620 : 500,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--color-primary) 28%, transparent)' : 'none'
      }}
    />
  )

  if (tooltip && !focused) return <Tooltip text={tooltip}>{input}</Tooltip>
  return input
}

interface BodyCellProps {
  body: number | null
  overridden: boolean
  onCommit: (v: number | null) => void
}

function BodyCell({ body, overridden, onCommit }: BodyCellProps): React.JSX.Element {
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

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
      <input
        value={v}
        inputMode="numeric"
        title={
          overridden
            ? 'Ručně upravené body (ředitel / přímá úprava) — smaž pole nebo × pro návrat k automatu'
            : 'Body lze ručně přepsat'
        }
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
            : body != null
              ? 'var(--color-foreground)'
              : 'color-mix(in srgb, var(--color-foreground) 35%, transparent)',
          outline: 'none',
          boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--color-primary) 28%, transparent)' : 'none'
        }}
      />
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

function Caret({ onOpen }: { onOpen: (e: React.MouseEvent) => void }): React.JSX.Element {
  return (
    <button
      onClick={onOpen}
      title="Změnit: Čas / DNF / DNS / DQ"
      style={{
        width: 26, height: 22,
        display: 'inline-grid', placeItems: 'center',
        borderRadius: 6, flexShrink: 0,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'color-mix(in srgb, var(--color-foreground) 50%, transparent)',
        font: 'inherit', fontSize: 10
      }}
    >
      ▾
    </button>
  )
}

function StatusBadge({
  stav,
  cas,
  onOpen
}: {
  stav: Exclude<Stav, 'OK'>
  cas: number | null
  onOpen: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const badge = (
    <button
      onClick={onOpen}
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <Chip size="sm" variant="soft" color={stav === 'DNF' ? 'warning' : stav === 'DQ' ? 'danger' : 'default'}>
        {stav}
      </Chip>
    </button>
  )
  return cas != null ? <Tooltip text={`Naměřený čas: ${fmtTime(cas)}`}>{badge}</Tooltip> : badge
}

function MenuItem({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', width: '100%',
        alignItems: 'center', padding: '7px 10px',
        borderRadius: 6,
        background: 'transparent', border: 'none', cursor: 'pointer',
        font: 'inherit', fontSize: 13,
        fontWeight: accent ? 600 : 400,
        color: accent ? 'var(--color-primary)' : 'var(--color-foreground)',
        textAlign: 'left'
      }}
    >
      {label}
    </button>
  )
}
