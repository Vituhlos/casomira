// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { FastHeroTable, type FastHeroColumn } from './FastHeroTable'

interface TestRow {
  id: number
  name: string
  value: number
}

const makeRows = (n: number): TestRow[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, value: i * 10 }))

const columns: FastHeroColumn<TestRow>[] = [
  { id: 'name', header: 'Name', render: (r) => r.name },
  { id: 'value', header: 'Value', render: (r) => String(r.value), align: 'end' },
  { id: 'sort-col', header: 'Sortable', render: (r) => r.id, allowsSorting: true },
]

const getKey = (r: TestRow) => r.id

describe('FastHeroTable', () => {
  afterEach(cleanup)

  describe('DOM structure & HeroUI classes', () => {
    it('renders table-root with variant class', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(3)} columns={columns} getRowKey={getKey} variant="secondary" />,
      )
      expect(container.querySelector('.table-root.table-root--secondary')).toBeTruthy()
    })

    it('renders table-root--primary when variant=primary', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} variant="primary" />,
      )
      expect(container.querySelector('.table-root--primary')).toBeTruthy()
    })

    it('renders table__content, table__header, table__body', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(2)} columns={columns} getRowKey={getKey} />,
      )
      expect(container.querySelector('table.table__content')).toBeTruthy()
      expect(container.querySelector('thead.table__header')).toBeTruthy()
      expect(container.querySelector('tbody.table__body')).toBeTruthy()
    })

    it('renders column headers with table__column class', () => {
      render(<FastHeroTable rows={[]} columns={columns} getRowKey={getKey} />)
      expect(screen.getByText('Name').closest('th')?.classList.contains('table__column')).toBe(true)
      expect(screen.getByText('Value').closest('th')?.classList.contains('table__column')).toBe(true)
    })

    it('renders rows with table__row and cells with table__cell', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(2)} columns={columns} getRowKey={getKey} />,
      )
      const rows = container.querySelectorAll('tr.table__row')
      expect(rows).toHaveLength(2)
      rows.forEach((row) => {
        expect(row.querySelectorAll('td.table__cell')).toHaveLength(columns.length)
      })
    })

    it('applies aria-label to table element', () => {
      render(
        <FastHeroTable
          rows={[]}
          columns={columns}
          getRowKey={getKey}
          ariaLabel="Test table"
        />,
      )
      expect(screen.getByRole('table', { name: 'Test table' })).toBeTruthy()
    })

    it('applies extra className to table__content', () => {
      const { container } = render(
        <FastHeroTable rows={[]} columns={columns} getRowKey={getKey} className="my-custom" />,
      )
      expect(container.querySelector('table.my-custom')).toBeTruthy()
    })

    it('makes thead sticky when stickyHeader=true', () => {
      const { container } = render(
        <FastHeroTable rows={[]} columns={columns} getRowKey={getKey} stickyHeader />,
      )
      const thead = container.querySelector('thead')!
      expect(thead.style.position).toBe('sticky')
    })
  })

  describe('Column rendering', () => {
    it('renders cell content via render()', () => {
      render(<FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} />)
      expect(screen.getByText('Row 1')).toBeTruthy()
      expect(screen.getByText('0')).toBeTruthy()
    })

    it('applies data-allows-sorting on sortable column header', () => {
      const { container } = render(
        <FastHeroTable rows={[]} columns={columns} getRowKey={getKey} />,
      )
      const sortableTh = container.querySelector('[data-allows-sorting="true"]')
      expect(sortableTh).toBeTruthy()
      expect(sortableTh?.textContent).toContain('Sortable')
    })

    it('renders sortable-column-header wrapper for sortable columns', () => {
      const { container } = render(
        <FastHeroTable rows={[]} columns={columns} getRowKey={getKey} />,
      )
      expect(container.querySelector('.table__sortable-column-header')).toBeTruthy()
    })

    it('shows sort indicator only for active sort column', () => {
      const { container } = render(
        <FastHeroTable
          rows={[]}
          columns={columns}
          getRowKey={getKey}
          sortDescriptor={{ column: 'sort-col', direction: 'ascending' }}
        />,
      )
      const indicator = container.querySelector('.table__sortable-column-indicator')
      expect(indicator).toBeTruthy()
      expect(indicator?.getAttribute('data-direction')).toBe('ascending')
    })

    it('does not show sort indicator for non-active columns', () => {
      const { container } = render(
        <FastHeroTable
          rows={[]}
          columns={columns}
          getRowKey={getKey}
          sortDescriptor={{ column: 'name', direction: 'ascending' }}
        />,
      )
      expect(container.querySelector('.table__sortable-column-indicator')).toBeNull()
    })

    it('applies align=end as text-align:right on td', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} />,
      )
      const valueCells = container.querySelectorAll('td.table__cell')
      const valueCell = Array.from(valueCells).find((td) => td.textContent === '0') as HTMLElement | undefined
      expect(valueCell?.style.textAlign).toBe('right')
    })

    it('applies cellStyle to td', () => {
      const cols: FastHeroColumn<TestRow>[] = [
        { id: 'name', header: 'N', render: (r) => r.name, cellStyle: { height: 48 } },
      ]
      const { container } = render(
        <FastHeroTable rows={makeRows(1)} columns={cols} getRowKey={getKey} />,
      )
      const td = container.querySelector('td.table__cell') as HTMLElement
      expect(td.style.height).toBe('48px')
    })
  })

  describe('Sort interaction', () => {
    it('calls onSortChange with ascending on first click', () => {
      const onSortChange = vi.fn()
      const { container } = render(
        <FastHeroTable
          rows={[]}
          columns={columns}
          getRowKey={getKey}
          onSortChange={onSortChange}
        />,
      )
      const sortableTh = container.querySelector('[data-allows-sorting="true"]') as HTMLElement
      fireEvent.click(sortableTh)
      expect(onSortChange).toHaveBeenCalledWith({ column: 'sort-col', direction: 'ascending' })
    })

    it('toggles to descending when already ascending on that column', () => {
      const onSortChange = vi.fn()
      const { container } = render(
        <FastHeroTable
          rows={[]}
          columns={columns}
          getRowKey={getKey}
          sortDescriptor={{ column: 'sort-col', direction: 'ascending' }}
          onSortChange={onSortChange}
        />,
      )
      const sortableTh = container.querySelector('[data-allows-sorting="true"]') as HTMLElement
      fireEvent.click(sortableTh)
      expect(onSortChange).toHaveBeenCalledWith({ column: 'sort-col', direction: 'descending' })
    })

    it('non-sortable column click does not call onSortChange', () => {
      const onSortChange = vi.fn()
      render(
        <FastHeroTable
          rows={[]}
          columns={columns}
          getRowKey={getKey}
          onSortChange={onSortChange}
        />,
      )
      fireEvent.click(screen.getByText('Name'))
      expect(onSortChange).not.toHaveBeenCalled()
    })
  })

  describe('Row press', () => {
    it('calls onRowPress on click', () => {
      const onRowPress = vi.fn()
      render(
        <FastHeroTable rows={makeRows(2)} columns={columns} getRowKey={getKey} onRowPress={onRowPress} />,
      )
      const rows = document.querySelectorAll('tr.table__row')
      fireEvent.click(rows[0])
      expect(onRowPress).toHaveBeenCalledWith(makeRows(2)[0])
    })

    it('calls onRowPress on Enter key', () => {
      const onRowPress = vi.fn()
      render(
        <FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} onRowPress={onRowPress} />,
      )
      const row = document.querySelector('tr.table__row') as HTMLElement
      fireEvent.keyDown(row, { key: 'Enter' })
      expect(onRowPress).toHaveBeenCalled()
    })

    it('calls onRowPress on Space key', () => {
      const onRowPress = vi.fn()
      render(
        <FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} onRowPress={onRowPress} />,
      )
      const row = document.querySelector('tr.table__row') as HTMLElement
      fireEvent.keyDown(row, { key: ' ' })
      expect(onRowPress).toHaveBeenCalled()
    })

    it('does not call onRowPress on other keys', () => {
      const onRowPress = vi.fn()
      render(
        <FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} onRowPress={onRowPress} />,
      )
      const row = document.querySelector('tr.table__row') as HTMLElement
      fireEvent.keyDown(row, { key: 'Tab' })
      expect(onRowPress).not.toHaveBeenCalled()
    })

    it('makes rows focusable (tabIndex=0) when onRowPress provided', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(2)} columns={columns} getRowKey={getKey} onRowPress={vi.fn()} />,
      )
      container.querySelectorAll('tr.table__row').forEach((row) => {
        expect(row.getAttribute('tabindex')).toBe('0')
      })
    })

    it('does not set tabIndex without onRowPress', () => {
      const { container } = render(
        <FastHeroTable rows={makeRows(1)} columns={columns} getRowKey={getKey} />,
      )
      const row = container.querySelector('tr.table__row')!
      expect(row.getAttribute('tabindex')).toBeNull()
    })
  })

  describe('Memo / re-render isolation', () => {
    it('does not call render() on existing rows when a new row is appended', () => {
      const renderSpy = vi.fn((r: TestRow) => <span>{r.name}</span>)
      const spyCols: FastHeroColumn<TestRow>[] = [
        { id: 'name', header: 'N', render: renderSpy },
      ]
      const initialRows = makeRows(3)
      const { rerender } = render(
        <FastHeroTable rows={initialRows} columns={spyCols} getRowKey={getKey} />,
      )
      renderSpy.mockClear()

      // Append one new row — existing objects keep same identity
      const newRows = [...initialRows, { id: 4, name: 'Row 4', value: 30 }]
      rerender(<FastHeroTable rows={newRows} columns={spyCols} getRowKey={getKey} />)

      // Only the new row's render should have been called
      const calledIds = renderSpy.mock.calls.map(([row]) => row.id)
      expect(calledIds).toEqual([4])
    })

    it('re-renders only the updated row when one row changes', () => {
      const renderSpy = vi.fn((r: TestRow) => <span>{r.name}</span>)
      const spyCols: FastHeroColumn<TestRow>[] = [
        { id: 'name', header: 'N', render: renderSpy },
      ]
      const initialRows = makeRows(3)
      const { rerender } = render(
        <FastHeroTable rows={initialRows} columns={spyCols} getRowKey={getKey} />,
      )
      renderSpy.mockClear()

      // Replace row id=2 with new object; rows 1 and 3 keep identity
      const updatedRows = initialRows.map((r) =>
        r.id === 2 ? { ...r, name: 'Updated' } : r,
      )
      rerender(<FastHeroTable rows={updatedRows} columns={spyCols} getRowKey={getKey} />)

      const calledIds = renderSpy.mock.calls.map(([row]) => row.id)
      expect(calledIds).toEqual([2])
    })
  })

  describe('Edge cases', () => {
    it('renders empty tbody when rows is empty', () => {
      const { container } = render(
        <FastHeroTable rows={[]} columns={columns} getRowKey={getKey} />,
      )
      expect(container.querySelectorAll('tr.table__row')).toHaveLength(0)
    })

    it('uses getRowKey for stable React keys (no console error on reorder)', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const rows = makeRows(3)
      const { rerender } = render(
        <FastHeroTable rows={rows} columns={columns} getRowKey={getKey} />,
      )
      rerender(<FastHeroTable rows={[rows[2], rows[0], rows[1]]} columns={columns} getRowKey={getKey} />)
      expect(consoleError).not.toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})

