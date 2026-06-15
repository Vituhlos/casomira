// @vitest-environment jsdom
import { render, act, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Semifinale } from '../screens/Semifinale'

vi.mock('@heroui/react', () => ({
  Button: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
}))
vi.mock('../components/SubTabs', () => ({ SubTabs: () => null }))
vi.mock('../screens/Results', () => ({ Results: () => null }))
vi.mock('../screens/RostGrid', () => ({ RostGrid: () => null }))

const mockGetZaverStav = vi.fn()
const mockCleanup = vi.fn()
const mockOnDataChanged = vi.fn()

let capturedCb: (() => void) | null = null

describe('Semifinale – onDataChanged subscription (H1)', () => {
  beforeEach(() => {
    capturedCb = null
    // null → component renders <div /> (guard `if (!stav) return <div />`),
    // ale useEffect subscriptions se přesto nastaví.
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
      render(<Semifinale kategorieId={2} sub="rost" onSub={() => {}} />)
    })
    expect(mockGetZaverStav).toHaveBeenCalledOnce()
    expect(mockGetZaverStav).toHaveBeenCalledWith(2)
  })

  it('re-fetches when onDataChanged fires', async () => {
    await act(async () => {
      render(<Semifinale kategorieId={2} sub="rost" onSub={() => {}} />)
    })
    const before = mockGetZaverStav.mock.calls.length
    expect(capturedCb).not.toBeNull()
    await act(async () => { capturedCb!() })
    expect(mockGetZaverStav.mock.calls.length).toBeGreaterThan(before)
  })

  it('calls cleanup on unmount — no listener leak', async () => {
    let unmount!: () => void
    await act(async () => {
      ;({ unmount } = render(<Semifinale kategorieId={2} sub="rost" onSub={() => {}} />))
    })
    act(() => unmount())
    expect(mockCleanup).toHaveBeenCalled()
  })
})
