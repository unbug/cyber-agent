#!/usr/bin/env node
/**
 * cyber-agent replay — Replay a .cybertrace file with timing.
 *
 * Usage:
 *   cyber-agent replay <file> [options]
 *
 * Options:
 *   -f, --fast           Replay at full speed (no delay)
 *   -s, --speed <n>      Speed multiplier (default: 1.0)
 *   -n, --events <n>     Stop after N events (default: all)
 *   --schema             Show trace schema info only
 *   --json               Output raw JSON lines
 *
 * Examples:
 *   cyber-agent replay demo.cybertrace
 *   cyber-agent replay demo.cybertrace -f
 *   cyber-agent replay demo.cybertrace --schema
 */

import { readFileSync, createReadStream } from 'fs'
import { createGunzip } from 'zlib'
import { resolve, extname } from 'path'
import { createInterface } from 'readline'
import {
  TRACE_SCHEMA_URI,
  TRACE_SCHEMA_VERSION,
  type TraceEventV1,
  type TraceHeader,
} from '../trace/schema.js'

// ─── CLI Arg Parser ──────────────────────────────────────────────

interface ReplayArgs {
  file: string
  fast: boolean
  speed: number
  maxEvents: number | undefined
  schema: boolean
  json: boolean
}

function parseArgs(argv: string[]): ReplayArgs | null {
  const args: ReplayArgs = {
    file: '',
    fast: false,
    speed: 1.0,
    maxEvents: undefined,
    schema: false,
    json: false,
  }

  let i = 2
  while (i < argv.length) {
    const arg = argv[i]
    switch (arg) {
      case '-f':
      case '--fast':
        args.fast = true
        break
      case '-s':
      case '--speed':
        args.speed = parseFloat(argv[++i]) || 1.0
        break
      case '-n':
      case '--events':
        args.maxEvents = parseInt(argv[++i], 10)
        break
      case '--schema':
        args.schema = true
        break
      case '--json':
        args.json = true
        break
      default:
        if (!args.file) {
          args.file = arg
        }
    }
    i++
  }

  if (!args.file) {
    console.error('Usage: cyber-agent replay <file> [options]')
    process.exit(1)
  }

  return args
}

// ─── Trace Reader ────────────────────────────────────────────────

async function* readTraceEvents(filePath: string): AsyncGenerator<TraceEventV1 | TraceHeader> {
  const ext = extname(filePath)
  let inputStream: ReturnType<typeof createReadStream>

  if (ext === '.gz') {
    inputStream = createReadStream(filePath).pipe(createGunzip())
  } else {
    inputStream = createReadStream(filePath)
  }

  const rl = createInterface({ input: inputStream, crlfDelay: Infinity })

  let isFirstLine = true
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      const obj = JSON.parse(trimmed)
      if (isFirstLine && obj.$schema && obj.$version) {
        isFirstLine = false
        yield obj as TraceHeader
        continue
      }
      isFirstLine = false
      yield obj as TraceEventV1
    } catch {
      // Skip unparseable lines
    }
  }
}

// ─── Schema Info ─────────────────────────────────────────────────

async function showSchemaInfo(filePath: string) {
  const events: TraceEventV1[] = []
  let header: TraceHeader | null = null

  for await (const item of readTraceEvents(filePath)) {
    if ('$schema' in item) {
      header = item as TraceHeader
    } else {
      events.push(item as TraceEventV1)
    }
  }

  if (!header) {
    console.error('❌ No schema header found')
    process.exit(1)
  }

  const typeCounts: Record<string, number> = {}
  for (const evt of events) {
    typeCounts[evt.type] = (typeCounts[evt.type] || 0) + 1
  }

  const durationMs = events.length > 0
    ? events[events.length - 1].t - events[0].t
    : 0

  console.log('📋 Trace Schema Info')
  console.log(`   Schema:   ${header.$schema}`)
  console.log(`   Version:  ${header.$version}`)
  console.log(`   Events:   ${events.length}`)
  console.log(`   Duration: ${durationMs.toFixed(0)}ms`)
  console.log(`   Meta:     ${JSON.stringify(header.meta)}`)
  console.log('   Events by type:')
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`     ${type.padEnd(18)} ${count}`)
  }
}

// ─── Replay ──────────────────────────────────────────────────────

async function replayTrace(filePath: string, fast: boolean, speed: number, maxEvents: number | undefined) {
  let eventCount = 0
  let firstTime = 0
  let prevTime = 0
  let header: TraceHeader | null = null

  for await (const item of readTraceEvents(filePath)) {
    if ('$schema' in item) {
      header = item as TraceHeader
      continue
    }

    const evt = item as TraceEventV1

    if (eventCount === 0) {
      firstTime = evt.t
      prevTime = evt.t
    }

    if (!fast) {
      const delay = (evt.t - prevTime) * speed
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay))
      }
      prevTime = evt.t
    }

    const prefix = header?.meta?.character
      ? `[${header.meta.character}]`
      : ''
    const timeLabel = `+${((evt.t - firstTime) / 1000).toFixed(2)}s`

    if (evt.type === 'error') {
      console.error(`${prefix} ${timeLabel} ❌ ${evt.label}: ${JSON.stringify(evt.payload)}`)
    } else if (evt.type === 'bb.set') {
      const val = evt.payload?.value
      console.log(`${prefix} ${timeLabel} 🧠 ${evt.label} = ${typeof val === 'object' ? JSON.stringify(val) : val}`)
    } else if (evt.type === 'adapter.tx') {
      console.log(`${prefix} ${timeLabel} ➡️ ${evt.label} ${JSON.stringify(evt.payload)}`)
    } else if (evt.type === 'adapter.rx') {
      console.log(`${prefix} ${timeLabel} ⬅️ ${JSON.stringify(evt.payload)}`)
    } else if (evt.type === 'action.dispatch') {
      console.log(`${prefix} ${timeLabel} ⚡ ${evt.label}`)
    } else if (evt.type === 'node.enter') {
      console.log(`${prefix} ${timeLabel} 🌳 → ${evt.label}`)
    } else if (evt.type === 'tick.start') {
      // Silent
    }

    eventCount++
    if (maxEvents && eventCount >= maxEvents) break
  }

  if (eventCount === 0) {
    console.error('❌ No events found in trace')
    process.exit(1)
  }

  console.log(`\n✅ Replayed ${eventCount} events`)
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv)
  if (!args) return

  const filePath = resolve(args.file)

  try {
    if (args.schema) {
      await showSchemaInfo(filePath)
    } else {
      await replayTrace(filePath, args.fast, args.speed, args.maxEvents)
    }
  } catch (err) {
    console.error(`❌ Replay failed: ${(err as Error).message}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Replay failed:', err.message)
  process.exit(1)
})
