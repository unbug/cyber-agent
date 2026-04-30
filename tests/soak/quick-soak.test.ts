/**
 * v1.0 Quick Soak Gate — 100 ticks × 5 adapters (parallel)
 *
 * Fast CI gate: verifies the core engine survives sustained operation
 * without errors or crashes.
 *
 * 100 ticks × 100ms = 10s per adapter × 5 (parallel) ≈ 12s total
 *
 * Usage:
 *   npx vitest run tests/soak/quick-soak.test.ts
 */

import { describe, it, expect, vi } from 'vitest'
import { BehaviorTreeRunner } from '../../src/engine/runner'
import { tracer } from '../../src/engine/tracer'
import type { RobotAdapter, AdapterCommand, Blackboard } from '../../src/engine/types'
import { createBlackboard } from '../../src/engine/types'
import { getBehavior } from '../../src/agents'

// ─── Configuration ──────────────────────────────────────────────

const SOAK_TICKS = 100
const SOAK_INTERVAL_MS = 100

// ─── Mock Adapters ──────────────────────────────────────────────

function createMockAdapter(type: string, name: string): RobotAdapter {
  let destroyed = false
  return {
    type,
    name,
    init: vi.fn((bb: Blackboard) => {
      if (destroyed) throw new Error(`init called after destroy on ${name}`)
      bb._initCalled = true
    }),
    update: vi.fn((bb: Blackboard) => {
      if (destroyed) throw new Error(`update called after destroy on ${name}`)
      bb._updateCalled = true
    }),
    destroy: vi.fn(() => { destroyed = true }),
    sendCommand: vi.fn((cmd: AdapterCommand) => {}),
    get capabilities() {
      return {
        movement: true,
        led: type !== 'canvas',
        sound: type !== 'canvas',
        sensors: ['battery', 'imu'].includes(type),
        selfTest: true,
      }
    },
    get connected() { return true },
    async connect() { return true },
    async disconnect() { return true },
    async selfTest() { return { ok: true, status: 'ok', checks: [] } },
    onTelemetry: vi.fn(),
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface SoakResult {
  adapterType: string
  errors: number
  events: number
  finalTicks: number
}

async function runSoak(
  characterId: string,
  adapter: RobotAdapter,
  tickCount: number,
  intervalMs: number,
): Promise<SoakResult> {
  const behavior = getBehavior(characterId)
  if (!behavior) throw new Error(`Unknown character: ${characterId}`)

  let errorCount = 0
  let eventCount = 0
  let tickCompleted = 0

  const unsubscribe = tracer.subscribe(event => {
    eventCount++
    if (event.type === 'error') errorCount++
  })

  const runner = new BehaviorTreeRunner(behavior, adapter)
  runner.start()

  for (let i = 0; i < tickCount; i++) {
    await sleep(intervalMs)
    tickCompleted++
  }

  runner.stop()
  unsubscribe()

  return {
    adapterType: adapter.type ?? 'unknown',
    errors: errorCount,
    events: eventCount,
    finalTicks: tickCompleted,
  }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('v1.0 Quick Soak Gate', () => {
  const characterId = 'fox'

  it('runs 5 adapters × 100 ticks (parallel) with zero errors', async () => {
    const adapters = [
      createMockAdapter('canvas', 'canvas-renderer'),
      createMockAdapter('websocket', 'ws-adapter'),
      createMockAdapter('mbot', 'mbot-v2'),
      createMockAdapter('robo-master-v2', 'robomaster'),
      createMockAdapter('esp32', 'esp32-v2'),
    ]

    const results = await Promise.all(
      adapters.map(adapter =>
        runSoak(characterId, adapter, SOAK_TICKS, SOAK_INTERVAL_MS),
      ),
    )

    // Verify all adapters completed
    for (const r of results) {
      expect(r.finalTicks).toBe(SOAK_TICKS)
      expect(r.errors).toBe(0)
      expect(r.events).toBeGreaterThan(0)
      console.log(
        `  ✅ ${r.adapterType.padEnd(20)} ticks=${r.finalTicks} events=${r.events} errors=${r.errors}`,
      )
    }

    // Aggregate assertions
    const totalErrors = results.reduce((s, r) => s + r.errors, 0)
    const totalEvents = results.reduce((s, r) => s + r.events, 0)

    expect(totalErrors).toBe(0)
    expect(totalEvents).toBeGreaterThan(0)
  }, 120_000) // 2 min timeout
})
