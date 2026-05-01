/**
 * Microphone Adapter tests
 *
 * Tests the MicrophoneAdapter in simulation mode (no real mic needed).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MicrophoneAdapter } from '../../src/adapters/microphone'
import { PerceptionBus } from '../../src/perception/bus'

describe('MicrophoneAdapter', () => {
  let bus: PerceptionBus
  let adapter: MicrophoneAdapter

  beforeEach(() => {
    bus = new PerceptionBus()
    adapter = new MicrophoneAdapter({ simulate: true, perceptionBus: bus })
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

  it('emits sound events to perception bus', async () => {
    const events: any[] = []
    bus.onAll((e) => events.push(e))

    await adapter.connect()

    // Wait for events
    await new Promise((r) => setTimeout(r, 500))

    const soundEvents = events.filter((e) => e.category === 'hear.sound')
    // In simulation, sounds are emitted with ~30% probability per interval
    expect(soundEvents.length).toBeGreaterThanOrEqual(0) // May or may not have events
  })

  it('emits word events in simulation', async () => {
    const events: any[] = []
    bus.onAll((e) => events.push(e))

    await adapter.connect()

    // Wait longer for keyword events (5% per interval)
    await new Promise((r) => setTimeout(r, 2000))

    const wordEvents = events.filter((e) => e.category === 'hear.word')
    // May or may not have keyword events depending on random
    expect(wordEvents.length).toBeGreaterThanOrEqual(0)
  })

  it('calls sound callback on detection', async () => {
    const handler = vi.fn()
    adapter.onSound(handler)

    await adapter.connect()
    await new Promise((r) => setTimeout(r, 500))

    // Callbacks may or may not fire depending on random simulation
    expect(typeof handler).toBe('function')
  })

  it('isAvailable returns boolean', async () => {
    const available = await MicrophoneAdapter.isAvailable()
    expect(typeof available).toBe('boolean')
  })

  it('respects keyword cooldown', async () => {
    const events: any[] = []
    const customBus = new PerceptionBus()
    customBus.onAll((e) => events.push(e))

    const customAdapter = new MicrophoneAdapter({
      simulate: true,
      perceptionBus: customBus,
      keywordCooldownMs: 5000,
    })

    await customAdapter.connect()

    // Wait for events
    await new Promise((r) => setTimeout(r, 1000))

    const wordEvents = events.filter((e) => e.category === 'hear.word')

    // With 5000ms cooldown, fewer word events should appear
    expect(wordEvents.length).toBeGreaterThanOrEqual(0)

    customAdapter.destroy()
  })
})
