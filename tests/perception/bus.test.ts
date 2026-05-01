/**
 * Perception Bus tests
 *
 * Tests the PerceptionBus pub/sub system, event buffering, and
 * tracer integration.
 */

import { describe, it, expect, vi } from 'vitest'
import { PerceptionBus } from '../../src/perception/bus'
import type { PerceptionEvent } from '../../src/perception/types'

describe('PerceptionBus', () => {
  it('publishes events to category subscribers', () => {
    const bus = new PerceptionBus()
    const handler = vi.fn()

    bus.on('see.face', handler)
    bus.publish({
      category: 'see.face',
      payload: { bbox: [0, 0, 100, 100] },
      source: 'webcam',
      timestamp: 1000,
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].category).toBe('see.face')
    expect(handler.mock.calls[0][0].source).toBe('webcam')
  })

  it('publishes events to wildcard subscribers', () => {
    const bus = new PerceptionBus()
    const handler = vi.fn()

    bus.onAll(handler)
    bus.publish({
      category: 'hear.sound',
      payload: { type: 'clap' },
      source: 'microphone',
      timestamp: 2000,
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].category).toBe('hear.sound')
  })

  it('assigns unique event IDs', () => {
    const bus = new PerceptionBus()
    const events: PerceptionEvent[] = []

    bus.onAll((e) => events.push(e))

    bus.publish({ category: 'see.face', payload: {}, source: 'a', timestamp: 1 })
    bus.publish({ category: 'see.face', payload: {}, source: 'b', timestamp: 2 })
    bus.publish({ category: 'see.face', payload: {}, source: 'c', timestamp: 3 })

    expect(events.length).toBe(3)
    expect(events[0].id).not.toBe(events[1].id)
    expect(events[1].id).not.toBe(events[2].id)
  })

  it('respects buffer size limit', () => {
    const bus = new PerceptionBus({ bufferSize: 5 })
    const events: PerceptionEvent[] = []

    bus.onAll((e) => events.push(e))

    for (let i = 0; i < 10; i++) {
      bus.publish({
        category: 'see.object',
        payload: { class: 'test', confidence: 0.5 },
        source: 'webcam',
        timestamp: i,
      })
    }

    const recent = bus.getRecent()
    expect(recent.length).toBe(5)
    // Oldest should be event index 5 (events 0-4 were evicted)
    expect(recent[0].timestamp).toBe(5)
  })

  it('clears all subscribers and buffer', () => {
    const bus = new PerceptionBus()
    const handler = vi.fn()

    bus.on('see.face', handler)
    bus.onAll(() => {})
    bus.publish({ category: 'see.face', payload: {}, source: 'x', timestamp: 1 })
    expect(handler).toHaveBeenCalledTimes(1)

    bus.clear()

    handler.mockClear()
    bus.publish({ category: 'see.face', payload: {}, source: 'x', timestamp: 2 })
    expect(handler).not.toHaveBeenCalled()
    // Buffer still retains events after clear (only subscribers are cleared)
    expect(bus.getRecent()).toHaveLength(1)
  })

  it('does not crash on subscriber errors', () => {
    const bus = new PerceptionBus()

    bus.on('see.face', () => {
      throw new Error('subscriber error')
    })

    expect(() => {
      bus.publish({ category: 'see.face', payload: {}, source: 'x', timestamp: 1 })
    }).not.toThrow()
  })

  it('unsubscribe removes handler', () => {
    const bus = new PerceptionBus()
    const handler = vi.fn()
    const unsubscribe = bus.on('see.face', handler)

    bus.publish({ category: 'see.face', payload: {}, source: 'x', timestamp: 1 })
    expect(handler).toHaveBeenCalledTimes(1)

    unsubscribe()
    handler.mockClear()

    bus.publish({ category: 'see.face', payload: {}, source: 'x', timestamp: 2 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('subscriberCount returns correct count', () => {
    const bus = new PerceptionBus()
    expect(bus.subscriberCount('see.face')).toBe(0)

    bus.on('see.face', () => {})
    expect(bus.subscriberCount('see.face')).toBe(1)

    bus.on('see.face', () => {})
    expect(bus.subscriberCount('see.face')).toBe(2)
  })
})
