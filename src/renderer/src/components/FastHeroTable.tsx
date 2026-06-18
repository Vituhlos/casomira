import React, { memo, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FastHeroColumn<T> {
  id: string
  header: React.ReactNode
  render: (row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
  cellStyle?: React.CSSProperties
  allowsSorting?: boolean
  align?: 'start' | 'end' | 'center'
}

export interface FastHeroSortDescriptor {
  column: string
  direction: 'ascending' | 'descending'
}

export interface FastHeroTableProps<T> {
  rows: T[]
  columns: FastHeroColumn<T>[]
  getRowKey: (row: T) => string | number
  variant?: 'primary' | 'secondary'
  ariaLabel?: string
  className?: string
  /** Přidá position:sticky na thead — použij pokud je tabulka ve scrollovatelném containeru. */
  stickyHeader?: boolean
  rowClassName?: (row: T, index: number) => string | undefined
  onRowPress?: (row: T) => void
  sortDescriptor?: FastHeroSortDescriptor
  onSortChange?: (descriptor: FastHeroSortDescriptor) => void
}

// ---------------------------------------------------------------------------
// Sort indicator — chevron trojúhelník, otočí se pro descending přes CSS
// ---------------------------------------------------------------------------

function SortIndicator({ direction }: { direction: 'ascending' | 'descending' }) {
  return (
    <svg
      className="table__sortable-column-indicator"
      data-direction={direction}
      viewBox="0 0 12 12"
      width={12}
      height={12}
      aria-hidden="true"
    >
      <path d="M6 3 L10.5 9 L1.5 9 Z" fill="currentColor" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Row — interní, typováno jako `any` protože React.memo nepreservuje generiky.
// Typová bezpečnost se vynucuje na úrovni FastHeroTable<T>.
// ---------------------------------------------------------------------------

interface AnyRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any
  index: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: FastHeroColumn<any>[]
  className?: string
  interactive: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowPress?: (row: any) => void
}

// memo zde je klíčový — pokud se `row` objekt nezměnil (stejná reference),
// React přeskočí render celého řádku i všech jeho child komponent.
const FastHeroTableRow = memo(function FastHeroTableRowInner({
  row,
  index,
  columns,
  className,
  interactive,
  onRowPress,
}: AnyRowProps): React.JSX.Element {
  return (
    <tr
      className={`table__row${className ? ` ${className}` : ''}`}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onRowPress?.(row) : undefined}
      onKeyDown={
        interactive
          ? (e: React.KeyboardEvent<HTMLTableRowElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onRowPress?.(row)
              }
            }
          : undefined
      }
      style={interactive ? { cursor: 'pointer' } : undefined}
    >
      {columns.map((col) => {
        const alignStyle: React.CSSProperties | undefined = col.align
          ? { textAlign: col.align === 'start' ? 'left' : col.align === 'end' ? 'right' : 'center' }
          : undefined
        const cellStyle =
          col.cellStyle || alignStyle
            ? { ...col.cellStyle, ...alignStyle }
            : undefined
        return (
          <td
            key={col.id}
            className={`table__cell${col.className ? ` ${col.className}` : ''}`}
            style={cellStyle}
          >
            {col.render(row, index)}
          </td>
        )
      })}
    </tr>
  )
})

// ---------------------------------------------------------------------------
// FastHeroTable<T> — veřejná komponenta
//
// Design notes:
// - Nepoužívá @heroui/react Table ani React Aria Components Collection.
// - Žádný useState/useEffect který by spouštěl druhý commit po renderu.
// - table__scroll-container záměrně vynechán: overflow-x:auto by implicitně
//   nastavilo overflow-y:auto a rozbilo by sticky header v StopkyApp.
//   Horizontální scroll zajistí caller nebo parent container.
// ---------------------------------------------------------------------------

export function FastHeroTable<T>({
  rows,
  columns,
  getRowKey,
  variant = 'secondary',
  ariaLabel,
  className,
  stickyHeader = false,
  rowClassName,
  onRowPress,
  sortDescriptor,
  onSortChange,
}: FastHeroTableProps<T>): React.JSX.Element {
  const interactive = onRowPress != null

  const handleColumnSort = useCallback(
    (colId: string) => {
      if (!onSortChange) return
      onSortChange({
        column: colId,
        direction:
          sortDescriptor?.column === colId && sortDescriptor.direction === 'ascending'
            ? 'descending'
            : 'ascending',
      })
    },
    [onSortChange, sortDescriptor],
  )

  return (
    <div className={`table-root table-root--${variant}`}>
      <table
        className={`table__content${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel}
      >
        <thead
          className="table__header"
          style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className={`table__column${col.headerClassName ? ` ${col.headerClassName}` : ''}`}
                data-allows-sorting={col.allowsSorting ? 'true' : undefined}
                onClick={col.allowsSorting ? () => handleColumnSort(col.id) : undefined}
                style={
                  col.align
                    ? {
                        textAlign:
                          col.align === 'start'
                            ? 'left'
                            : col.align === 'end'
                              ? 'right'
                              : 'center',
                      }
                    : undefined
                }
              >
                {col.allowsSorting ? (
                  <div className="table__sortable-column-header">
                    {col.header}
                    {sortDescriptor?.column === col.id && (
                      <SortIndicator direction={sortDescriptor.direction} />
                    )}
                  </div>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {rows.map((row, index) => (
            <FastHeroTableRow
              key={getRowKey(row)}
              row={row}
              index={index}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              columns={columns as FastHeroColumn<any>[]}
              className={rowClassName?.(row, index)}
              interactive={interactive}
              onRowPress={onRowPress as ((row: unknown) => void) | undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
