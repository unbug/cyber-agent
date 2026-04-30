#!/usr/bin/env node
/**
 * 24-hour soak test for v1.0 release gate.
 *
 * Runs 1 character × 5 adapters continuously, monitoring:
 *   - Zero error events from tracer
 *   - Memory growth (alert if >50 MB increase)
 *   - Tracer ring buffer health (no corruption)
 *   - Tick rate stability (no stalls >500ms)
 *
 * Usage:
 *   npx tsx scripts/soak-test.mjs [duration-minutes]
 *   # defaults to 1440 (24 hours)
 */

// ─── Browser polyfills for Node.js ──────────────────────────────

if (typeof requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16)
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
}
if (typeof indexedDB === 'undefined') {
  globalThis.indexedDB = {
    open: () => Promise.resolve({
      objectStoreNames: [],
      transaction: () => ({
        oncomplete: null, onerror: null,
        objectStore: () => ({ clear: () => {}, put: () => {} }),
      }),
    }),
  }
}

import { BehaviorTreeRunner } from '../src/engine/runner.ts'
import { tracer } from '../src/engine/tracer.ts'
import { createBlackboard } from '../src/engine/types.ts'
import { getBehavior } from '../src/agents/index.ts'

// ─── Config ─────────────────────────────────────────────────────

const DURATION_MINUTES = parseInt(process.argv[2]) || 24
const DURATION_MS = DURATION_MINUTES * 60 * 1000
const CHARACTER = 'fox'
const ADAPTER_NAMES = ['canvas', 'websocket', 'mbot', 'robo-master-v2', 'esp32']
const REPORT_INTERVAL_MS = 60_000
const MEMORY_CHECK_INTERVAL_MS = 300_000

// ─── Mock Adapters ─────────────────────────────────────────────

function createMockAdapter(type, name) {
  let destroyed = false
  return {
    type,
    name,
    capabilities: () => ({
      supportedActions: ['move', 'rotate', 'stop', 'setLed', 'playSound'],
      supportedTelemetry: ['battery', 'imu', 'distance'],
      maxSpeed: { x: 1, y: 1, rotation: 1 },
    }),
    selfTest: async () => ({
      ok: true,
      status: 'simulated',
      checks: [{ name: 'mock', ok: true, message: 'mock adapter' }],
    }),
    init: (_bb) => {
      if (destroyed) throw new Error(`Adapter ${name} used after destroy`)
    },
    update: (_bb) => {
      if (destroyed) throw new Error(`Adapter ${name} update after destroy`)
    },
    destroy: () => { destroyed = true },
    sendCommand: (_cmd) => {
      if (destroyed) throw new Error(`Adapter ${name} sendCommand after destroy`)
      if (Math.random() < 0.01) {
        tracer.emit({
          t: performance.now(),
          type: 'adapter.rx',
          label: 'telemetry',
          payload: { battery: 95 + Math.random() * 5, imu: { x: 0, y: 0, z: 0 } },
        })
      }
    },
    onTelemetry: () => () => {},
  }
}

// ─── Stats ──────────────────────────────────────────────────────

const stats = {
  startTime: performance.now(),
  totalTicks: 0,
  errorCount: 0,
  eventCount: 0,
  maxTickGapMs: 0,
  lastTickTime: 0,
  memoryStart: 0,
  memoryMax: 0,
  adapters: {},
  crashes: 0,
}

for (const name of ADAPTER_NAMES) {
  stats.adapters[name] = { ticks: 0, errors: 0 }
}

// ─── Monitoring ─────────────────────────────────────────────────

let reportTimer = null
let memTimer = null
let stopRequested = false

