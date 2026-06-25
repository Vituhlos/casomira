import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Jezdec, KoloTyp, RostKolo, RostNavrh } from '@shared/types'
import { useAtomicReveal } from '../hooks/useAtomicReveal'
import { Button, Modal, Table } from '@heroui/react'
import { ArrowUpArrowDown } from '@gravity-ui/icons'
import { HK_GENERATE_ROST } from '../lib/hotkeys'
import { safeCall } from '../lib/api'
import { consumePreload } from '../lib/preload'

type SlotDuvod = 'duplicitni' | 'nenalezeno' | null

interface SlotState {
  cislo: string
  jezdec: Jezdec | null
  warn: boolean
  duvod: SlotDuvod
}

type RostTableRow = RostSlotTableRow | RostDividerRow

interface RostSlotTableRow {
  kind: 'slot'
  id: string
  jizdaId: number
  jizdaLabel: string
  pozice: number
  poziceLabel: string
  nahradnik: boolean
  slot: SlotState
}

interface RostDividerRow {
  kind: 'divider'
  id: string
  label: string
}

interface RostJizdaTable {
  id: number
  label: string
  filled: number
  total: number
  rows: RostTableRow[]
}

interface NavrhTableRow {
  id: string
  jizdaLabel: string
  poziceLabel: string
  jezdec: Jezdec
  nahradnik: boolean
}

const key = (jizdaId: number, pozice: number): string => `${jizdaId}:${pozice}`
const prazdnySlot: SlotState = { cislo: '', jezdec: null, warn: false, duvod: null }

function slotyZRostu(r: RostKolo): Record<string, SlotState> {
  const m: Record<string, SlotState> = {}
  for (const jz of r.jizdy)
    for (const s of jz.sloty)
      m[key(jz.id, s.pozice)] = {
        cislo: s.jezdec?.st_cislo != null ? String(s.jezdec.st_cislo) : '',
        jezdec: s.jezdec,
        warn: false,
        duvod: null
      }
  return m
}

function formatVuz(d: Jezdec | null): ReactNode {
  if (!d) return <span className="text-muted/50">—</span>
  return [d.znacka, d.model].filter(Boolean).join(' ') || <span className="text-muted/50">—</span>
}

function navrhDoTabulky(
  navrh: RostNavrh,
  titulekJizdy: (cislo: number, total: number) => string
): NavrhTableRow[] {
  return navrh.jizdy.flatMap((jz) =>
    jz.jezdci.map((d, i) => {
      const nahradnik = navrh.finaleVelikost != null && i >= navrh.finaleVelikost
      const nahradnikPoradi = navrh.finaleVelikost != null ? i - navrh.finaleVelikost + 1 : null
      return {
        id: `${jz.cislo}:${d.id}:${i}`,
        jizdaLabel: titulekJizdy(jz.cislo, navrh.jizdy.length),
        poziceLabel: nahradnik && nahradnikPoradi != null ? `N${nahradnikPoradi}` : String(i + 1),
        jezdec: d,
        nahradnik
      }
    })
  )
}

interface RostGridProps {
  kategorieId: number
  typ: KoloTyp
  label: string
  navrhFn: (pocetJizd?: number) => Promise<RostNavrh>
  allowPocetJizd?: boolean
  showLos?: boolean
  showLegenda?: boolean
  extraControls?: ReactNode
  headSub?: string
  generateLabel?: string
  previewTitle?: string
  previewText?: string
  jizdaTitle?: (cislo: number, total: number) => string
  onChanged?: () => void
  finaleVelikost?: number
}

