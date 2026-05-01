/**
 * Webcam Adapter tests
 *
 * Tests the WebcamAdapter in simulation mode (no real camera needed).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebcamAdapter } from '../../src/adapters/webcam'
import { PerceptionBus } from '../../src/perception/bus'

describe('WebcamAdapter', () => {
  let bus: PerceptionBus
  let adapter: WebcamAdapter

  beforeEach(() => {
    bus = new PerceptionBus()
    adapter = new WebcamAdapter({ simulate: true, perceptionBus: bus })
  })

  afterEach(() => {
    adapter.destroy()
  })

  it('connects in simulation mode without error', async () => {
    await expect(adapter.connect()).resolves.not.toThrow()
  })

  it('disconnects cleanly', async () => {
    await adapter.connect()
    expect(() => adapter.disconnect()).not.toThrow()
  })

  it('destroys and cleans up', () => {
    adapter.connect()
    adapter.destroy()
    expect(adapter.isDestroyed).toBe(true)
  })

  it('emits face events to perception bus', async () => {
    const events: any[] = []
    bus.onAll((e) => events.push(e))

    await adapter.connect()

    // Wait for at least one event
    await new Promise((r) => setTimeout(r, 250))

    const faceEvents = events.filter((e) => e.category === 'see.face')
    expect(faceEvents.length).toBeGreaterThan(0)
    expect(faceEvents[0].source).toBe('webcam')
  })

  it('calls face callback on detection', async () => {
    const handler = vi.fn()
    adapter.onFace(handler)

    await adapter.connect()
    await new Promise((r) => setTimeout(r, 250))

    expect(handler.mock.calls.length).toBeGreaterThan(0)
    expect(handler.mock.calls[0][0].category).toBe('see.face')
  })

  it('isAvailable returns boolean', async () => {
    const available = await WebcamAdapter.isAvailable()
    expect(typeof available).toBe('boolean')
  })
})