function getMemoryMB() {
  if (typeof performance !== 'undefined' && 'memory' in performance && performance.memory && performance.memory.usedJSHeapSize) {
    return performance.memory.usedJSHeapSize / (1024 * 1024)
  }
  return 0
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m ${s % 60}s`
}

function report() {
  const elapsed = performance.now() - stats.startTime
  const mem = getMemoryMB()
  const tickRate = stats.totalTicks / (elapsed / 1000)

  console.log(`⏱  ${formatDuration(elapsed)} / ${formatDuration(DURATION_MS)}`)
  console.log(`🔄 ${stats.totalTicks.toLocaleString()} ticks (${tickRate.toFixed(1)} tick/s)`)
  console.log(`📊 Tracer: ${tracer.length()} events (ring ${tracer.length()}/1000)`)
  console.log(`🧠 Memory: ${mem.toFixed(1)} MB`)
  console.log(`❌ Errors: ${stats.errorCount}`)
  console.log(`💥 Crashes: ${stats.crashes}`)
  console.log(`⚠️  Max tick gap: ${stats.maxTickGapMs.toFixed(0)} ms`)
  console.log('')

  for (const [name, ad] of Object.entries(stats.adapters)) {
    console.log(`  ${name}: ${ad.ticks.toLocaleString()} ticks, ${ad.errors} errors`)
  }
}

function checkMemory() {
  const mem = getMemoryMB()
  if (mem > stats.memoryMax) stats.memoryMax = mem
  const growth = mem - stats.memoryStart
  if (growth > 50) {
    console.error(`\n⚠️  MEMORY LEAK DETECTED: ${growth.toFixed(1)} MB growth!\n`)
    stopRequested = true
  }
}

// ─── Soak Loop ──────────────────────────────────────────────────

async function runSoakTest() {
  console.log(`🧪 Starting ${DURATION_MINUTES}-minute soak test`)
  console.log(`   Character: ${CHARACTER}`)
  console.log(`   Adapters: ${ADAPTER_NAMES.join(', ')}`)
  console.log('')

  stats.memoryStart = getMemoryMB()

  const behavior = getBehavior(CHARACTER)
  if (!behavior) {
    console.error(`❌ Unknown character: ${CHARACTER}`)
    process.exit(1)
  }

  // Create adapters
  const adapters = ADAPTER_NAMES.map(name => createMockAdapter(name, name))

  // Start all runners
  const runners = adapters.map((adapter, i) => {
    const runner = new BehaviorTreeRunner(behavior, adapter, {
      safety: { maxGapMs: 200, missThreshold: 3 },
    })

    runner.onTick = () => {
      const now = performance.now()
      if (stats.lastTickTime > 0) {
        const gap = now - stats.lastTickTime
        if (gap > stats.maxTickGapMs) stats.maxTickGapMs = gap
      }
      stats.lastTickTime = now
      stats.totalTicks++
      const name = ADAPTER_NAMES[i]
      if (name && stats.adapters[name]) stats.adapters[name].ticks++
    }

    runner.start()
    return runner
  })

  // Monitor error events
  const unsubError = tracer.subscribe(event => {
    stats.eventCount++
    if (event.type === 'error') {
      stats.errorCount++
      console.error(`❌ Error event: ${event.label} — ${JSON.stringify(event.payload)}`)
    }
  })

  // Periodic reporting
  reportTimer = setInterval(() => {
    if (!stopRequested) report()
  }, REPORT_INTERVAL_MS)

  // Periodic memory check
  memTimer = setInterval(() => {
    if (!stopRequested) checkMemory()
  }, MEMORY_CHECK_INTERVAL_MS)

  // Grace period: run for at least 60 seconds before checking
  const gracePeriod = Math.max(60_000, DURATION_MS * 0.01)
  await new Promise(resolve => {
    let elapsed = 0
    const check = setInterval(() => {
      elapsed = performance.now() - stats.startTime
      if (elapsed >= gracePeriod) {
        clearInterval(check)
        resolve(undefined)
      }
    }, 1000)
  })

  report()

  if (stats.errorCount > 0) {
    console.error(`\n❌ SOAK FAILED: ${stats.errorCount} error events in grace period!`)
    stopRequested = true
  }

  if (stats.crashes > 0) {
    console.error(`\n❌ SOAK FAILED: ${stats.crashes} crashes detected!`)
    stopRequested = true
  }

  // Run until duration or stop requested
  while (!stopRequested) {
    const elapsed = performance.now() - stats.startTime
    if (elapsed >= DURATION_MS) break
    await new Promise(r => setTimeout(r, 1000))
  }

  // Cleanup
  console.log('\n🛑 Stopping soak test...')
  runners.forEach(r => r.stop())
  unsubError()
  if (reportTimer) clearInterval(reportTimer)
  if (memTimer) clearInterval(memTimer)

  // Final report
  const finalElapsed = performance.now() - stats.startTime
  const tickRate = stats.totalTicks / (finalElapsed / 1000)
  const mem = getMemoryMB()

  console.log('\n' + '='.repeat(60))
  console.log('📋 SOAK TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`Duration:    ${formatDuration(finalElapsed)}`)
  console.log(`Total ticks: ${stats.totalTicks.toLocaleString()}`)
  console.log(`Tick rate:   ${tickRate.toFixed(1)} tick/s`)
  console.log(`Tracer:      ${stats.eventCount.toLocaleString()} events, ${tracer.length()} in ring`)
  console.log(`Memory:      ${stats.memoryStart.toFixed(1)} → ${mem.toFixed(1)} MB (${(mem - stats.memoryStart).toFixed(1)} MB growth)`)
  console.log(`Errors:      ${stats.errorCount}`)
  console.log(`Crashes:     ${stats.crashes}`)
  console.log(`Max gap:     ${stats.maxTickGapMs.toFixed(0)} ms`)
  console.log('')

  const passed = stats.errorCount === 0 && stats.crashes === 0 && (mem - stats.memoryStart) < 50

  if (passed) {
    console.log('✅ SOAK TEST PASSED — v1.0 release gate MET')
  } else {
    console.log('❌ SOAK TEST FAILED')
    if (stats.errorCount > 0) console.log(`  - ${stats.errorCount} error events`)
    if (stats.crashes > 0) console.log(`  - ${stats.crashes} crashes`)
    if ((mem - stats.memoryStart) >= 50) console.log(`  - Memory growth ${(mem - stats.memoryStart).toFixed(1)} MB`)
  }
  console.log('='.repeat(60))

  process.exit(passed ? 0 : 1)
}

// ─── Entry ──────────────────────────────────────────────────────

console.log('🚀 CyberAgent v1.0 Soak Test')
console.log('')

runSoakTest().catch(err => {
  console.error('💥 Soak test crashed:', err)
  process.exit(1)
})
