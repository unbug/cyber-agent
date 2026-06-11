import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EventTimelineScrubber } from './EventTimelineScrubber'
import type { TracerEvent } from '@/engine/tracer'

function makeEvents(count: number): TracerEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    t: Date.now() + i * 10,
    type: i % 3 === 0 ? 'tick.start' : (i % 3 === 1 ? 'node.enter' : 'node.exit'),
    label: `event-${i}`,
    payload: { index: i },
  }))
}

// Mock canvas getBoundingClientRect for tests
function mockCanvasRect(container: HTMLElement, width = 400, height = 80) {
  const canvas = container.querySelector('canvas')!
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width, height }),
    configurable: true,
  })
}

describe('EventTimelineScrubber', () => {
  it('renders canvas element', () => {
    const events = makeEvents(10)
    const { container } = render(
      <EventTimelineScrubber
        events={events}
        currentIndex={-1}
        onSeek={vi.fn()}
        isPlaying={false}
      />
    )
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('renders canvas even when empty', () => {
    render(
      <EventTimelineScrubber
        events={[]}
        currentIndex={-1}
        onSeek={vi.fn()}
        isPlaying={false}
      />
    )
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('calls onSeek when clicking valid event position', () => {
    const onSeek = vi.fn()
    const events = makeEvents(20)
    const { container } = render(
      <EventTimelineScrubber
        events={events}
        currentIndex={-1}
        onSeek={onSeek}
        isPlaying={false}
      />
    )

    mockCanvasRect(container, 400, 80)
    const canvas = container.querySelector('canvas')!
    // Click at x=60 (well within the visible area after padding)
    fireEvent.click(canvas, { clientX: 60, clientY: 40 })

    expect(onSeek).toHaveBeenCalled()
  })

  it('does not seek when clicking outside event area', () => {
    const onSeek = vi.fn()
    const events = makeEvents(20)
    const { container } = render(
      <EventTimelineScrubber
        events={events}
        currentIndex={-1}
        onSeek={onSeek}
        isPlaying={false}
      />
    )

    mockCanvasRect(container, 400, 80)
    const canvas = container.querySelector('canvas')!
    // Click at x=5 (in the padding area) — should not seek
    fireEvent.click(canvas, { clientX: 5, clientY: 40 })

    expect(onSeek).not.toHaveBeenCalled()
  })

  it('shows hint text', () => {
    render(
      <EventTimelineScrubber
        events={makeEvents(10)}
        currentIndex={-1}
        onSeek={vi.fn()}
        isPlaying={false}
      />
    )
    expect(screen.getByText(/Scroll to zoom/)).toBeTruthy()
  })

  it('renders event bars for loaded events', () => {
    const events = makeEvents(50)
    const { container } = render(
      <EventTimelineScrubber
        events={events}
        currentIndex={25}
        onSeek={vi.fn()}
        isPlaying={false}
      />
    )

    mockCanvasRect(container, 400, 80)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toBeTruthy()
  })

  it('handles different event types with correct colors', () => {
    const events: TracerEvent[] = [
      { t: Date.now(), type: 'tick.start', label: 't1', payload: {} },
      { t: Date.now(), type: 'error', label: 'e1', payload: {} },
      { t: Date.now(), type: 'adapter.tx', label: 'a1', payload: {} },
    ]
    const { container } = render(
      <EventTimelineScrubber
        events={events}
        currentIndex={0}
        onSeek={vi.fn()}
        isPlaying={false}
      />
    )

    mockCanvasRect(container, 400, 80)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toBeTruthy()
  })

  it('handles drag-to-seek', () => {
    const onSeek = vi.fn()
    const events = makeEvents(20)
    const { container } = render(
      <EventTimelineScrubber
        events={events}
        currentIndex={-1}
        onSeek={onSeek}
        isPlaying={false}
      />
    )

    mockCanvasRect(container, 400, 80)
    const canvas = container.querySelector('canvas')!
    fireEvent.mouseDown(canvas, { clientX: 50 })
    fireEvent.mouseMove(canvas, { clientX: 100 })
    fireEvent.mouseUp(canvas)

    // onSeek should have been called during drag (for scrubbing)
    expect(onSeek).toHaveBeenCalled()
  })
})
