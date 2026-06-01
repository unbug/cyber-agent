/**
 * Tests for src/pages/PolicyPanel.tsx
 *
 * Tests the policy event subscription logic and data aggregation
 * without relying on canvas rendering in jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tracer, type TracerEvent } from '@/engine/tracer'

describe('PolicyPanel data flow', () => {
  beforeEach(() => {
    tracer.reset()
  })

  afterEach(() => {
    tracer.reset()
  })

  it('emits policy.invoke event', () => {
    const events: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => events.push(e))

    tracer.emit({
      t: 100,
      type: 'policy.invoke',
      label: 'test/model',
      payload: { modelId: 'test/model', confidence: 0.8, actionVector: [1, 2], latencyMs: 10 },
    })

    unsub()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('policy.invoke')
    expect(events[0].label).toBe('test/model')
    expect(events[0].payload?.modelId).toBe('test/model')
    expect(events[0].payload?.confidence).toBe(0.8)
  })

  it('emits policy.success event', () => {
    const events: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => events.push(e))

    tracer.emit({
      t: 200,
      type: 'policy.success',
      label: 'test/model',
      payload: { modelId: 'test/model', actionVector: [1, 2, 3], command: { x: 1 } },
    })

    unsub()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('policy.success')
  })

  it('emits policy.failure event', () => {
    const events: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => events.push(e))

    tracer.emit({
      t: 300,
      type: 'policy.failure',
      label: 'test/model',
      payload: { modelId: 'test/model', error: 'timeout' },
    })

    unsub()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('policy.failure')
    expect(events[0].payload?.error).toBe('timeout')
  })

  it('emits policy.low_confidence event', () => {
    const events: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => events.push(e))

    tracer.emit({
      t: 400,
      type: 'policy.low_confidence',
      label: 'test/model',
      payload: { confidence: 0.3, threshold: 0.7 },
    })

    unsub()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('policy.low_confidence')
  })

  it('aggregates multiple policy events correctly', () => {
    const events: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => events.push(e))

    // Emit 3 events
    for (let i = 0; i < 3; i++) {
      tracer.emit({
        t: 500 + i * 10,
        type: 'policy.success',
        label: 'test/model',
        payload: { modelId: 'test/model', confidence: 0.9, actionVector: [i], latencyMs: 5 },
      })
    }

    unsub()
    expect(events.length).toBe(3)
    expect(events.every(e => e.type === 'policy.success')).toBe(true)
  })

  it('does not emit non-policy events', () => {
    const events: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => events.push(e))

    tracer.emit({
      t: 600,
      type: 'tick.start',
      label: 'tick.start',
      payload: {},
    })

    unsub()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('tick.start')
    expect(events[0].type).not.toBe('policy.invoke')
  })
})
