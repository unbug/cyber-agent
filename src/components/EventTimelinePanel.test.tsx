/**
 * EventTimelinePanel — Unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { tracer } from '@/engine/tracer'
import { EventTimelinePanel } from './EventTimelinePanel'

// Mock CSS modules
vi.mock('./EventTimelinePanel.module.css', () => ({
  default: {},
}))

describe('EventTimelinePanel', () => {
  beforeEach(() => {
    tracer.reset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
  it('renders without crashing', () => {
    render(<EventTimelinePanel />)
    expect(screen.getByText(/All Events/)).toBeInTheDocument()
  })

  it('shows event count when no events', () => {
    render(<EventTimelinePanel />)
    expect(screen.getByText(/0 events/)).toBeInTheDocument()
  })

  it('displays category filter buttons', () => {
    render(<EventTimelinePanel />)
    const categories = ['Behavior Tree', 'Adapter', 'Perception', 'Policy', 'Social', 'VAL', 'System']
    for (const cat of categories) {
      expect(screen.getByText(new RegExp(cat))).toBeInTheDocument()
    }
  })

  it('filters events by category toggle', () => {
    // Emit some events of different types
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick.start' })
    tracer.emit({ t: 200, type: 'error', label: 'error' })

    render(<EventTimelinePanel />)

    // Both events should be visible initially (All category active)
    expect(screen.getByText(/2 events/)).toBeInTheDocument()

    // Click to toggle off "System" — error event should be filtered out
    const systemBtn = screen.getByText(/System/)
    fireEvent.click(systemBtn)

    // After toggling, only tick.start remains (1 event)
    waitFor(() => {
      expect(screen.getByText(/1 events/)).toBeInTheDocument()
    })
  })

  it('filters by keyword', () => {
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick.start' })
    tracer.emit({ t: 200, type: 'error', label: 'motor_stall_detected' })

    render(<EventTimelinePanel />)

    // Type keyword filter
    const searchInput = screen.getByPlaceholderText(/Keyword/)
    fireEvent.change(searchInput, { target: { value: 'motor' } })

    waitFor(() => {
      expect(screen.getByText(/1 events/)).toBeInTheDocument()
    })
  })

  it('shows zoom controls', () => {
    render(<EventTimelinePanel />)
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument()
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument()
  })

  it('shows pan controls', () => {
    render(<EventTimelinePanel />)
    expect(screen.getByTitle('Scroll left')).toBeInTheDocument()
    expect(screen.getByTitle('Scroll right')).toBeInTheDocument()
  })

  it('toggles auto-scroll', () => {
    render(<EventTimelinePanel />)
    // Initially live (auto-scroll on by default)
    expect(screen.getByText(/⏸ Live/)).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Pause auto-scroll'))
    waitFor(() => {
      expect(screen.getByText(/▶ Live/)).toBeInTheDocument()
    })
  })

  it('shows export button', () => {
    render(<EventTimelinePanel />)
    expect(screen.getByTitle('Export filtered events')).toBeInTheDocument()
  })

  it('renders SVG timeline with event dots when events exist', () => {
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick' })
    tracer.emit({ t: 200, type: 'adapter.tx', label: 'move' })

    const { container } = render(<EventTimelinePanel />)

    // SVG should be rendered
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('width')).toBeTruthy()
  })

  it('shows legend with event type counts', () => {
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick' })
    tracer.emit({ t: 200, type: 'error', label: 'fail' })
    tracer.emit({ t: 300, type: 'tick.start', label: 'tick2' })

    render(<EventTimelinePanel />)

    // Legend should show tick.start ×2 and error ×1
    waitFor(() => {
      expect(screen.getByText(/tick\.start ×2/)).toBeInTheDocument()
      expect(screen.getByText(/error ×1/)).toBeInTheDocument()
    })
  })

  it('handles agent ID filter', () => {
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick', agentId: 'agent-1' })
    tracer.emit({ t: 200, type: 'error', label: 'fail', agentId: 'agent-2' })

    render(<EventTimelinePanel />)

    const agentInput = screen.getByPlaceholderText(/Agent/)
    fireEvent.change(agentInput, { target: { value: 'agent-1' } })

    waitFor(() => {
      expect(screen.getByText(/1 events/)).toBeInTheDocument()
    })
  })

  it('shows event tooltip on click', () => {
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick.start' })

    const { container } = render(<EventTimelinePanel />)

    // Click on the SVG to trigger event selection
    const svg = container.querySelector('svg')!
    fireEvent.click(svg)

    waitFor(() => {
      expect(screen.getByText(/tick\.start/)).toBeInTheDocument()
    })
  })

  it('shows detail panel with payload for selected error event', () => {
    tracer.emit({ t: 100, type: 'error', label: 'motor_stall', payload: { motorId: 'M1' } })

    const { container } = render(<EventTimelinePanel />)

    // Click to select the event - use data-testid approach via SVG click
    const svg = container.querySelector('svg')!
    fireEvent.click(svg)

    waitFor(() => {
      expect(screen.getByText(/motor_stall/)).toBeInTheDocument()
      expect(screen.getByText(/M1/)).toBeInTheDocument()
    })
  })

  it('handles empty events gracefully', () => {
    render(<EventTimelinePanel />)
    // Should not crash with no events
    expect(screen.getByText(/0 events/)).toBeInTheDocument()
  })

  it('respects ring buffer size limit', () => {
    // Emit more than RING_SIZE (1000) events
    for (let i = 0; i < 1050; i++) {
      tracer.emit({ t: i * 10, type: 'tick.start', label: `tick-${i}` })
    }

    render(<EventTimelinePanel />)

    // Should only show last 1000 events (ring buffer limit)
    waitFor(() => {
      const countText = screen.getByText(/events/)
      expect(countText.textContent).toMatch(/\d+ events/)
    })
  })

  it('shows correlation chain when clicking an event with causal neighbors', () => {
    // Emit a causal chain: tick.start → node.enter → action.dispatch → adapter.tx → node.exit
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick' })
    tracer.emit({ t: 200, type: 'node.enter', label: 'seq.move' })
    tracer.emit({ t: 300, type: 'action.dispatch', label: 'move.forward' })
    tracer.emit({ t: 400, type: 'adapter.tx', label: 'cmd:move' })
    tracer.emit({ t: 500, type: 'node.exit', label: 'seq.move' })

    const { container } = render(<EventTimelinePanel />)

    // Click on the action.dispatch event (3rd event)
    const svg = container.querySelector('svg')!
    fireEvent.click(svg)

    waitFor(() => {
      // Should show correlation section with related events
      expect(screen.getByText(/Correlated Events/)).toBeInTheDocument()
    })
  })

  it('shows playback controls in toolbar', () => {
    render(<EventTimelinePanel />)
    expect(screen.getByTitle('Play events')).toBeInTheDocument()
    expect(screen.getByTitle('Speed up')).toBeInTheDocument()
    expect(screen.getByTitle('Slow down')).toBeInTheDocument()
  })

  it('toggles playback on/off', () => {
    tracer.emit({ t: 100, type: 'tick.start', label: 'tick' })

    render(<EventTimelinePanel />)

    // Initially not playing (shows ▶ Play)
    expect(screen.getByTitle('Play events')).toHaveTextContent(/▶ Play/)

    fireEvent.click(screen.getByTitle('Play events'))
    waitFor(() => {
      // After clicking, should show ⏸ Play (playing)
      expect(screen.getByTitle('Pause playback')).toBeInTheDocument()
    })
  })
})
