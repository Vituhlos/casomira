import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { KoloTyp, Stav, VysledekJizda, VysledekKolo, VysledekRadek } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { PenalizaceDialog, type PenalizaceTarget } from '../components/PenalizaceDialog'
import { Badge, Medal } from '../components/ui'
import { Card, Row, tdStyle, thStyle } from '../components/table'
import { Tooltip } from '../components/Tooltip'
import { fmtTime, parseTimeLoose } from '../lib/time'
import { jizdaNekompletni, radekNekompletni } from '../lib/stav'

interface ResultsProps {
  kategorieId: number
  typ: KoloTyp
  label: string
  /** Další ovládací prvky vpravo v nadpisu (např. přepínač velikosti finále u SF/finále). */
  extraControls?: ReactNode
}

// Rozpozná stav z textu: dnf/dns/dq i jednopísmenné f/s/q (case-insensitive).
function maZasahReditele(r: VysledekRadek): boolean {
  return r.penalizace_ms > 0 || r.body_rucni != null || r.rucni_poradi != null
}

/** Časová penalizace u dojetého jezdce — detail patří k poli času, ne k odznaku. */
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
  if (r.rucni_poradi != null) {
    parts.push(`Posun na ${r.rucni_poradi}. místo`)
  }
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

interface MenuState {
  jizdaId: number
  jezdecId: number
  x: number
  y: number
}

