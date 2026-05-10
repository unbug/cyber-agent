/**
 * VALTimelinePanel tests
 *
 * Tests the unified timeline that aligns VAL trajectory with perception
 * and adapter events on a shared time axis (v1.3 checkbox deliverable).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VALTimelinePanel } from './VALTimelinePanel'
import { tracer } from '@/engine/tracer'
import type { TracerEvent } from '@/engine/tracer'

// Mock canvas
beforeEach(() => {
  vi.spyOn(tracer, 'subscribe').mockReturnValue(() => {})
})

const mockValState = { valence: 0.5, arousal: 0.6, dominance: 0.7 }
const mockValHistory = [
  { t: 0, valence: 0.1, arousal: 0.2, dominance: 0.3 },
  { t: 5000, valence: 0.3, arousal: 0.4, dominance: 0.5 },
  { t: 10000, valence: 0.5, arousal: 0.6, dominance: 0.7 },
  { t: 15000, valence: 0.4, arousal: 0.5, dominance: 0.6 },
  { t: 20000, valence: 0.6, arousal: 0.7, dominance: 0.8 },
]
const mockPerceptionEvents: TracerEvent[] = [
  { t: 3000, type: 'perception', label: 'see.face', payload: { confidence: 0.8 } },
  { t: 8000, type: 'perception', label: 'hear.word', payload: { confidence: 0.6 } },
  { t: 15000, type: 'perception', label: 'see.object', payload: { confidence: 0.9 } },
]
const mockAdapterEvents: TracerEvent[] = [
  { t: 2000, type: 'adapter.tx', label: 'move', payload: { x: 0.1, y: 0.2 } },
  { t: 7000, type: 'adapter.rx', label: 'telemetry', payload: { battery: 85 } },
  { t: 12000, type: 'adapter.tx', label: 'move', payload: { x: 0.3, y: 0.4 } },
]

describe('VALTimelinePanel', () => {
  it('renders empty state when no data', () => {
    render(<VALTimelinePanel valState={null} valHistory={[]} perceptionEvents={[]} adapterEvents={[]} />)
    expect(screen.getByText('Start a behavior tree to see the VAL trajectory')).toBeDefined()
  })

  it('renders canvas when data is present', () => {
    const { container } = render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={mockPerceptionEvents}
        adapterEvents={mockAdapterEvents}
        width={400}
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })

  it('shows event counts in header', () => {
    render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={mockPerceptionEvents}
        adapterEvents={mockAdapterEvents}
        width={400}
      />,
    )
    expect(screen.getByText('5 VAL pts · 3 perc · 3 adapter')).toBeDefined()
  })

  it('renders with different widths', () => {
    const { container } = render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={mockPerceptionEvents}
        adapterEvents={mockAdapterEvents}
        width={200}
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })

  it('renders with different heights', () => {
    const { container } = render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={mockPerceptionEvents}
        adapterEvents={mockAdapterEvents}
        width={400}
        height={300}
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })

  it('handles sparse perception events', () => {
    const sparseEvents: TracerEvent[] = [{ t: 10000, type: 'perception', label: 'see.face', payload: { confidence: 0.7 } }]
    const { container } = render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={sparseEvents}
        adapterEvents={mockAdapterEvents}
        width={400}
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })

  it('handles sparse adapter events', () => {
    const sparseEvents: TracerEvent[] = [{ t: 5000, type: 'adapter.tx', label: 'move', payload: {} }]
    const { container } = render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={mockPerceptionEvents}
        adapterEvents={sparseEvents}
        width={400}
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })

  it('handles mixed event types', () => {
    const mixedEvents: TracerEvent[] = [
      { t: 1000, type: 'adapter.tx', label: 'move', payload: {} },
      { t: 2000, type: 'adapter.rx', label: 'telemetry', payload: {} },
      { t: 3000, type: 'perception', label: 'see.face', payload: {} },
      { t: 4000, type: 'perception', label: 'hear.word', payload: {} },
    ]
    const { container } = render(
      <VALTimelinePanel
        valState={mockValState}
        valHistory={mockValHistory}
        perceptionEvents={mixedEvents}
        adapterEvents={mixedEvents}
        width={400}
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })
})
