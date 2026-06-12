import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Jezdec, KoloTyp, RostKolo, RostNavrh } from '@shared/types'
import { Button, Modal, Table } from '@heroui/react'
import { ArrowUpArrowDown } from '@gravity-ui/icons'
import { HK_GENERATE_ROST } from '../lib/hotkeys'
import { safeCall } from '../lib/api'

type SlotDuvod = 'duplicitni' | 'nenalezeno' | null

interface SlotState {
  cislo: string
  jezdec: Jezdec | null
  warn: boolean
  duvod: SlotDuvod
}

const key = (jizdaId: number, pozice: number): string => `${jizdaId}:${pozice}`

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

  useEffect(() => {
    let live = true
    safeCall(
      window.api.getRosty(kategorieId, typ).then((r) => {
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

  const titulekJizdy = jizdaTitle ?? ((c: number): string => `${c}. JÍZDA`)
  const pocetJizdCelkem = rost?.jizdy.length ?? 0

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

  return (
    <div>
      {/* Hlavička */}
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-3 pt-4">
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
        <div className="mx-5 mb-3 rounded-lg bg-warning/10 px-3.5 py-2.5 text-[13px] text-warning-foreground">
          {zprava}
        </div>
      )}

      {/* Prázdný stav */}
      {rost && rost.jizdy.length === 0 && (
        <p className="px-5 pb-5 text-[13px] leading-relaxed text-muted">
          Rošt zatím není vytvořený — klikni na <b>„{generateLabel}"</b> nahoře. Po vygenerování
          ho můžeš ručně upravit.
        </p>
      )}

      {/* Jízdy */}
      <div className="flex flex-col items-center gap-4 px-5 pb-5">
        {(rost?.jizdy ?? []).map((jz) => {
          const filled = jz.sloty.filter((s) => sloty[key(jz.id, s.pozice)]?.jezdec).length
          return (
            <div key={jz.id} className="w-full max-w-[680px] overflow-clip rounded-xl border border-border bg-surface shadow-sm">
              {/* Hlavička jízdy */}
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-[13px] font-[620] tracking-tight">
                  {titulekJizdy(jz.cislo, pocetJizdCelkem)}
                </span>
                <span className="tabular-nums text-[11.5px] text-muted">
                  {filled}/{jz.sloty.length}
                </span>
              </div>

              {/* Tabulka slotů */}
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label={titulekJizdy(jz.cislo, pocetJizdCelkem)}>
                    <Table.Header className="sticky top-0 z-10">
                      <Table.Column isRowHeader style={{ width: 52 }}>Poz.</Table.Column>
                      <Table.Column style={{ width: 88 }}>Číslo</Table.Column>
                      <Table.Column>Jezdec</Table.Column>
                      <Table.Column>Vůz</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {jz.sloty.flatMap((s, idx) => {
                        const st = sloty[key(jz.id, s.pozice)] ?? { cislo: '', jezdec: null, warn: false, duvod: null }
                        const d = st.jezdec
                        const jeNahradnik = finaleVelikost != null && s.pozice > finaleVelikost
                        const prvniNahradnik = jeNahradnik && (idx === 0 || jz.sloty[idx - 1].pozice <= finaleVelikost)
                        const nahradnikPoradi = jeNahradnik ? s.pozice - finaleVelikost : null
                        const rows: React.JSX.Element[] = []
                        if (prvniNahradnik) {
                          rows.push(
                            <Table.Row key={`nahr-head-${s.pozice}`} id={`nahr-${jz.id}-${s.pozice}`} className="bg-default/30">
                              <Table.Cell className="px-3.5 text-[11.5px] font-[620] tracking-widest text-muted" style={{ height: 30 }}>
                                NÁHRADNÍCI
                              </Table.Cell>
                              <Table.Cell style={{ height: 30 }} />
                              <Table.Cell style={{ height: 30 }} />
                              <Table.Cell style={{ height: 30 }} />
                            </Table.Row>
                          )
                        }
                        rows.push(
                          <Table.Row
                            id={s.pozice}
                            key={s.pozice}
                            style={{ opacity: jeNahradnik ? 0.75 : 1 }}
                          >
                            <Table.Cell className="h-[38px] px-3.5 tabular-nums text-[12.5px] text-muted">
                              {jeNahradnik ? `N${nahradnikPoradi}` : s.pozice}
                            </Table.Cell>
                            <Table.Cell className="h-[38px] px-2.5">
                              <SlotInput
                                value={st.cislo}
                                warn={st.warn}
                                onCommit={(raw) => void commit(jz.id, s.pozice, raw)}
                              />
                            </Table.Cell>
                            <Table.Cell className="h-[38px] px-3.5 text-[13px]">
                              {d ? (
                                <span className="text-muted">
                                  <b className="font-[590] text-foreground">{d.prijmeni}</b>{' '}
                                  {d.jmeno}
                                </span>
                              ) : st.warn ? (
                                <span className="text-[12.5px] text-danger">
                                  {st.duvod === 'duplicitni' ? 'už v této jízdě' : 'neznámé číslo'}
                                </span>
                              ) : (
                                <span className="text-muted/50">—</span>
                              )}
                            </Table.Cell>
                            <Table.Cell className="h-[38px] px-3.5 text-[13px] text-muted">
                              {d ? `${d.znacka} ${d.model}` : <span className="text-muted/50">—</span>}
                            </Table.Cell>
                          </Table.Row>
                        )
                        return rows
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          )
        })}
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

                  <div className="flex flex-col gap-3">
                    {navrh.jizdy.map((jz) => {
                      const fv = navrh.finaleVelikost
                      const finaliste = fv != null ? jz.jezdci.slice(0, fv) : jz.jezdci
                      const nahradnici = fv != null ? jz.jezdci.slice(fv) : []
                      const renderRadek = (d: Jezdec, poradi: string, dimmed = false): React.JSX.Element => (
                        <div
                          key={d.id}
                          className="flex gap-2 py-0.5 text-[12.5px]"
                          style={{ opacity: dimmed ? 0.7 : 1 }}
                        >
                          <span className="w-5.5 text-right text-muted">{poradi}</span>
                          <span className="w-11 tabular-nums font-[600]">{d.st_cislo}</span>
                          <span className="font-[560]">{d.prijmeni}</span>
                          <span className="text-muted">{d.jmeno}</span>
                          {showLos && (
                            <span className="ml-auto text-muted">los {d.los ?? '—'}</span>
                          )}
                        </div>
                      )
                      return (
                        <div key={jz.cislo} className="overflow-clip rounded-lg border border-border">
                          <div className="border-b border-border bg-default/30 px-3 py-1.5 text-[12.5px] font-[620]">
                            {titulekJizdy(jz.cislo, navrh.jizdy.length)}{' '}
                            <span className="font-normal text-muted">· {finaliste.length} jezdců</span>
                          </div>
                          <div className="px-3 py-1.5">
                            {finaliste.map((d, i) => renderRadek(d, `${i + 1}.`))}
                          </div>
                          {nahradnici.length > 0 && (
                            <>
                              <div className="border-t border-border bg-default/30 px-3 py-1 text-[11.5px] font-[620] tracking-widest text-muted">
                                NÁHRADNÍCI
                              </div>
                              <div className="px-3 py-1.5">
                                {nahradnici.map((d, i) => renderRadek(d, `N${i + 1}.`, true))}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
  onCommit: (raw: string) => void
}

function SlotInput({ value, warn, onCommit }: SlotInputProps): React.JSX.Element {
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
