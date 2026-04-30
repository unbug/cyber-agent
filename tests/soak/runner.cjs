#!/usr/bin/env node
/**
 * v1.0 Soak Test Runner
 *
 * Runs 1 character × 5 adapters continuously.
 * Monitors for errors, crashes, and memory growth.
 *
 * Usage:
 *   SOAK_TICKS=1000 node tests/soak/runner.js          # 1000 ticks
 *   SOAK_TICKS=36000 node tests/soak/runner.js          # ~1 hour
 *   SOAK_TICKS=864000 node tests/soak/runner.js         # ~24 hours
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
global.performance = { now: () => Date.now() }
global.requestAnimationFrame = (fn) => setTimeout(fn, 16)
global.cancelAnimationFrame = (id) => clearTimeout(id)
global.setTimeout = setTimeout
global.setInterval = setInterval
global.clearTimeout = clearTimeout
global.clearInterval = clearInterval
global.indexedDB = null // Not needed for soak

// ─── Configuration ────────────────────────────────────────────

const TOTAL_TICKS = parseInt(process.env.SOAK_TICKS || '1000', 10)
const INTERVAL_MS = 100

console.log(`🧪 CyberAgent v1.0 Soak Test`)
console.log(`   Ticks: ${TOTAL_TICKS.toLocaleString()}`)
console.log(`   Interval: ${INTERVAL_MS}ms`)
console.log(`   Started: ${new Date().toISOString()}`)
console.log()

// ─── Mock Adapters ────────────────────────────────────────────

function createMockAdapter(type, name) {
  let destroyed = false
  let initCount = 0
  let updateCount = 0
  let commandCount = 0

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
    sendCommand(cmd) {
      commandCount++
    },
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
    _stats: () => ({ initCount, updateCount, commandCount }),
  }
}

// ─── Soak Runner ──────────────────────────────────────────────

async function runSoak(characterId, adapter, tickCount) {
  const { BehaviorTreeRunner } = require('../../src/engine/runner')
  const { tracer } = require('../../src/engine/tracer')
  const { getBehavior } = require('../../src/agents')

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

  const startTime = Date.now()
  for (let i = 0; i < tickCount; i++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS))
  }

  runner.stop()
  unsubscribe()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const finalErrors = tracer.snapshot().filter(e => e.type === 'error').length

  return {
    adapterType: adapter.type,
    errors: finalErrors,
    events: eventCount,
    elapsedSec: parseInt(elapsed),
    rssMB: process.memoryUsage().rss / 1024 / 1024,
    stats: adapter._stats(),
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

  const ticksPerAdapter = Math.ceil(TOTAL_TICKS / adapters.length)
  const results = []

  console.log(`Running ${adapters.length} adapters × ${ticksPerAdapter.toLocaleString()} ticks each...\n`)

  for (const adapter of adapters) {
    try {
      const result = await runSoak(characterId, adapter, ticksPerAdapter)
      results.push(result)
      console.log(`  ✅ ${adapter.name.padEnd(20)} ticks=${ticksPerAdapter.toLocaleString()} ` +
        `events=${result.events.toLocaleString()} errors=${result.errors} ` +
        `elapsed=${result.elapsedSec}s rss=${result.rssMB.toFixed(1)}MB`)
      console.log(`     commands=${result.stats.commandCount} init=${result.stats.initCount} ` +
        `update=${result.stats.updateCount}`)
      console.log()
    } catch (err) {
      console.error(`  ❌ ${adapter.name} crashed: ${err.message}`)
      results.push({
        adapterType: adapter.type,
        errors: -1,
        events: 0,
        elapsedSec: 0,
        rssMB: 0,
        stats: { initCount: 0, updateCount: 0, commandCount: 0 },
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
      `  ${status} ${r.adapterType.padEnd(20)} ticks=${ticksPerAdapter.toLocaleString()} ` +
      `events=${r.events.toLocaleString()} errors=${r.errors} ` +
      `elapsed=${r.elapsedSec}s rss=${r.rssMB.toFixed(1)}MB`,
    )
    if (r.crashed || r.errors > 0) allPassed = false
  }

  const totalErrors = results.reduce((s, r) => s + Math.max(0, r.errors), 0)
  const totalCrashes = results.filter(r => r.crashed).length
  const totalEvents = results.reduce((s, r) => s + r.events, 0)
  const totalCommands = results.reduce((s, r) => s + r.stats.commandCount, 0)

  console.log('\n───────────────────────────────────────────────────')
  console.log(`  Total errors:     ${totalErrors}`)
  console.log(`  Total crashes:    ${totalCrashes}`)
  console.log(`  Total events:     ${totalEvents.toLocaleString()}`)
  console.log(`  Total commands:   ${totalCommands.toLocaleString()}`)
  console.log(`  Result:           ${allPassed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`  Finished:         ${new Date().toISOString()}`)
  console.log('═══════════════════════════════════════════════════')

  process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
