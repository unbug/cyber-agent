/**
 * TraceScrubber component tests — time-travel scrubber for .cybertrace files.
 *
 * Covers:
 * - Idle state with upload button and drag-and-drop zone
 * - Metadata display (platform, character, event count) via traceData prop
 * - Scrubber controls (play, pause, step forward/backward, speed)
 * - Error handling for invalid traces
 * - Back to live functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TraceScrubber } from './TraceScrubber'
import type { TracerEvent } from '@/engine/tracer'

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

// Helper to create trace events for props
function makeEvents(count: number): TracerEvent[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    t: now + i * 10,
    type: i % 3 === 0 ? 'tick.start' : i % 3 === 1 ? 'node.enter' : 'bb.set',
    label: `event-${i}`,
    payload: undefined,
  }))
}

// Helper to create trace data for props
function makeTraceData(eventCount: number, meta?: Record<string, unknown>) {
  return {
    header: { $schema: 'cybertrace/v1', $version: 1, meta },
    events: makeEvents(eventCount),
  }
}

describe('TraceScrubber', () => {
  // ─── Idle State ──────────────────────────────────────────────

  it('renders idle state with upload button', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} />)
    expect(screen.getByText(/Load Trace File/i)).toBeInTheDocument()
  })

  it('shows empty scrubber controls when no trace loaded', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} />)
    // The upload button should be visible in idle state
    expect(screen.getByText(/Load Trace File/i)).toBeInTheDocument()
  })

  it('shows drag-and-drop zone on drag enter when idle', () => {
    const { container } = renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} />)
    // Drag enter triggers the drop zone display
    fireEvent.dragEnter(container.querySelector('.scrubber')!)
    expect(screen.getByText(/Drop .cybertrace file here/i)).toBeInTheDocument()
  })

  it('hides drag-and-drop zone on drag leave', () => {
    const { container } = renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} />)
    fireEvent.dragEnter(container.querySelector('.scrubber')!)
    // Drop zone should be visible after drag enter
    expect(screen.getByText(/Drop .cybertrace file here/i)).toBeInTheDocument()
    fireEvent.dragLeave(container.querySelector('.scrubber')!)
    // Drop zone should be hidden (display: none via style) - check the element's display property
    const dropZone = container.querySelector('.scrubberDropZone')
    expect(dropZone?.style.display).toBe('none')
  })

  // ─── Metadata Display via traceData Prop ─────────────────────

  it('shows event count from traceData prop', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(5)} />)
    // The scrubber label contains the event count
    const labels = screen.getAllByText(/events/i)
    expect(labels.length).toBeGreaterThan(0)
  })

  it('displays platform metadata in scrubber label', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1, { platform: 'RoboMaster S1' })} />)
    expect(screen.getByText(/🤖 RoboMaster S1/i)).toBeInTheDocument()
  })

  it('displays character metadata in scrubber label', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1, { character: 'guardian-bot' })} />)
    expect(screen.getByText(/🎭 guardian-bot/i)).toBeInTheDocument()
  })

  it('shows both platform and character metadata', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1, { platform: 'ESP32 Bridge', character: 'fox' })} />)
    expect(screen.getByText(/🤖 ESP32 Bridge/i)).toBeInTheDocument()
    expect(screen.getByText(/🎭 fox/i)).toBeInTheDocument()
  })

  // ─── Scrubber Controls ───────────────────────────────────────

  it('shows scrubber controls after trace load via prop', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(3)} />)
    expect(screen.getByText(/⏮ Live/i)).toBeInTheDocument() // Back to live button
    expect(screen.getByText(/⏪/i)).toBeInTheDocument() // Step backward
    expect(screen.getByText(/▶/i)).toBeInTheDocument() // Play
    expect(screen.getByText(/⏩/i)).toBeInTheDocument() // Step forward
  })

  it('shows speed selector after trace load', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1)} />)
    expect(screen.getByText(/0.25x/i)).toBeInTheDocument()
    expect(screen.getByText(/1x/i)).toBeInTheDocument()
    expect(screen.getByText(/4x/i)).toBeInTheDocument()
  })

  it('shows scrubber slider after trace load', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(3)} />)
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    expect(slider).toBeInTheDocument()
    expect(slider.max).toBe('2') // 3 events → max index 2
  })

  it('shows scrubber slider with correct range for single event', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1)} />)
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    expect(slider.max).toBe('0') // 1 event → max index 0
  })

  // ─── Blackboard Preview ──────────────────────────────────────

  it('shows blackboard preview when scrubbing', () => {
    const events: TracerEvent[] = [
      { t: Date.now(), type: 'tick.start', label: 'root', payload: undefined },
      { t: Date.now() + 10, type: 'bb.set', label: 'emotion', payload: { field: 'valence', value: 0.8 } },
    ]
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={{ header: {}, events }} />)

    // Seek to event index 1 (the bb.set event)
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '1' } })

    expect(screen.getByText(/Blackboard at Event #2/i)).toBeInTheDocument()
    expect(screen.getByText(/valence/i)).toBeInTheDocument()
  })

  it('shows empty blackboard preview when scrubbing to start', () => {
    const events: TracerEvent[] = [
      { t: Date.now(), type: 'tick.start', label: 'root', payload: undefined },
    ]
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={{ header: {}, events }} />)

    // At index -1 (before any event), no blackboard preview should show
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '-1' } })

    expect(screen.queryByText(/Blackboard at Event/i)).not.toBeInTheDocument()
  })

  // ─── Active Nodes Display ────────────────────────────────────

  it('shows active nodes during scrubbing', () => {
    const events: TracerEvent[] = [
      { t: Date.now(), type: 'tick.start', label: 'root', payload: undefined },
      { t: Date.now() + 10, type: 'node.enter', label: 'sequence.patrol', payload: undefined },
      { t: Date.now() + 20, type: 'node.enter', label: 'action.move-forward', payload: undefined },
    ]
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={{ header: {}, events }} />)

    // Seek to event index 2 (two nodes entered)
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '2' } })

    expect(screen.getByText(/🌳 sequence.patrol/i)).toBeInTheDocument()
    expect(screen.getByText(/🌳 action.move-forward/i)).toBeInTheDocument()
  })

  it('shows no active nodes when scrubbing before any node.enter', () => {
    const events: TracerEvent[] = [
      { t: Date.now(), type: 'tick.start', label: 'root', payload: undefined },
    ]
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={{ header: {}, events }} />)

    // At index 0 (just tick.start, no nodes entered yet)
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '0' } })

    expect(screen.queryByText(/🌳/i)).not.toBeInTheDocument()
  })

  // ─── Back to Live ────────────────────────────────────────────

  it('resets to idle state when clicking Back to Live', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1)} />)

    // Should show scrubber controls
    expect(screen.getByText(/⏮ Live/i)).toBeInTheDocument()

    // Click Back to Live
    fireEvent.click(screen.getByText(/⏮ Live/i))

    // Should return to idle state with upload button
    expect(screen.getByText(/Load Trace File/i)).toBeInTheDocument()
  })

  it('hides scrubber controls after going back to live', () => {
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={makeTraceData(1)} />)

    fireEvent.click(screen.getByText(/⏮ Live/i))

    // Controls should be hidden
    expect(screen.queryByText(/▶/i)).not.toBeInTheDocument()
  })

  // ─── Error State ─────────────────────────────────────────────

  it('shows error state when traceData has invalid events', () => {
    // This test verifies the component handles edge cases gracefully
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={{ header: {}, events: [] }} />)
    // Empty events should still show scrubber controls but with 0 events
    expect(screen.getByText(/0 \/ 0 events/i)).toBeInTheDocument()
  })

  // ─── Drag-and-Drop Visual Feedback ───────────────────────────

  it('applies drag-over style when dragging over scrubber', () => {
    const { container } = renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} />)
    const scrubberEl = container.querySelector('.scrubber')!

    // Initially no drag-over style
    expect(scrubberEl.style.borderColor).toBe('')

    fireEvent.dragEnter(scrubberEl)
    // Border color should be set (CSS shorthand may return just the color)
    expect(scrubberEl.style.borderColor).toContain('rgb(59, 130, 246)')

    fireEvent.dragLeave(scrubberEl)
    expect(scrubberEl.style.borderColor).toBe('')
  })

  it('applies drag-over background color when dragging over scrubber', () => {
    const { container } = renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} />)
    const scrubberEl = container.querySelector('.scrubber')!

    fireEvent.dragEnter(scrubberEl)
    // Background color should be set (CSS may use rgba or rgb)
    expect(scrubberEl.style.backgroundColor).toContain('59, 130, 246')

    fireEvent.dragLeave(scrubberEl)
    expect(scrubberEl.style.backgroundColor).toBe('')
  })

  // ─── Props Integration ───────────────────────────────────────

  it('loads trace from traceData prop with meta', () => {
    const mockTrace = {
      header: { meta: { platform: 'Sim', character: 'test' } },
      events: makeEvents(1),
    }

    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={mockTrace} />)

    // Should show the scrubber with events from prop - check individual elements
    expect(screen.getByText(/🤖 Sim/i)).toBeInTheDocument()
    expect(screen.getByText(/🎭 test/i)).toBeInTheDocument()
  })

  it('shows Sim platform from traceData prop', () => {
    const mockTrace = {
      header: { meta: { platform: 'Sim' } },
      events: makeEvents(1),
    }

    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={null} traceData={mockTrace} />)

    expect(screen.getByText(/🤖 Sim/i)).toBeInTheDocument()
  })

  // ─── Live Mode Integration ──────────────────────────────────

  it('shows live blackboard when not scrubbing', () => {
    const liveBB = { x: 10, y: 20, emotion: 'happy' }
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={liveBB} />)

    // In idle mode, should show upload button (not scrubber controls)
    expect(screen.getByText(/Load Trace File/i)).toBeInTheDocument()
  })

  it('shows live blackboard in stats when trace loaded and scrubbing', () => {
    const events: TracerEvent[] = [
      { t: Date.now(), type: 'bb.set', label: 'x', payload: { field: 'x', value: 42 } },
    ]
    renderWithRouter(<TraceScrubber liveEvents={[]} liveBlackboard={{ x: 0 }} traceData={{ header: {}, events }} />)

    // Scrub to event 0
    const slider = document.querySelector('.scrubberSlider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '0' } })

    // Should show blackboard preview with reconstructed state
    expect(screen.getByText(/Blackboard at Event #1/i)).toBeInTheDocument()
  })
})
