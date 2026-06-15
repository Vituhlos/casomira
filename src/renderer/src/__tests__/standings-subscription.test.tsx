// @vitest-environment jsdom
import { render, act, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Standings } from '../screens/Standings'

// Compound-component stub — HeroUI Table má Table.ScrollContainer, .Body, atd.
vi.mock('@heroui/react', () => {
  const Pass = ({ children }: any) => <>{children}</>
  const Table = Object.assign(Pass, {
    ScrollContainer: Pass,
    Content: Pass,
    Header: Pass,
    Column: Pass,
    Body: ({ children, renderEmptyState }: any) => <>{children ?? renderEmptyState?.()}</>,
    Row: Pass,
    Cell: Pass,
  })
  const Button = ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>
  return { Table, Button }
})

vi.mock('@gravity-ui/icons', () => ({ ArrowUpArrowDown: () => null }))

// mock-prefixed names can be referenced inside vi.mock factories (Vitest hoisting rule).
// Here they're used outside factories — regular module-level mocks.
const mockGetKlasifikace = vi.fn()
const mockCleanup = vi.fn()
const mockOnDataChanged = vi.fn()

let capturedCb: (() => void) | null = null

describe('Standings – onDataChanged subscription (H1)', () => {
  beforeEach(() => {
    capturedCb = null
    mockGetKlasifikace.mockReset().mockResolvedValue([])
    mockCleanup.mockReset()
    mockOnDataChanged.mockReset().mockImplementation((cb: () => void) => {
      capturedCb = cb
      return mockCleanup
    })
    ;(window as any).api = { getKlasifikace: mockGetKlasifikace, onDataChanged: mockOnDataChanged }
  })

  afterEach(cleanup)

  it('fetches klasifikace on mount', async () => {
    await act(async () => {
      render(<Standings kategorieId={1} koloTypy={['Q1']} title="Test" />)
    })
    expect(mockGetKlasifikace).toHaveBeenCalledOnce()
    expect(mockGetKlasifikace).toHaveBeenCalledWith(1, ['Q1'])
  })

  it('re-fetches when onDataChanged fires', async () => {
    await act(async () => {
      render(<Standings kategorieId={1} koloTypy={['Q1']} title="Test" />)
    })
    const before = mockGetKlasifikace.mock.calls.length
    expect(capturedCb).not.toBeNull()
    await act(async () => { capturedCb!() })
    expect(mockGetKlasifikace.mock.calls.length).toBeGreaterThan(before)
  })

  it('calls cleanup on unmount — no listener leak', async () => {
    let unmount!: () => void
    await act(async () => {
      ;({ unmount } = render(<Standings kategorieId={1} koloTypy={['Q1']} title="Test" />))
    })
    act(() => unmount())
    expect(mockCleanup).toHaveBeenCalled()
  })
})
