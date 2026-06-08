/**
 * EventSearchPanel component tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { tracer, type TracerEvent } from '@/engine/tracer'
import { EventSearchPanel } from './EventSearchPanel'

const localStorageMock: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageMock[key] ?? null,
    setItem: (key: string, value: string) => { localStorageMock[key] = value },
    removeItem: (key: string) => { delete localStorageMock[key] },
    clear: () => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]) },
    get length() { return Object.keys(localStorageMock).length },
    key: (n: number) => Object.keys(localStorageMock)[n] ?? null,
  },
  writable: true,
})

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('EventSearchPanel', () => {
  beforeEach(() => {
    tracer.reset()
    // Seed some test events
    const now = performance.now()
    const events: TracerEvent[] = [
      { t: now, type: 'tick.start', label: 'tick.start', payload: {} },
      { t: now + 10, type: 'node.enter', label: 'Sequence(patrol)', payload: {} },
      { t: now + 20, type: 'action.dispatch', label: 'move.forward', payload: { speed: 0.5 } },
      { t: now + 30, type: 'adapter.tx', label: 'move', payload: { x: 1, y: 0 } },
      { t: now + 40, type: 'bb.set', label: 'position.x', payload: { value: 1.5 } },
      { t: now + 50, type: 'error', label: 'error', payload: { message: 'connection timeout' } },
      { t: now + 60, type: 'perception', label: 'see.face', payload: { source: 'webcam', confidence: 0.92 } },
    ]
    events.forEach(e => tracer.emit(e))
  })

  afterEach(() => {
    tracer.reset()
  })

  it('renders without crashing', () => {
    renderWithRouter(<EventSearchPanel />)
    expect(screen.getByPlaceholderText(/search events/i)).toBeInTheDocument()
  })

  it('shows total event count from snapshot', async () => {
    renderWithRouter(<EventSearchPanel />)
    // Should show "7 total events in view" (snapshot mode by default)
    await waitFor(() => {
      expect(screen.getByText(/total events/i)).toBeInTheDocument()
    })
  })

  it('filters results by keyword', async () => {
    renderWithRouter(<EventSearchPanel />)
    const input = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(input, { target: { value: 'move' } })

    await waitFor(() => {
      expect(screen.getByText(/2 event/)).toBeInTheDocument()
    })
  })

  it('filters results by payload content', async () => {
    renderWithRouter(<EventSearchPanel />)
    const input = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(input, { target: { value: 'face' } })

    await waitFor(() => {
      expect(screen.getByText(/1 event/)).toBeInTheDocument()
    })
  })

  it('filters results by error message', async () => {
    renderWithRouter(<EventSearchPanel />)
    const input = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(input, { target: { value: 'timeout' } })

    await waitFor(() => {
      expect(screen.getByText(/1 event/)).toBeInTheDocument()
    })
  })

  it('clears search when clear button clicked', async () => {
    renderWithRouter(<EventSearchPanel />)
    const input = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(input, { target: { value: 'move' } })

    await waitFor(() => {
      expect(screen.getByText(/2 event/)).toBeInTheDocument()
    })

    // Click clear button
    const clearBtn = screen.getByText('✕')
    fireEvent.click(clearBtn)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shows type filter button', () => {
    renderWithRouter(<EventSearchPanel />)
    expect(screen.getByText(/All Types/)).toBeInTheDocument()
  })

  it('toggles live mode', async () => {
    renderWithRouter(<EventSearchPanel />)
    const liveBtn = screen.getByText(/Live|Snapshot/i)
    fireEvent.click(liveBtn)

    await waitFor(() => {
      expect(screen.getByText(/Snapshot/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no matches', async () => {
    renderWithRouter(<EventSearchPanel />)
    const input = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(input, { target: { value: 'zzznonexistent' } })

    await waitFor(() => {
      expect(screen.getByText(/No events match/)).toBeInTheDocument()
    })
  })

  it('highlights matching text', async () => {
    renderWithRouter(<EventSearchPanel />)
    const input = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(input, { target: { value: 'tick' } })

    await waitFor(() => {
      expect(screen.getByText(/1 event/)).toBeInTheDocument()
    })

    // The mark element should contain the matched text
    const marks = screen.getAllByRole('mark')
    expect(marks.length).toBeGreaterThan(0)
  })
})