export function Results({ kategorieId, typ, label, extraControls }: ResultsProps): React.JSX.Element {
  const [kolo, setKolo] = useState<VysledekKolo | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [penalizace, setPenalizace] = useState<PenalizaceTarget | null>(null)

  const nacti = (): void => {
    void window.api.getVysledky(kategorieId, typ).then(setKolo)
  }

  useEffect(() => {
    let live = true
    void window.api.getVysledky(kategorieId, typ).then((k) => {
      if (live) setKolo(k)
    })
    const off = window.api.onDataChanged?.(() => {
      if (live) nacti()
    })
    return () => {
      live = false
      off?.()
    }
  }, [kategorieId, typ])

  // Po zápisu přijde přepočtená jízda — vyměníme ji v kole.
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

  const poPenalizaci = (): void => nacti()

  const hlavicky = ['Pořadí', 'St. č.', 'Příjmení', 'Jméno', 'Značka', 'Model', 'Čas', 'Body']
  const prazdne = (kolo?.jizdy ?? []).every((j) => j.vysledky.length === 0)

  return (
    <div>
      <ContentHead
        title={`Výsledky — ${label}`}
        sub="Napiš čas (mm:ss.sss) nebo stav (dnf/dns/dq) · nebo klikni na odznak vpravo"
      >
        {extraControls}
      </ContentHead>

      {prazdne && (
        <div style={{ padding: '0 22px 22px', color: 'var(--text-3)', fontSize: 13 }}>
          Nejprve sestav rošty ({label}) — výsledky se zadávají jezdcům z roštu.
        </div>
      )}

      {(kolo?.jizdy ?? []).map((jz) => {
        const nekompletni = jizdaNekompletni(jz.vysledky)
        return (
        <div key={jz.id} style={{ margin: '0 22px 8px', fontSize: 13, fontWeight: 620 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {jz.cislo}. JÍZDA
            {nekompletni && (
              <span
                title="Někteří jezdci nemají čas ani stav (DNF/DNS/DQ)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 20,
                  padding: '0 8px',
                  borderRadius: 'var(--r-pill)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: 'var(--stav-partial)',
                  background: 'var(--stav-warn-bg)',
                  border: '0.5px solid color-mix(in srgb, var(--stav-partial) 35%, transparent)'
                }}
              >
                nekompletní
              </span>
            )}
          </span>
          <Card
            style={{
              margin: '8px 0 18px',
              ...(nekompletni
                ? { boxShadow: 'inset 3px 0 0 var(--stav-partial)' }
                : {})
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 60 }} />
                <col style={{ width: 64 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 176 }} />
                <col style={{ width: 104 }} />
              </colgroup>
              <thead>
                <tr>
                  {hlavicky.map((h, i) => {
                    // Čas i Body mají vpravo rezervované místo (šipka / křížek),
                    // tak posuneme jejich nadpis o stejně doleva, ať sedí nad hodnotami.
                    const extra = i === 6 ? 32 : i === 7 ? 21 : 0
                    return (
                      <th
                        key={h}
                        style={{ ...thStyle, textAlign: i >= 6 ? 'right' : 'left', paddingRight: 14 + extra }}
                      >
                        {h}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {jz.vysledky.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3)' }}>
                      Prázdná jízda
                    </td>
                  </tr>
                )}
                {jz.vysledky.map((r, i) => (
                  <Row
                    key={r.jezdec_id}
                    i={i}
                    zebra
                    penalized={maZasahReditele(r) || radekNekompletni(r)}
                  >
                    <td
                      style={{
                        ...tdStyle,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 620,
                        color: r.poradi && r.poradi <= 3 ? 'var(--text-1)' : 'var(--text-2)'
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
                      <span className="tnum" style={{ fontWeight: 600 }}>
                        {r.st_cislo}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 590 }}>{r.prijmeni}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-2)' }}>{r.jmeno}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-2)' }}>{r.znacka}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-3)' }}>{r.model}</td>
                    <td style={{ ...tdStyle }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6
                        }}
                      >
                        {jenCasovaPenalizace(r) ? (
                          <span
                            className="penalizace-badge"
                            aria-hidden
                            style={{
                              fontSize: 10,
                              fontWeight: 650,
                              padding: '2px 6px',
                              borderRadius: 99,
                              background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                              color: 'var(--accent-text)',
                              flexShrink: 0
                            }}
                          >
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
                          <span style={{ width: 112, display: 'inline-flex', justifyContent: 'flex-end' }}>
                            <StatusBadge
                              stav={r.stav}
                              cas={r.namereny_cas_ms}
                              onOpen={(e) => otevriMenu(e, jz.id, r.jezdec_id)}
                            />
                          </span>
                        )}
                        <Caret onOpen={(e) => otevriMenu(e, jz.id, r.jezdec_id)} />
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <BodyCell
                        body={r.body}
                        overridden={r.body_rucni != null}
                        onCommit={(val) => void setBody(jz.id, r.jezdec_id, val)}
                      />
                    </td>
                  </Row>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        )
      })}

      {menu &&
        createPortal(
          <>
            <div
              onMouseDown={() => setMenu(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
            />
            <div
              style={{
                position: 'fixed',
                left: menu.x,
                top: menu.y,
                zIndex: 1001,
                minWidth: 140,
                background: 'var(--window)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 'var(--r-ctrl)',
                boxShadow: 'var(--shadow-win)',
                padding: 4
              }}
            >
              <MenuItem label="Penalizace ředitele…" onClick={otevriPenalizaci} accent />
              <div style={{ height: 1, margin: '4px 8px', background: 'var(--hairline)' }} />
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
          onSaved={poPenalizaci}
        />
      )}
    </div>
  )
}

function PenalizaceBadge({ tooltip }: { tooltip: string }): React.JSX.Element {
  return (
    <Tooltip text={tooltip}>
      <span
        className="penalizace-badge"
        style={{
          fontSize: 10,
          fontWeight: 650,
          letterSpacing: 0.2,
          padding: '2px 6px',
          borderRadius: 99,
          background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
          color: 'var(--accent-text)',
          flexShrink: 0
        }}
      >
        pen.
      </span>
    </Tooltip>
  )
}

// --- Pole pro zadání času (přijme i zkratku stavu) ---
interface TimeCellProps {
  ms: number | null
  penalizaceMs?: number
  /** Jednotný tooltip (časová penalizace — bez duplicity u odznaku pen.). */
  tooltip?: string
  onTime: (ms: number | null) => void
  onStav: (stav: Stav) => void
}

function TimeCell({
  ms,
  penalizaceMs = 0,
  tooltip,
  onTime,
  onStav
}: TimeCellProps): React.JSX.Element {
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
    if (t === '') {
      setWarn(false)
      onTime(null)
      return
    }
    const stav = stavZeZkratky(t)
    if (stav) {
      setWarn(false)
      onStav(stav)
      return
    }
    const parsed = parseTimeLoose(t)
    if (parsed !== null) {
      setWarn(false)
      onTime(parsed)
      return
    }
    setWarn(true) // neplatný vstup — text necháme, jen jemně upozorníme
  }

  const border = focused ? 'var(--accent)' : warn ? '#c93636' : 'transparent'
  const inputTitle = warn ? 'Zadej čas (mm:ss.sss) nebo stav: dnf / dns / dq' : undefined

  const input = (
    <input
      value={v}
      placeholder="mm:ss.sss"
      title={inputTitle}
      onChange={(e) => {
        setV(e.target.value)
        if (warn) setWarn(false)
      }}
      onFocus={() => {
        setFocused(true)
        setV(fmtTime(ms))
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      style={{
        width: hasPen && !focused ? 128 : 112,
        textAlign: 'right',
        border: `1px solid ${border}`,
        background: focused ? 'var(--window)' : 'transparent',
        padding: '4px 6px',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        color: warn ? '#c93636' : hasPen && !focused ? 'var(--accent-text)' : 'var(--text-1)',
        fontWeight: hasPen && !focused ? 620 : 500,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none'
      }}
    />
  )

  if (tooltip && !focused) {
    return <Tooltip text={tooltip}>{input}</Tooltip>
  }
  return input
}

// --- Body s možností ručního přepsání (override) ---
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
    // BEZE ZMĚNY (jen klik dovnitř a ven) → nic neměň. Override se NEzapne;
    // body zůstanou automatické a dál se přepočítávají.
    if (t === orig) {
      setV(orig)
      return
    }
    if (t === '') {
      onCommit(null) // smazáno → zrušit override (návrat k automatu)
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isNaN(n)) onCommit(n) // jiná hodnota → zapnout/změnit override
    else setV(orig) // neplatné → vrátit
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
          if (e.key === 'Escape') {
            setV(body != null ? String(body) : '')
            e.currentTarget.blur()
          }
        }}
        style={{
          width: 48,
          textAlign: 'right',
          border: `1px solid ${focused ? 'var(--accent)' : 'transparent'}`,
          background: focused ? 'var(--window)' : 'transparent',
          padding: '3px 5px',
          borderRadius: 5,
          font: 'inherit',
          fontSize: 13.5,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 620,
          color: overridden ? 'var(--accent-text)' : body != null ? 'var(--text-1)' : 'var(--text-3)',
          outline: 'none',
          boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none'
        }}
      />
      {/* Místo pro křížek je rezervované VŽDY (16px), aby zapnutí/vypnutí
          override neposunulo číslo bodů. */}
      <span style={{ width: 16, flexShrink: 0, display: 'inline-flex', justifyContent: 'center' }}>
        {overridden && (
          <Tooltip text="Zrušit ruční úpravu (zpět na automat)">
            <button
              className="override-x"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommit(null)}
              style={{
                width: 16,
                height: 16,
                display: 'inline-grid',
                placeItems: 'center',
                fontSize: 13,
                lineHeight: 1,
                padding: 0
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

// --- Šipka pro otevření nabídky Čas / DNF / DNS / DQ ---
// Stejná u řádku s časem i u řádku se stavem (konzistentní místo i vzhled).
function Caret({ onOpen }: { onOpen: (e: React.MouseEvent) => void }): React.JSX.Element {
  return (
    <button
      className="btn btn--bezel"
      onClick={onOpen}
      title="Změnit: Čas / DNF / DNS / DQ"
      style={{
        width: 26,
        height: 22,
        display: 'inline-grid',
        placeItems: 'center',
        borderRadius: 6,
        color: 'var(--text-2)',
        font: 'inherit',
        fontSize: 10,
        flexShrink: 0
      }}
    >
      ▾
    </button>
  )
}

// --- Barevný odznak stavu (DNF/DNS/DQ) ---
// Klikací (otevře nabídku) + tooltip s naměřeným časem, když byl zadán.
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
    <button className="statbtn" onClick={onOpen}>
      <Badge status={stav} />
    </button>
  )
  return cas != null ? <Tooltip text={`Naměřený čas: ${fmtTime(cas)}`}>{badge}</Tooltip> : badge
}

// --- Položka kontextové nabídky ---
function MenuItem({
  label,
  onClick,
  accent
}: {
  label: string
  onClick: () => void
  accent?: boolean
}): React.JSX.Element {
  return (
    <button
      className="menu-item"
      onClick={onClick}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        padding: '7px 10px',
        borderRadius: 6,
        font: 'inherit',
        fontSize: 13,
        fontWeight: accent ? 600 : 400,
        color: accent ? 'var(--accent-text)' : 'var(--text-1)',
        textAlign: 'left'
      }}
    >
      {label}
    </button>
  )
}
