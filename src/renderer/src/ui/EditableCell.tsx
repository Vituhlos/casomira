import { useState } from 'react'
import { Input, Table } from '@heroui/react'
import { fmtTime, parseTimeLoose } from '../lib/time'

interface EditableCellProps {
  casMs: number | null
  onCommit: (ms: number | null) => void
  className?: string
}

/**
 * Editovatelná buňka tabulky pro zadání času.
 * Enter / blur potvrdí, Esc vrátí původní hodnotu.
 * Špatný formát zvýrazní vstup červeně — hodnota se neuloží dokud není platná.
 * Prázdný vstup = null (čas nezadán).
 */
export function EditableCell({ casMs, onCommit, className }: EditableCellProps): React.JSX.Element {
  const [text, setText] = useState(casMs == null ? '' : fmtTime(casMs))
  const [warn, setWarn] = useState(false)

  const commit = (): void => {
    if (text.trim() === '') {
      onCommit(null)
      setWarn(false)
      return
    }
    const ms = parseTimeLoose(text)
    if (ms == null) {
      setWarn(true)
      return
    }
    onCommit(ms)
    setText(fmtTime(ms))
    setWarn(false)
  }

  return (
    <Table.Cell className={className}>
      <Input
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (warn) setWarn(false)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setText(casMs == null ? '' : fmtTime(casMs))
            setWarn(false)
            e.currentTarget.blur()
          }
        }}
        placeholder="m:ss.fff"
        className={`max-w-28 text-right tabular-nums ${warn ? 'text-danger' : ''}`}
      />
    </Table.Cell>
  )
}
