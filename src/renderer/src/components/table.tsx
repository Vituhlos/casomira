import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// Inset karta s jemně zaoblenými rohy (CLAUDE.md §2c).
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }): React.JSX.Element {
  return (
    <div
      style={{
        margin: '0 22px 22px',
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--r-card)',
        overflow: 'clip',
        boxShadow: 'var(--shadow-card)',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// Styl hlavičky a buňky (sticky hlavička, jemné linky).
export const thStyle: CSSProperties = {
  position: 'sticky',
  top: 'var(--thead-top, 0px)' as unknown as number,
  zIndex: 1,
  textAlign: 'left',
  padding: '0 14px',
  height: 32,
  background: 'var(--surface)',
  borderBottom: '0.5px solid var(--border)',
  color: 'var(--muted)',
  fontSize: 11.5,
  fontWeight: 510,
  whiteSpace: 'nowrap'
}

export const tdStyle: CSSProperties = {
  padding: '0 14px',
  height: 38,
  borderBottom: '0.5px solid var(--separator)',
  fontSize: 13,
  color: 'var(--foreground)',
  verticalAlign: 'middle'
}

// Řádek se zvýrazněním při najetí myší a volitelnou zebrou.
export function Row({
  children,
  i,
  zebra,
  penalized
}: {
  children: ReactNode
  i: number
  zebra?: boolean
  /** Zásah ředitele (časová/bodová/posun) — jemné zvýraznění řádku. */
  penalized?: boolean
}): React.JSX.Element {
  // Pouze jedna bg třída najednou; hover má vyšší specificitu (pseudo-class), takže ho vždy přebije.
  let bgCls = ''
  if (penalized) bgCls = 'bg-[color-mix(in_srgb,var(--stav-warn-bg)_60%,transparent)]'
  else if (zebra && i % 2) bgCls = 'bg-[var(--surface-secondary)]'

  const cls = [
    'group',
    'transition-colors duration-[80ms]',
    bgCls,
    'hover:bg-black/[.04] dark:hover:bg-white/[.05]'
  ].filter(Boolean).join(' ')

  return <tr className={cls}>{children}</tr>
}

interface EditableCellProps {
  value: string | number | null
  /** Vrátí true při uložení, false při odmítnutí (kolize) — buňka se pak označí. */
  onCommit: (raw: string) => Promise<boolean>
  align?: 'left' | 'right'
  num?: boolean
  placeholder?: string
  weight?: number
}

// Inline editace buňky: Enter (nebo opuštění) potvrdí, Esc vrátí původní hodnotu.
// Když DB hodnotu odmítne (duplicitní číslo/los), buňka zčervená a hodnota se neuloží.
export function EditableCell({
  value,
  onCommit,
  align = 'left',
  num,
  placeholder,
  weight
}: EditableCellProps): React.JSX.Element {
  const [v, setV] = useState(value ?? '')
  const [focused, setFocused] = useState(false)
  const [warn, setWarn] = useState(false)
  useEffect(() => {
    setV(value ?? '')
    setWarn(false)
  }, [value])

  const commit = async (): Promise<void> => {
    setFocused(false)
    const ok = await onCommit(String(v))
    setWarn(!ok)
  }

  const border = focused ? 'var(--accent)' : warn ? 'var(--danger)' : 'transparent'
  return (
    <input
      value={v}
      placeholder={placeholder}
      title={warn ? 'Hodnota se neuložila (kolize) — oprav ji' : undefined}
      onChange={(e) => {
        setV(e.target.value)
        if (warn) setWarn(false)
      }}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setV(value ?? '')
          setWarn(false)
          e.currentTarget.blur()
        }
      }}
      style={{
        width: '100%',
        border: `1px solid ${border}`,
        background: focused ? 'var(--background)' : 'transparent',
        padding: '5px 7px',
        margin: '0 -7px',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 13,
        fontVariantNumeric: num ? 'tabular-nums' : 'normal',
        textAlign: align,
        color: warn ? 'var(--danger)' : 'var(--foreground)',
        fontWeight: weight ?? 400,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}
