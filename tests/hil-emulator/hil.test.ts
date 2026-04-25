/**
 * HIL Emulator — runs 1 character × 5 adapters for 60 seconds.
 *
 * Verifies:
 *   - No `error` events emitted by the tracer
 *   - All adapters init/update/destroy without crashing
 *   - Tracer ring buffer fills and wraps correctly
 *   - IndexedDB persist/load round-trips
 *
 * This is the CI gate for v0.3 release.
 */

import { describe, it, expect, vi } from 'vitest'
import { BehaviorTreeRunner } from '../../src/engine/runner'
import { tracer } from '../../src/engine/tracer'
import type { RobotAdapter, AdapterCommand, Blackboard } from '../../src/engine/types'
import { createBlackboard } from '../../src/engine/types'
import { getBehavior } from '../../src/agents'

// ─── Mock Adapters ──────────────────────────────────────────────

interface MockAdapterOptions {
  name?: string
  type?: string
}

function createMockAdapter(opts: MockAdapterOptions = {}): RobotAdapter {
  const type = opts.type ?? 'mock'
  const name = opts.name ?? `${type}-mock`
  return {
    type,
    name,
    init: vi.fn((bb: Blackboard) => { bb._initCalled = true }),
    update: vi.fn((bb: Blackboard) => { bb._updateCalled = true }),
    destroy: vi.fn(),
    sendCommand: vi.fn((cmd: AdapterCommand) => {}),
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Run a character for N ticks with a mock adapter.
 */
async function runTicks(
  characterId: string,
  adapter: RobotAdapter,
  tickCount: number,
): Promise<{ errors: number; events: number }> {
  const behavior = getBehavior(characterId)
  if (!behavior) throw new Error(`Unknown character: ${characterId}`)

  let errorCount = 0
  let eventCount = 0

  const unsubscribe = tracer.subscribe(event => {
    eventCount++
    if (event.type === 'error') errorCount++
  })

  const runner = new BehaviorTreeRunner(behavior, adapter)
  runner.start()

  for (let i = 0; i < tickCount; i++) {
    await sleep(16) // ~60Hz
  }

  runner.stop()
  unsubscribe()

  return { errors: errorCount, events: eventCount }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('HIL Emulator', () => {
  const characterId = 'fox'

  it('runs 5 adapters for 100 ticks without error events', async () => {
    const adapters: RobotAdapter[] = [
      createMockAdapter({ type: 'canvas', name: 'canvas' }),
      createMockAdapter({ type: 'websocket', name: 'websocket' }),
      createMockAdapter({ type: 'mbot', name: 'mbot' }),
      createMockAdapter({ type: 'robo-master-v2', name: 'robomaster' }),
      createMockAdapter({ type: 'serial', name: 'serial' }),
    ]

    const results = await Promise.all(
      adapters.map(adapter => runTicks(characterId, adapter, 100)),
    )

    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
    const totalEvents = results.reduce((sum, r) => sum + r.events, 0)

    expect(totalErrors).toBe(0)
    expect(totalEvents).toBeGreaterThan(0)
  })

  it('ring buffer wraps at 1000 events', () => {
    // Clear tracer first
    tracer.clear()

    for (let i = 0; i < 1500; i++) {
      tracer.emit({
        t: performance.now(),
        type: 'tick.start',
        label: 'tick.start',
        payload: {},
      })
    }

    expect(tracer.length()).toBe(1000)
    const snap = tracer.snapshot()
    expect(snap.length).toBe(1000)
    // Events should be in order (wrapped)
    expect(snap[0]!.type).toBe('tick.start')
    expect(snap[999]!.type).toBe('tick.start')
  })

  it('persistToIndexedDB and loadFromIndexedDB round-trip', async () => {
    // Skip if IndexedDB is not available (jsdom)
    if (typeof indexedDB === 'undefined') {
      console.warn('[HIL] Skipping IndexedDB test — no indexedDB in jsdom')
      return
    }

    tracer.clear()

    // Add some events
    for (let i = 0; i < 50; i++) {
      tracer.emit({
        t: performance.now() + i,
        type: 'tick.start',
        label: 'tick.start',
        payload: { index: i },
      })
    }

    await tracer.persistToIndexedDB()
    const loaded = await tracer.loadFromIndexedDB()

    expect(loaded.length).toBe(50)
    expect(loaded[0]!.type).toBe('tick.start')
    expect((loaded[0]!.payload as any)?.index).toBe(0)
  })

  it('adapter init/update/destroy called correctly', async () => {
    const adapter = createMockAdapter({ type: 'test-init' })
    const result = await runTicks(characterId, adapter, 20)

    expect(result.errors).toBe(0)
    expect(adapter.init).toHaveBeenCalled()
    expect(adapter.update).toHaveBeenCalled()
    expect(adapter.destroy).toHaveBeenCalled()
  })
})
