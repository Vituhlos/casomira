// @vitest-environment jsdom
import { render, act, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Finale } from '../screens/Finale'

vi.mock('../components/SubTabs', () => ({ SubTabs: () => null }))
vi.mock('../screens/Results', () => ({ Results: () => null }))
vi.mock('../screens/RostGrid', () => ({ RostGrid: () => null }))
// FinaleToggle pochází ze Semifinale; mockujeme celý modul — type SubView se
// vymaže TypeScriptem, tak stačí exportovat jen hodnotu FinaleToggle.
vi.mock('../screens/Semifinale', () => ({ FinaleToggle: () => null }))

const mockGetZaverStav = vi.fn()
const mockCleanup = vi.fn()
const mockOnDataChanged = vi.fn()

let capturedCb: (() => void) | null = null

describe('Finale – onDataChanged subscription (H1)', () => {
  beforeEach(() => {
    capturedCb = null
    mockGetZaverStav.mockReset().mockResolvedValue(null)
    mockCleanup.mockReset()
    mockOnDataChanged.mockReset().mockImplementation((cb: () => void) => {
      capturedCb = cb
      return mockCleanup
    })
    ;(window as any).api = { getZaverStav: mockGetZaverStav, onDataChanged: mockOnDataChanged }
  })

  afterEach(cleanup)

  it('fetches zaverStav on mount', async () => {
    await act(async () => {
      render(<Finale kategorieId={3} sub="rost" onSub={() => {}} />)
    })
    expect(mockGetZaverStav).toHaveBeenCalledOnce()
    expect(mockGetZaverStav).toHaveBeenCalledWith(3)
  })

  it('re-fetches when onDataChanged fires', async () => {
    await act(async () => {
      render(<Finale kategorieId={3} sub="rost" onSub={() => {}} />)
    })
    const before = mockGetZaverStav.mock.calls.length
    expect(capturedCb).not.toBeNull()
    await act(async () => { capturedCb!() })
    expect(mockGetZaverStav.mock.calls.length).toBeGreaterThan(before)
  })

  it('calls cleanup on unmount — no listener leak', async () => {
    let unmount!: () => void
    await act(async () => {
      ;({ unmount } = render(<Finale kategorieId={3} sub="rost" onSub={() => {}} />))
    })
    act(() => unmount())
    expect(mockCleanup).toHaveBeenCalled()
  })
})
