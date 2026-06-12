import { useEffect, useState } from 'react'

interface EditableCellProps {
  value: string | number | null
  onCommit: (raw: string) => Promise<boolean>
  align?: 'left' | 'right'
  num?: boolean
  placeholder?: string
  weight?: number
}

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

  const border = focused ? 'var(--color-primary)' : warn ? '#c93636' : 'transparent'
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
        background: focused ? 'var(--color-background)' : 'transparent',
        padding: '5px 7px',
        margin: '0 -7px',
        borderRadius: 5,
        font: 'inherit',
        fontSize: 13,
        fontVariantNumeric: num ? 'tabular-nums' : 'normal',
        textAlign: align,
        color: warn ? '#c93636' : 'var(--color-foreground)',
        fontWeight: weight ?? 400,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3.5px color-mix(in srgb, var(--color-primary) 28%, transparent)' : 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}
