import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { TraceQualityPanel } from './TraceQualityPanel'
import { tracer, type TracerEvent, type TracerEventType } from '@/engine/tracer'

function evt(t: number, type: TracerEventType, label: string = type, payload?: Record<string, unknown>): TracerEvent {
  return { t, type, label, payload }
}

function emitHealthyTicks(count: number, baseT = performance.now()) {
  for (let i = 0; i < count; i++) {
    const t = baseT + i * 20
    tracer.emit(evt(t, 'tick.start', `tick ${i}`))
    tracer.emit(evt(t + 1, 'perception', 'sonar'))
    tracer.emit(evt(t + 3, 'action.dispatch', 'move'))
    tracer.emit(evt(t + 5, 'adapter.tx', 'move'))
    tracer.emit(evt(t + 8, 'adapter.rx', 'ack'))
  }
}

beforeEach(() => {
  tracer.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TraceQualityPanel', () => {
  it('shows empty state when no events', () => {
    render(<TraceQualityPanel />)
    expect(screen.getByTestId('trace-quality-panel')).toBeInTheDocument()
    expect(screen.getByTestId('trace-quality-empty')).toBeInTheDocument()
  })

  it('renders health score and stats after refresh tick', async () => {
    emitHealthyTicks(20)
    render(<TraceQualityPanel />)
    await act(async () => {
      vi.advanceTimersByTime(1100)
    })
    const score = screen.getByTestId('trace-health-score')
    expect(score).toHaveTextContent('/100')
    expect(screen.getByText('Ticks')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('collapses and expands', async () => {
    emitHealthyTicks(10)
    render(<TraceQualityPanel />)
    await act(async () => {
      vi.advanceTimersByTime(1100)
    })
    const btn = screen.getByRole('button', { name: /collapse/i })
    fireEvent.click(btn)
    expect(screen.queryByText('Ticks')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(screen.getByText('Ticks')).toBeInTheDocument()
  })

  it('shows recommendations when trace has issues', async () => {
    // ticks with no action dispatch -> recommendation expected
    for (let i = 0; i < 20; i++) {
      tracer.emit(evt(performance.now() + i * 20, 'tick.start', `tick ${i}`))
    }
    render(<TraceQualityPanel />)
    await act(async () => {
      vi.advanceTimersByTime(1100)
    })
    expect(screen.getByTestId('trace-recommendations')).toBeInTheDocument()
    expect(screen.getByTestId('trace-recommendations').textContent).toMatch(/No action dispatches/)
  })
})
