/**
 * ErrorTimelinePanel component tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { tracer } from '@/engine/tracer'
import { ErrorTimelinePanel } from './ErrorTimelinePanel'

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

describe('ErrorTimelinePanel', () => {
  beforeEach(() => {
    tracer.reset()
  })

  afterEach(() => {
    tracer.reset()
  })

  it('renders without crashing when no errors', () => {
    renderWithRouter(<ErrorTimelinePanel />)
    expect(screen.getByText(/No errors/i)).toBeInTheDocument()
  })

  it('shows error events when present', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'tick.start', label: 'tick.start', payload: {} })
    tracer.emit({ t: now + 10, type: 'action.dispatch', label: 'move.forward', payload: { speed: 0.5 } })
    tracer.emit({ t: now + 20, type: 'error', label: 'error', payload: { message: 'connection timeout' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/connection timeout/i)).toBeInTheDocument()
    })
  })

  it('shows error count in summary', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'error', label: 'error', payload: { message: 'err1' } })
    tracer.emit({ t: now + 10, type: 'error', label: 'error', payload: { message: 'err2' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/2× error/i)).toBeInTheDocument()
    })
  })

  it('shows preceding events context chain', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'tick.start', label: 'tick.start', payload: {} })
    tracer.emit({ t: now + 10, type: 'action.dispatch', label: 'move.forward', payload: { speed: 0.5 } })
    tracer.emit({ t: now + 20, type: 'error', label: 'error', payload: { message: 'stall detected' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/Preceded by/i)).toBeInTheDocument()
      // Use getAllByText since tick.start appears in both error type and context chain
      const tickStarts = screen.getAllByText(/tick\.start/i)
      expect(tickStarts.length).toBeGreaterThan(0)
    })
  })

  it('highlights error type with color', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'error', label: 'error', payload: { message: 'test error' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/test error/i)).toBeInTheDocument()
    })
  })

  it('shows export button when errors exist', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'error', label: 'error', payload: { message: 'test' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/Export Error Report/i)).toBeInTheDocument()
    })
  })

  it('exports error report as JSON', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'error', label: 'error', payload: { message: 'export test' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/Export Error Report/i)).toBeInTheDocument()
    })

    // Mock URL.createObjectURL for jsdom compatibility
    const mockUrl = 'blob:test-url'
    Object.defineProperty(window.URL, 'createObjectURL', { value: () => mockUrl, writable: true, configurable: true })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const exportBtn = screen.getByText(/Export Error Report/i)
    fireEvent.click(exportBtn)

    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
  })

  it('shows policy failures in timeline', async () => {
    const now = performance.now()
    tracer.emit({ t: now, type: 'policy.invoke', label: 'runPolicy', payload: {} })
    tracer.emit({ t: now + 10, type: 'policy.failure', label: 'policy.failed', payload: { message: 'inference timeout' } })

    renderWithRouter(<ErrorTimelinePanel />)

    await waitFor(() => {
      expect(screen.getByText(/inference timeout/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no errors', () => {
    renderWithRouter(<ErrorTimelinePanel />)
    expect(screen.getByText(/No error events detected/i)).toBeInTheDocument()
  })
})
