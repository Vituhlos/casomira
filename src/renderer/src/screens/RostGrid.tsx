import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Jezdec, KoloTyp, RostKolo, RostNavrh } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { Btn } from '../components/ui'
import { Modal } from '../components/Modal'
import { thStyle, tdStyle } from '../components/table'
import { HK_GENERATE_ROST } from '../lib/hotkeys'

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
  /** Vygeneruje návrh roštu (Q: navrhniRost, SF: navrhSF, F: navrhFinale). */
  navrhFn: (pocetJizd?: number) => Promise<RostNavrh>
  /** Q má volitelný počet jízd; SF/finále mají počet pevný. */
  allowPocetJizd?: boolean
  /** Ukázat sloupec „los" v náhledu generování (Q). */
  showLos?: boolean
  /** Ukázat legendu „odvozená pole" v hlavičce (Q). */
  showLegenda?: boolean
  /** Další ovládací prvky vlevo od tlačítka generovat (např. přepínač velikosti finále). */
  extraControls?: ReactNode
  headSub?: string
  generateLabel?: string
  previewTitle?: string
  previewText?: string
  /** Popisek nad kartou jízdy i v náhledu (např. „1. SF JÍZDA", „STARTOVNÍ ROŠT"). */
  jizdaTitle?: (cislo: number, total: number) => string
  /** Zavolá se po potvrzení generování (parent si může obnovit stav). */
  onChanged?: () => void
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
  onChanged
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
    void window.api.getRosty(kategorieId, typ).then((r) => {
      if (live) applyRost(r)
    })
    return () => {
      live = false
    }
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

  // Klávesová zkratka ⌘/Ctrl+G z hlavního okna spustí generování právě
  // zobrazeného roštu (ref drží nejnovější `generuj`, posluchač jen jeden).
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

  const tlacitkoGeneruj = (
    <Btn variant="primary" icon="sort" onClick={generuj}>
      {generateLabel}
    </Btn>
  )

  return (
    <div>
      <ContentHead title={`Rošty — ${label}`} sub={headSub}>
        {extraControls}
        {showLegenda && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              color: 'var(--text-3)'
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'var(--card-alt)',
                border: '0.5px solid var(--hairline)'
              }}
            />
            odvozená pole
          </span>
        )}
        {tlacitkoGeneruj}
      </ContentHead>

      {zprava && (
        <div
          style={{
            margin: '0 22px 12px',
            padding: '10px 14px',
            borderRadius: 'var(--r-ctrl)',
            background: 'rgba(255,159,10,0.14)',
            color: '#9a6400',
            fontSize: 13
          }}
        >
          {zprava}
        </div>
      )}

      {rost && rost.jizdy.length === 0 && (
        <div style={{ padding: '0 22px 22px', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.5 }}>
          Rošt zatím není vytvořený — klikni na <b>„{generateLabel}"</b> nahoře. Po vygenerování
          ho můžeš ručně upravit (přehodit jezdce / pozice).
        </div>
      )}

      {/* Jízdy pod sebou (jedna na řádek) — stejná šířka i vystředění jako Výsledky. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '0 22px 22px'
        }}
      >
        {(rost?.jizdy ?? []).map((jz) => {
          const filled = jz.sloty.filter((s) => sloty[key(jz.id, s.pozice)]?.jezdec).length
          return (
            <div
              key={jz.id}
              style={{
                background: 'var(--card)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 'var(--r-card)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 15px',
                  borderBottom: '0.5px solid var(--hairline)'
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 620, letterSpacing: '-0.01em' }}>
                  {titulekJizdy(jz.cislo, pocetJizdCelkem)}
                </span>
                <span className="tnum" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                  {filled}/{jz.sloty.length}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 56 }} />
                  <col style={{ width: 92 }} />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, height: 28 }}>Poz.</th>
                    <th style={{ ...thStyle, height: 28 }}>Číslo</th>
                    <th style={{ ...thStyle, height: 28 }}>Jezdec</th>
                    <th style={{ ...thStyle, height: 28 }}>Vůz</th>
                  </tr>
                </thead>
                <tbody>
                  {jz.sloty.map((s) => {
                    const st = sloty[key(jz.id, s.pozice)] ?? {
                      cislo: '',
                      jezdec: null,
                      warn: false,
                      duvod: null
                    }
                    const d = st.jezdec
                    return (
                      <tr key={s.pozice}>
                        <td
                          style={{
                            ...tdStyle,
                            height: 38,
                            color: 'var(--text-3)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 12.5
                          }}
                        >
                          {s.pozice}
                        </td>
                        <td style={{ ...tdStyle, height: 38, padding: '0 9px' }}>
                          <SlotInput
                            value={st.cislo}
                            warn={st.warn}
                            onCommit={(raw) => commit(jz.id, s.pozice, raw)}
                          />
                        </td>
                        <td style={{ ...tdStyle, height: 38 }}>
                          {d ? (
                            <span style={{ color: 'var(--text-3)' }}>
                              <b style={{ color: 'var(--text-2)', fontWeight: 590 }}>{d.prijmeni}</b>{' '}
                              {d.jmeno}
                            </span>
                          ) : st.warn ? (
                            <span style={{ color: '#c93636', fontSize: 12.5 }}>
                              {st.duvod === 'duplicitni' ? 'už v této jízdě' : 'neznámé číslo'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-4)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, height: 38, color: 'var(--text-3)' }}>
                          {d ? (
                            `${d.znacka} ${d.model}`
                          ) : (
                            <span style={{ color: 'var(--text-4)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {navrh && (
        <Modal
          title={previewTitle ?? `Návrh roštu — ${label}`}
          width={560}
          onClose={() => setNavrh(null)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setNavrh(null)}>
                Zrušit
              </Btn>
              <Btn variant="primary" icon="sort" onClick={potvrdGeneraci}>
                {navrh.obsazeno ? 'Přepsat rošt' : 'Vygenerovat'}
              </Btn>
            </>
          }
        >
          {navrh.obsazeno && (
            <div
              style={{
                margin: '0 0 12px',
                padding: '9px 12px',
                borderRadius: 'var(--r-ctrl)',
                background: 'rgba(255,159,10,0.14)',
                color: '#9a6400',
                fontSize: 12.5
              }}
            >
              V tomto roštu už je rozsazení — vygenerování ho přepíše (smaže i zadané výsledky).
            </div>
          )}
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-2)' }}>
            {previewText ?? 'Takto budou jezdci rozsazeni. Po zapsání můžeš rošt ručně upravit.'}
          </p>

          {allowPocetJizd && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '0 0 14px',
                padding: '8px 12px',
                borderRadius: 'var(--r-ctrl)',
                background: 'var(--card-alt)'
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 560 }}>Počet jízd:</span>
              <StepButton label="−" onClick={() => zmenPocet(-1)} disabled={navrh.pocetJizd <= navrh.minJizd} />
              <span className="tnum" style={{ fontWeight: 620, minWidth: 20, textAlign: 'center' }}>
                {navrh.pocetJizd}
              </span>
              <StepButton label="+" onClick={() => zmenPocet(1)} disabled={navrh.pocetJizd >= navrh.maxJizd} />
              <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 'auto' }}>
                max 8 jezdců na jízdu
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {navrh.jizdy.map((jz) => (
              <div
                key={jz.cislo}
                style={{
                  border: '0.5px solid var(--hairline)',
                  borderRadius: 'var(--r-ctrl)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '7px 12px',
                    background: 'var(--card-alt)',
                    fontSize: 12.5,
                    fontWeight: 620,
                    borderBottom: '0.5px solid var(--hairline)'
                  }}
                >
                  {titulekJizdy(jz.cislo, navrh.jizdy.length)}{' '}
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                    · {jz.jezdci.length} jezdců
                  </span>
                </div>
                <div style={{ padding: '6px 12px' }}>
                  {jz.jezdci.map((d, i) => (
                    <div
                      key={d.id}
                      style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '2px 0' }}
                    >
                      <span style={{ color: 'var(--text-4)', width: 18, textAlign: 'right' }}>
                        {i + 1}.
                      </span>
                      <span className="tnum" style={{ width: 44, fontWeight: 600 }}>
                        {d.st_cislo}
                      </span>
                      <span style={{ fontWeight: 560 }}>{d.prijmeni}</span>
                      <span style={{ color: 'var(--text-2)' }}>{d.jmeno}</span>
                      {showLos && (
                        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
                          los {d.los ?? '—'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

function StepButton({
  label,
  onClick,
  disabled
}: {
  label: string
  onClick: () => void
  disabled: boolean
}): React.JSX.Element {
  return (
    <button
      className="btn btn--bezel"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 26,
        height: 26,
        display: 'inline-grid',
        placeItems: 'center',
        borderRadius: 6,
        font: 'inherit',
        fontSize: 16,
        lineHeight: 1
      }}
    >
      {label}
    </button>
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
  const border = focused ? 'var(--accent)' : warn ? '#c93636' : 'transparent'
  return (
    <input
      value={v}
      placeholder="—"
      inputMode="numeric"
      onChange={(e) => setV(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        onCommit(v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      style={{
        width: '100%',
        border: `1px solid ${border}`,
        background: focused ? 'var(--window)' : 'transparent',
        padding: '5px 7px',
        margin: '0 -7px',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        color: warn ? '#c93636' : 'var(--text-1)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}
