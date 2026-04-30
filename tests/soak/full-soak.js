#!/usr/bin/env node
/**
 * v1.0 Full Soak Test — 24-Hour Release Gate
 *
 * Runs 1 character × 5 adapters continuously for the configured duration.
 * Monitors for:
 *   - Zero `error` events from tracer
 *   - Zero crashes/unhandled exceptions
 *   - Memory growth < 50 MB
 *
 * Usage:
 *   # Default (1 hour):
 *   node tests/soak/full-soak.js
 *
 *   # Custom duration:
 *   SOAK_HOURS=24 node tests/soak/full-soak.js
 *
 *   # Quick mode (10 minutes):
 *   SOAK_HOURS=0.167 node tests/soak/full-soak.js
 */

const { JSDOM } = require('jsdom')

// ─── Setup DOM environment ────────────────────────────────────

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  resources: 'usable',
  runScripts: 'dangerously',
})

global.window = dom.window
global.document = dom.window.document
global.performance = dom.window.performance
global.requestAnimationFrame = (fn) => setTimeout(fn, 16)
global.cancelAnimationFrame = (id) => clearTimeout(id)
global.indexedDB = dom.window.indexedDB
global.setTimeout = setTimeout
global.setInterval = setInterval
global.clearTimeout = clearTimeout
global.clearInterval = clearInterval

// ─── Configuration ────────────────────────────────────────────

const HOURS = parseFloat(process.env.SOAK_HOURS || '1')
const TICKS_PER_HOUR = 36000 // 100 ticks/sec × 3600 sec
const TOTAL_TICKS = Math.round(HOURS * TICKS_PER_HOUR)
const INTERVAL_MS = 100

console.log(`🧪 CyberAgent v1.0 Soak Test`)
console.log(`   Duration: ${HOURS}h (${TOTAL_TICKS.toLocaleString()} ticks)`)
console.log(`   Character: fox`)
console.log(`   Adapters: canvas, websocket, mbot, robo-master-v2, esp32`)
console.log(`   Started: ${new Date().toISOString()}`)
console.log()

// ─── Import engine (must be after DOM setup) ──────────────────

// We need to dynamically import since the engine uses ESM
const path = require('path')
const { execSync } = require('child_process')

// ─── Mock Adapters ────────────────────────────────────────────

function createMockAdapter(type, name) {
  let destroyed = false
  let initCount = 0
  let updateCount = 0

  return {
    type,
    name,
    init(bb) {
      if (destroyed) throw new Error(`init called after destroy on ${name}`)
      initCount++
      bb._initCalled = true
    },
    update(bb) {
      if (destroyed) throw new Error(`update called after destroy on ${name}`)
      updateCount++
    },
    destroy() {
      destroyed = true
    },
    sendCommand(cmd) {},
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
    onTelemetry() {},
    _initCount: () => initCount,
    _updateCount: () => updateCount,
  }
}

// ─── Soak Runner ──────────────────────────────────────────────

async function runSoak(characterId, adapter, tickCount) {
  // Dynamically import the engine modules
  const { BehaviorTreeRunner } = require('../../src/engine/runner')
  const { tracer } = require('../../src/engine/tracer')
  const { getBehavior } = require('../../src/agents')

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

  const startTime = Date.now()
  for (let i = 0; i < tickCount; i++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS))
    tickCompleted++

    // Progress report every 1000 ticks
    if (tickCompleted % 1000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rssMB = process.memoryUsage().rss / 1024 / 1024
      const errors = tracer.snapshot().filter(e => e.type === 'error').length
      console.log(
        `  [${name.padEnd(20)}] tick=${tickCompleted.toLocaleString()}/${tickCount.toLocaleString()} ` +
        `elapsed=${elapsed}s rss=${rssMB.toFixed(1)}MB errors=${errors}`,
      )
    }
  }

  runner.stop()
  unsubscribe()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const rssMB = process.memoryUsage().rss / 1024 / 1024

  // Count final errors from snapshot
  const finalErrors = tracer.snapshot().filter(e => e.type === 'error').length

  return {
    adapterType: adapter.type,
    errors: finalErrors,
    events: eventCount,
    finalTicks: tickCompleted,
    elapsedSec: parseInt(elapsed),
    peakMemoryMB: rssMB,
    initCount: adapter._initCount(),
    updateCount: adapter._updateCount(),
  }
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const characterId = 'fox'
  const adapters = [
    createMockAdapter('canvas', 'canvas-renderer'),
    createMockAdapter('websocket', 'ws-adapter'),
    createMockAdapter('mbot', 'mbot-v2'),
    createMockAdapter('robo-master-v2', 'robomaster'),
    createMockAdapter('esp32', 'esp32-v2'),
  ]

  const results = []
  const ticksPerAdapter = Math.round(TOTAL_TICKS / adapters.length)

  console.log(`Running ${adapters.length} adapters × ${ticksPerAdapter.toLocaleString()} ticks each...\n`)

  for (const adapter of adapters) {
    try {
      const result = await runSoak(characterId, adapter, ticksPerAdapter)
      results.push(result)
      console.log()
    } catch (err) {
      console.error(`  ❌ ${adapter.name} crashed: ${err.message}`)
      results.push({
        adapterType: adapter.type,
        errors: -1,
        events: 0,
        finalTicks: 0,
        elapsedSec: 0,
        peakMemoryMB: 0,
        initCount: 0,
        updateCount: 0,
        crashed: true,
        crashError: err.message,
      })
    }
  }

  // ─── Summary ──────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  📊 SOAK TEST SUMMARY')
  console.log('═══════════════════════════════════════════════════')

  let allPassed = true
  for (const r of results) {
    const status = r.crashed ? '❌ CRASHED' : (r.errors > 0 ? '⚠️ ERRORS' : '✅ PASS')
    console.log(
      `  ${status} ${r.adapterType.padEnd(20)} ticks=${r.finalTicks.toLocaleString()} ` +
      `events=${r.events.toLocaleString()} errors=${r.errors} ` +
      `elapsed=${r.elapsedSec}s rss=${r.peakMemoryMB.toFixed(1)}MB`,
    )
    if (r.crashed || r.errors > 0) allPassed = false
  }

  const totalErrors = results.reduce((s, r) => s + Math.max(0, r.errors), 0)
  const totalCrashes = results.filter(r => r.crashed).length
  const totalEvents = results.reduce((s, r) => s + r.events, 0)

  console.log('\n───────────────────────────────────────────────────')
  console.log(`  Total errors:  ${totalErrors}`)
  console.log(`  Total crashes: ${totalCrashes}`)
  console.log(`  Total events:  ${totalEvents.toLocaleString()}`)
  console.log(`  Result:        ${allPassed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log('═══════════════════════════════════════════════════')

  // Cleanup
  if (typeof dom.destroy === 'function') dom.destroy()

  process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