export function RostGrid({
  kategorieId,
  typ,
  label,
  navrhFn,
  allowPocetJizd = false,
  showLos = false,
  showLegenda = false,
  extraControls,
  headSub,
  generateLabel = 'Vygenerovat rošt',
  previewTitle,
  previewText,
  jizdaTitle,
  onChanged,
  finaleVelikost
}: RostGridProps): React.JSX.Element {
  const [rost, setRost] = useState<RostKolo | null>(null)
  const [sloty, setSloty] = useState<Record<string, SlotState>>({})
  const [navrh, setNavrh] = useState<RostNavrh | null>(null)
  const [zprava, setZprava] = useState<string | null>(null)

  const applyRost = (r: RostKolo): void => {
    setRost(r)
    setSloty(slotyZRostu(r))
  }

  // Čeká jeden RAF po načtení dat — nechá HeroUI Table neviditelně dokončit
  // svůj 2-fázový interní render, pak atomicky odkryje hotový obsah.
  const shown = useAtomicReveal(rost !== null)

  useEffect(() => {
    let live = true
    const p = consumePreload<RostKolo>(`${kategorieId}:${typ}:rost`)
    safeCall(
      (p ?? window.api.getRosty(kategorieId, typ)).then((r) => {
        if (live) applyRost(r)
      }),
      (msg) => { if (live) setZprava(`Nepodařilo se načíst rošt: ${msg}`) }
    )
    return () => { live = false }
  }, [kategorieId, typ])

  useEffect(() => {
    if (!zprava) return
    const t = setTimeout(() => setZprava(null), 5000)
    return () => clearTimeout(t)
  }, [zprava])

  const titulekJizdy = useMemo(
    () => jizdaTitle ?? ((c: number): string => `${c}. JÍZDA`),
    [jizdaTitle]
  )

  const commit = async (jizdaId: number, pozice: number, raw: string): Promise<void> => {
    const trimmed = raw.trim()
    const parsed = trimmed === '' ? null : Number.parseInt(trimmed, 10)
    const valid = parsed !== null && !Number.isNaN(parsed)
    const res = await window.api.setRostSlot(jizdaId, pozice, valid ? parsed : null)
    const warn = trimmed !== '' && (!valid || !res.ok)
    const duvod: SlotDuvod = warn ? (res.duplicitni ? 'duplicitni' : 'nenalezeno') : null
    if (res.duplicitni) {
      setZprava(`Startovní číslo ${parsed} už je v této jízdě — jezdec nemůže být dvakrát.`)
    }
    setSloty((prev) => ({
      ...prev,
      [key(jizdaId, pozice)]: { cislo: trimmed, jezdec: res.jezdec, warn, duvod }
    }))
  }

  const generuj = async (): Promise<void> => {
    const n = await navrhFn()
    if (!n.ok) {
      setZprava(n.chyba ?? 'Rošt nelze vygenerovat.')
      return
    }
    setNavrh(n)
  }

  const generujRef = useRef(generuj)
  generujRef.current = generuj
  useEffect(() => {
    const onGen = (): void => void generujRef.current()
    window.addEventListener(HK_GENERATE_ROST, onGen)
    return () => window.removeEventListener(HK_GENERATE_ROST, onGen)
  }, [])

  const zmenPocet = async (delta: number): Promise<void> => {
    if (!navrh) return
    const cil = navrh.pocetJizd + delta
    if (cil < navrh.minJizd || cil > navrh.maxJizd) return
    const n = await navrhFn(cil)
    if (n.ok) setNavrh(n)
  }

  const potvrdGeneraci = async (): Promise<void> => {
    if (!navrh) return
    const r = await window.api.zapisRost(
      kategorieId,
      typ,
      navrh.jizdy.map((j) => ({ cislo: j.cislo, jezdecIds: j.jezdci.map((d) => d.id) }))
    )
    applyRost(r)
    setNavrh(null)
    onChanged?.()
  }

  const rostTabulky = useMemo<RostJizdaTable[]>(() => {
    const pocetJizdCelkem = rost?.jizdy.length ?? 0
    return (rost?.jizdy ?? []).map((jz) => {
      const filled = jz.sloty.filter((s) => sloty[key(jz.id, s.pozice)]?.jezdec).length
      const jizdaLabel = titulekJizdy(jz.cislo, pocetJizdCelkem)

      return {
        id: jz.id,
        label: jizdaLabel,
        filled,
        total: jz.sloty.length,
        rows: jz.sloty.flatMap((s, index) => {
          const nahradnik = finaleVelikost != null && s.pozice > finaleVelikost
          const prvniNahradnik =
            nahradnik && finaleVelikost != null && (index === 0 || jz.sloty[index - 1].pozice <= finaleVelikost)
          const nahradnikPoradi = nahradnik && finaleVelikost != null ? s.pozice - finaleVelikost : null
          const row: RostSlotTableRow = {
            kind: 'slot',
            id: `${jz.id}:${s.pozice}`,
            jizdaId: jz.id,
            jizdaLabel,
            pozice: s.pozice,
            poziceLabel: nahradnik && nahradnikPoradi != null ? `N${nahradnikPoradi}` : String(s.pozice),
            nahradnik,
            slot: sloty[key(jz.id, s.pozice)] ?? prazdnySlot
          }
          return prvniNahradnik ? [{ kind: 'divider', id: `${jz.id}:nahradnici`, label: 'NÁHRADNÍCI' }, row] : [row]
        })
      }
    })
  }, [rost, sloty, titulekJizdy, finaleVelikost])

  const navrhRadky = useMemo(
    () => navrh ? navrhDoTabulky(navrh, titulekJizdy) : [],
    [navrh, titulekJizdy]
  )

  return (
    <div className="race-table-screen rost-screen">
      {/* Hlavička */}
      <div className="rost-shell">
        <div className="rost-header flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-[680] tracking-tight">Rošty — {label}</h2>
            {headSub && <p className="mt-0.5 text-[12.5px] text-muted">{headSub}</p>}
          </div>
          <div className="flex items-center gap-2">
            {extraControls}
            {showLegenda && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                <span className="inline-block size-2.5 rounded-sm border border-border bg-default" />
                odvozená pole
              </span>
            )}
            <Button size="sm" onPress={() => void generuj()}>
              <ArrowUpArrowDown width={13} height={13} />
              {generateLabel}
            </Button>
          </div>
        </div>

        {/* Zpráva (chyba / upozornění) */}
        {zprava && (
          <div className="rost-message rounded-lg bg-warning/10 px-3.5 py-2.5 text-[13px] text-warning-foreground">
            {zprava}
          </div>
        )}
      </div>

      {/* Rošt */}
      <div className="rost-table-wrap">
        <div className="heat-table-body-shell" style={{ position: 'relative' }}>
          {rost == null ? (
            <div className="rost-empty-state text-sm text-muted">Načítám rošt…</div>
          ) : rostTabulky.length === 0 ? (
            <div className="rost-empty-state text-sm text-muted">
              Rošt zatím není vytvořený — klikni na <b>„{generateLabel}"</b> nahoře.
              Po vygenerování ho můžeš ručně upravit.
            </div>
          ) : (
            <>
              <div style={{ opacity: shown ? 1 : 0, pointerEvents: shown ? undefined : 'none' }}>
                <div className="rost-jizdy-stack">
              {rostTabulky.map((jizda) => (
                <section key={jizda.id} className="rost-jizda-section">
                  <div className="rost-jizda-heading">
                    <h3 id={`rost-jizda-${jizda.id}`}>{jizda.label}</h3>
                    <span className="tabular-nums">{jizda.filled}/{jizda.total}</span>
                  </div>
                  <Table className="rost-jizda-table-root">
                    <Table.ScrollContainer className="rost-jizda-table-scroll">
                      <Table.Content aria-labelledby={`rost-jizda-${jizda.id}`}>
                        <Table.Header>
                          <Table.Column isRowHeader style={{ width: 72 }}>Poz.</Table.Column>
                          <Table.Column style={{ width: 96 }}>Číslo</Table.Column>
                          <Table.Column>Jezdec</Table.Column>
                          <Table.Column>Vůz</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {jizda.rows.map((row) => {
                            if (row.kind === 'divider') {
                              return (
                                <Table.Row key={row.id} id={row.id} className="heat-divider-row bg-default/30">
                                  <Table.Cell className="h-[30px] px-3.5 text-[11.5px] font-[620] tracking-widest text-muted">
                                    {row.label}
                                  </Table.Cell>
                                  <Table.Cell className="h-[30px]" />
                                  <Table.Cell className="h-[30px]" />
                                  <Table.Cell className="h-[30px]" />
                                </Table.Row>
                              )
                            }

                            const d = row.slot.jezdec
                            return (
                              <Table.Row key={row.id} id={row.id} style={{ opacity: row.nahradnik ? 0.75 : 1 }}>
                                <Table.Cell className="h-[42px] px-3.5 tabular-nums text-[12.5px] text-muted">
                                  {row.poziceLabel}
                                </Table.Cell>
                                <Table.Cell className="h-[42px] px-2.5">
                                  <SlotInput
                                    value={row.slot.cislo}
                                    warn={row.slot.warn}
                                    ariaLabel={`Startovní číslo: ${row.jizdaLabel}, pozice ${row.poziceLabel}`}
                                    onCommit={(raw) => void commit(row.jizdaId, row.pozice, raw)}
                                  />
                                </Table.Cell>
                                <Table.Cell className="h-[42px] px-3.5 text-[13px]">
                                  {d ? (
                                    <span className="text-muted">
                                      <b className="font-[590] text-foreground">{d.prijmeni}</b> {d.jmeno}
                                    </span>
                                  ) : row.slot.warn ? (
                                    <span className="text-[12.5px] text-danger">
                                      {row.slot.duvod === 'duplicitni' ? 'už v této jízdě' : 'neznámé číslo'}
                                    </span>
                                  ) : (
                                    <span className="text-muted/50">—</span>
                                  )}
                                </Table.Cell>
                                <Table.Cell className="h-[42px] px-3.5 text-[13px] text-muted">
                                  {formatVuz(d)}
                                </Table.Cell>
                              </Table.Row>
                            )
                          })}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </section>
              ))}
                </div>
              </div>
              {!shown && (
                <div
                  className="rost-empty-state text-sm text-muted"
                  style={{ position: 'absolute', inset: 0 }}
                  aria-hidden
                >
                  Načítám rošt…
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Návrh roštu — modal */}
      {navrh && (
        <Modal>
          <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) setNavrh(null) }}>
            <Modal.Container>
              <Modal.Dialog className="w-[560px] max-w-[calc(100vw-2rem)]">
                <Modal.Header>
                  <span className="text-base font-semibold">
                    {previewTitle ?? `Návrh roštu — ${label}`}
                  </span>
                </Modal.Header>

                <Modal.Body>
                  {navrh.obsazeno && (
                    <div className="mb-3 rounded-lg bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning-foreground">
                      V tomto roštu už je rozsazení — vygenerování ho přepíše (smaže i zadané výsledky).
                    </div>
                  )}

                  <p className="mb-3 text-[12.5px] text-muted">
                    {previewText ?? 'Takto budou jezdci rozsazeni. Po zapsání můžeš rošt ručně upravit.'}
                  </p>

                  {allowPocetJizd && (
                    <div className="mb-3.5 flex items-center gap-2.5 rounded-lg bg-default/30 px-3 py-2">
                      <span className="text-[12.5px] font-[560]">Počet jízd:</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        isIconOnly
                        isDisabled={navrh.pocetJizd <= navrh.minJizd}
                        onPress={() => void zmenPocet(-1)}
                        aria-label="Méně jízd"
                      >
                        −
                      </Button>
                      <span className="min-w-5 text-center tabular-nums font-[620]">
                        {navrh.pocetJizd}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        isIconOnly
                        isDisabled={navrh.pocetJizd >= navrh.maxJizd}
                        onPress={() => void zmenPocet(1)}
                        aria-label="Více jízd"
                      >
                        +
                      </Button>
                      <span className="ml-auto text-[11.5px] text-muted">max 8 jezdců na jízdu</span>
                    </div>
                  )}

                  <Table>
                    <Table.ScrollContainer>
                      <Table.Content aria-label={previewTitle ?? `Návrh roštu — ${label}`}>
                        <Table.Header>
                          <Table.Column isRowHeader style={{ width: 128 }}>Jízda</Table.Column>
                          <Table.Column style={{ width: 72 }}>Poz.</Table.Column>
                          <Table.Column style={{ width: 86 }}>St. č.</Table.Column>
                          <Table.Column>Jezdec</Table.Column>
                          {showLos && <Table.Column className="text-right">Los</Table.Column>}
                        </Table.Header>
                        <Table.Body>
                          {navrhRadky.map((row) => (
                            <Table.Row key={row.id} id={row.id} style={{ opacity: row.nahradnik ? 0.7 : 1 }}>
                              <Table.Cell className="h-[38px] px-3.5 text-[13px] font-[620]">
                                {row.jizdaLabel}
                              </Table.Cell>
                              <Table.Cell className="h-[38px] px-3.5 tabular-nums text-muted">
                                {row.poziceLabel}
                              </Table.Cell>
                              <Table.Cell className="h-[38px] px-3.5 tabular-nums font-[600]">
                                {row.jezdec.st_cislo ?? '—'}
                              </Table.Cell>
                              <Table.Cell className="h-[38px] px-3.5 text-[13px]">
                                <span className="font-[560]">{row.jezdec.prijmeni}</span>{' '}
                                <span className="text-muted">{row.jezdec.jmeno}</span>
                              </Table.Cell>
                              {showLos && (
                                <Table.Cell className="h-[38px] px-3.5 text-right tabular-nums text-muted">
                                  {row.jezdec.los ?? '—'}
                                </Table.Cell>
                              )}
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </Modal.Body>

                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="secondary" onPress={() => setNavrh(null)}>
                    Zrušit
                  </Button>
                  <Button onPress={() => void potvrdGeneraci()}>
                    <ArrowUpArrowDown width={13} height={13} />
                    {navrh.obsazeno ? 'Přepsat rošt' : 'Vygenerovat'}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  )
}

interface SlotInputProps {
  value: string
  warn: boolean
  ariaLabel: string
  onCommit: (raw: string) => void
}

function SlotInput({ value, warn, ariaLabel, onCommit }: SlotInputProps): React.JSX.Element {
  const [v, setV] = useState(value)
  const [focused, setFocused] = useState(false)
  useEffect(() => setV(value), [value])

  const borderColor = focused
    ? 'var(--color-primary)'
    : warn
      ? 'var(--color-danger)'
      : 'transparent'

  return (
    <input
      aria-label={ariaLabel}
      value={v}
      placeholder="—"
      inputMode="numeric"
      onChange={(e) => setV(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); onCommit(v) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      style={{
        width: '100%',
        border: `1px solid ${borderColor}`,
        background: focused ? 'var(--color-background)' : 'transparent',
        padding: '5px 7px',
        margin: '0 -7px',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        color: warn ? 'var(--color-danger)' : 'var(--color-foreground)',
        outline: 'none',
        boxShadow: focused
          ? '0 0 0 3.5px color-mix(in srgb, var(--color-primary) 28%, transparent)'
          : 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}
