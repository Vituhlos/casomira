import { Table } from '@heroui/react'
import { fmtTime } from '../lib/time'

interface TimeCellProps {
  casMs: number | null
  /** Penalizace v ms přičtená k naměřenému času (default 0). */
  penalizaceMs?: number
  className?: string
}

/** Buňka tabulky pro zobrazení času — tabular-nums, zarovnání vpravo. */
export function TimeCell({ casMs, penalizaceMs = 0, className }: TimeCellProps): React.JSX.Element {
  const total = casMs != null ? casMs + penalizaceMs : null
  return (
    <Table.Cell className={`text-right tabular-nums ${className ?? ''}`}>
      {total != null ? fmtTime(total) : <span className="text-muted">—</span>}
    </Table.Cell>
  )
}
