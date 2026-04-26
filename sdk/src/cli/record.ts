#!/usr/bin/env node
/**
 * cyber-agent record — Capture adapter events and write a .cybertrace file.
 *
 * Usage:
 *   cyber-agent record <adapter> [options]
 *
 * Options:
 *   -o, --output <file>    Output file (default: trace-<timestamp>.cybertrace)
 *   -d, --duration <ms>    Record duration in ms (default: 60000)
 *   -r, --rate <hz>        Target tick rate (default: 30)
 *   -c, --character <id>   Character ID for metadata
 *   -p, --platform <name>  Platform name for metadata
 *   --json                 Output raw JSON lines (no gzip)
 *
 * Examples:
 *   cyber-agent record mbot -o demo.cybertrace -d 30000
 *   cyber-agent record robo-master -c fox -p "RoboMaster S1"
 */

import { createWriteStream, readFileSync, writeFileSync } from 'fs'
import { createGzip } from 'zlib'
import { resolve } from 'path'
import {
  TRACE_SCHEMA_URI,
  TRACE_SCHEMA_VERSION,
  type TraceEventV1,
  type TraceHeader,
  type TraceMeta,
} from '../trace/schema.js'

// ─── CLI Arg Parser ──────────────────────────────────────────────

interface RecordArgs {
  adapter: string
  output: string
  duration: number
  rate: number
  character: string | undefined
  platform: string | undefined
  json: boolean
}

function parseArgs(argv: string[]): RecordArgs | null {
  const args: RecordArgs = {
    adapter: '',
    output: `trace-${Date.now()}.cybertrace`,
    duration: 60_000,
    rate: 30,
    character: undefined,
    platform: undefined,
    json: false,
  }

  let i = 2 // skip "node" and "record"
  while (i < argv.length) {
    const arg = argv[i]
    switch (arg) {
      case '-o':
      case '--output':
        args.output = argv[++i]
        break
      case '-d':
      case '--duration':
        args.duration = parseInt(argv[++i], 10) || 60_000
        break
      case '-r':
      case '--rate':
        args.rate = parseInt(argv[++i], 10) || 30
        break
      case '-c':
      case '--character':
        args.character = argv[++i]
        break
      case '-p':
      case '--platform':
        args.platform = argv[++i]
        break
      case '--json':
        args.json = true
        break
      default:
        if (!args.adapter) {
          args.adapter = arg
        }
    }
    i++
  }

  if (!args.adapter) {
    console.error('Usage: cyber-agent record <adapter> [options]')
    process.exit(1)
  }

  return args
}

// ─── Trace Writer ────────────────────────────────────────────────

class TraceWriter {
  private stream: ReturnType<typeof createWriteStream>
  private gzip: ReturnType<typeof createGzip> | null
  private eventCount = 0
  private startTime = performance.now()

  constructor(outputPath: string, json: boolean) {
    const baseStream = createWriteStream(outputPath)
    if (json) {
      this.stream = baseStream
      this.gzip = null
    } else {
      this.gzip = createGzip(6)
      this.stream = baseStream.pipe(this.gzip)
    }

    // Write header
    const header: TraceHeader = {
      $schema: TRACE_SCHEMA_URI,
      $version: TRACE_SCHEMA_VERSION,
      meta: {
        startedAt: new Date().toISOString(),
        eventCount: 0,
      },
    }
    this.stream.write(JSON.stringify(header) + '\n')
  }

  writeEvent(event: TraceEventV1) {
    this.stream.write(JSON.stringify({
      t: event.t,
      type: event.type,
      label: event.label,
      payload: event.payload,
    }) + '\n')
    this.eventCount++
  }

  close(meta: Partial<TraceMeta>): void {
    const header = JSON.parse(this.stream.writableEnded ? '' : '{}')
    // Finalize
    if (this.gzip) this.gzip.end()
    this.stream.end()
    console.log(`✅ Wrote ${this.eventCount} events → ${this.stream.writableEnded ? 'done' : 'incomplete'}`)
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv)
  if (!args) return

  console.log(`📡 Recording ${args.adapter} for ${args.duration}ms at ${args.rate}Hz`)
  console.log(`   Output: ${args.output}`)

  const writer = new TraceWriter(args.output, args.json)

  // Simulate adapter events (in production, this would connect to a real adapter)
  const interval = 1000 / args.rate
  const ticks = Math.floor(args.duration / interval)
  let tick = 0

  const timer = setInterval(() => {
    if (tick >= ticks) {
      clearInterval(timer)
      writer.close({
        stoppedAt: new Date().toISOString(),
        durationMs: args.duration,
        eventCount: writer['eventCount'],
        platform: args.platform,
        character: args.character,
        tickRate: args.rate,
        sdkVersion: '1.0.0',
      })
      process.exit(0)
    }

    const t = performance.now()
    writer.writeEvent({ t, type: 'tick.start', label: 'tick.start', payload: {} })
    writer.writeEvent({ t: t + 0.5, type: 'node.enter', label: 'RootSelector', payload: {} })
    writer.writeEvent({ t: t + 1.0, type: 'action.dispatch', label: 'idle', payload: {} })
    writer.writeEvent({ t: t + 1.5, type: 'bb.set', label: 'x', payload: { value: Math.random() * 100 } })
    writer.writeEvent({ t: t + 2.0, type: 'adapter.tx', label: 'telemetry', payload: { command: 'status' } })

    tick++
  }, interval)

  // Safety timeout
  setTimeout(() => {
    clearInterval(timer)
    writer.close({ stoppedAt: new Date().toISOString() })
    process.exit(1)
  }, args.duration + 5000)
}

main().catch(err => {
  console.error('❌ Record failed:', err.message)
  process.exit(1)
})
