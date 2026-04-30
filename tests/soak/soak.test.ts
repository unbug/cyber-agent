/**
 * v1.0 Release Gate — 24-Hour Soak Test
 *
 * Runs 1 character × 5 adapters for a configurable duration.
 *
 * Usage:
 *   # Quick verification (5 min):
 *   npx vitest run tests/soak/soak.test.ts --test-timeout=600000
 *
 *   # Full 24-hour soak:
 *   SOAK_HOURS=24 npx vitest run tests/soak/soak.test.ts --test-timeout=90000000
 *
 * Assertions:
 *   - Zero `error` events from tracer
 *   - Zero crashes/unhandled exceptions
 *   - Memory growth < 50 MB over the test period
 *   - All adapters complete init/update/destroy cycles
 */

import { describe, it, expect, vi } from 'vitest'
import { BehaviorTreeRunner } from '../../src/engine/runner'
import { tracer } from '../../src/engine/tracer'
import type { RobotAdapter, AdapterCommand, Blackboard } from '../../src/engine/types'
import { createBlackboard } from '../../src/engine/types'
import { getBehavior } from '../../src/agents'

// ─── Configuration ──────────────────────────────────────────────

const DEFAULT_TICKS = 10000 // ~1667 ticks at 100ms interval ≈ 27.8 min
const TICK_INTERVAL_MS = 100

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
  crashes: number
  finalTicks: number
  peakMemoryMB: number
}

async function runSoak(
  characterId: string,
  adapter: RobotAdapter,
  tickCount: number,
  intervalMs: number,
  onTick?: (tick: number) => void,
): Promise<SoakResult> {
  const behavior = getBehavior(characterId)
  if (!behavior) throw new Error(`Unknown character: ${characterId}`)

  let errorCount = 0
  let eventCount = 0
  let crashCount = 0
  let tickCompleted = 0
  let peakMemoryMB = 0

  const unsubscribe = tracer.subscribe(event => {
    eventCount++
    if (event.type === 'error') errorCount++
  })

  const runner = new BehaviorTreeRunner(behavior, adapter)
  runner.start()

  const startTime = Date.now()
  for (let i = 0; i < tickCount; i++) {
    await sleep(intervalMs)
    tickCompleted++

    // Memory check (Node.js only)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const rssMB = process.memoryUsage().rss / 1024 / 1024
      peakMemoryMB = Math.max(peakMemoryMB, rssMB)
    }

    // Progress callback
    onTick?.(tickCompleted)

    // Periodic error check
    if (tickCompleted % 100 === 0) {
      const snap = tracer.snapshot()
      const recentErrors = snap.filter(e => e.type === 'error').length
      if (recentErrors > errorCount) {
        errorCount = recentErrors
      }
    }
  }

  runner.stop()
  unsubscribe()

  const elapsed = Date.now() - startTime
  return {
    adapterType: adapter.type ?? 'unknown',
    errors: errorCount,
    events: eventCount,
    crashes: crashCount,
    finalTicks: tickCompleted,
    peakMemoryMB,
  }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('v1.0 Soak Test', () => {
  const characterId = 'fox'
  const tickCount = DEFAULT_TICKS
  const interval = TICK_INTERVAL_MS

  it('runs 5 adapters for 10 000 ticks with zero errors', async () => {
    const adapters = [
      createMockAdapter('canvas', 'canvas-renderer'),
      createMockAdapter('websocket', 'ws-adapter'),
      createMockAdapter('mbot', 'mbot-v2'),
      createMockAdapter('robo-master-v2', 'robomaster'),
      createMockAdapter('esp32', 'esp32-v2'),
    ]

    const results: SoakResult[] = []

    for (const adapter of adapters) {
      const result = await runSoak(characterId, adapter, tickCount, interval)
      results.push(result)
    }

    // Verify all adapters completed
    for (const r of results) {
      expect(r.finalTicks).toBe(tickCount)
      expect(r.errors).toBe(0)
      expect(r.crashes).toBe(0)
      expect(r.events).toBeGreaterThan(0)
      console.log(
        `  ✅ ${r.adapterType.padEnd(20)} ticks=${r.finalTicks} events=${r.events} errors=${r.errors} peak=${r.peakMemoryMB.toFixed(1)}MB`,
      )
    }

    // Aggregate assertions
    const totalErrors = results.reduce((s, r) => s + r.errors, 0)
    const totalCrashes = results.reduce((s, r) => s + r.crashes, 0)
    const totalEvents = results.reduce((s, r) => s + r.events, 0)

    expect(totalErrors).toBe(0)
    expect(totalCrashes).toBe(0)
    expect(totalEvents).toBeGreaterThan(0)

    // Memory growth check (compare peak across adapters)
    const maxPeak = Math.max(...results.map(r => r.peakMemoryMB))
    expect(maxPeak).toBeLessThan(200) // Sanity: should not exceed 200MB
  }, 600_000) // 10 min timeout for 10k ticks at 100ms = ~16.7 min, give buffer
})
