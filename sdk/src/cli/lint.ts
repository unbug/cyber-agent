#!/usr/bin/env node
/**
 * npx @cyber-agent/sdk trace lint — Validate a .cybertrace file.
 *
 * Usage:
 *   npx @cyber-agent/sdk trace lint <file> [options]
 *
 * Options:
 *   -q, --quiet       Only show errors (no summary)
 *   -v, --verbose     Show detailed event breakdown
 *   --exit            Exit with code 1 if invalid
 *
 * Examples:
 *   npx @cyber-agent/sdk trace lint trace.cybertrace
 *   npx @cyber-agent/sdk trace lint trace.cybertrace --quiet
 */

import { readFileSync } from 'fs'
import { resolve, extname } from 'path'
import { createReadStream } from 'fs'
import { createGunzip } from 'zlib'
import { createInterface } from 'readline'
import {
  lintTrace,
  type LintResult,
} from '../trace/schema.js'

// ─── CLI Arg Parser ──────────────────────────────────────────────

interface LintArgs {
  file: string
  quiet: boolean
  verbose: boolean
  exit: boolean
}

function parseArgs(argv: string[]): LintArgs | null {
  const args: LintArgs = {
    file: '',
    quiet: false,
    verbose: false,
    exit: false,
  }

  let i = 3 // skip "node", "npx", "@cyber-agent/sdk"
  // Also handle "cyber-agent trace lint"
  if (argv[2] === 'trace') i = 2

  while (i < argv.length) {
    const arg = argv[i]
    switch (arg) {
      case '-q':
      case '--quiet':
        args.quiet = true
        break
      case '-v':
      case '--verbose':
        args.verbose = true
        break
      case '--exit':
        args.exit = true
        break
      default:
        if (!args.file) {
          args.file = arg
        }
    }
    i++
  }

  if (!args.file) {
    console.error('Usage: npx @cyber-agent/sdk trace lint <file> [options]')
    process.exit(1)
  }

  return args
}

// ─── Trace Header Reader ─────────────────────────────────────────

async function readTraceHeader(filePath: string): Promise<Record<string, unknown> | null> {
  const ext = extname(filePath)
  let inputStream: ReturnType<typeof createReadStream>

  if (ext === '.gz') {
    inputStream = createReadStream(filePath).pipe(createGunzip())
  } else {
    inputStream = createReadStream(filePath)
  }

  const rl = createInterface({ input: inputStream, crlfDelay: Infinity })

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const obj = JSON.parse(trimmed)
      if (obj.$schema && obj.$version) {
        return obj
      }
    } catch {
      // Skip
    }
    break
  }

  return null
}

// ─── Output ──────────────────────────────────────────────────────

function formatResult(result: LintResult, args: LintArgs) {
  if (!args.quiet && !args.verbose) {
    if (result.valid) {
      console.log('✅ Trace is valid')
    } else {
      console.log(`❌ Trace has ${result.errors.length} error(s)`)
    }
  }

  if (args.verbose || !result.valid) {
    for (const err of result.errors) {
      const prefix = err.severity === 'error' ? '❌' : '⚠️'
      console.log(`  ${prefix} Line ${err.line}: ${err.message}`)
    }

    for (const warn of result.warnings) {
      console.log(`  ⚠️  ${warn}`)
    }
  }

  if (args.verbose) {
    console.log('\n📊 Event breakdown:')
    for (const [type, count] of Object.entries(result.eventCounts)) {
      console.log(`   ${type.padEnd(18)} ${count}`)
    }
    if (result.durationMs) {
      console.log(`   ${'Duration'.padEnd(18)} ${(result.durationMs / 1000).toFixed(2)}s`)
    }
    if (result.tickRate) {
      console.log(`   ${'Tick Rate'.padEnd(18)} ${result.tickRate}Hz`)
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv)
  if (!args) return

  const filePath = resolve(args.file)

  // Check file exists
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch (err) {
    console.error(`❌ Cannot read file: ${(err as Error).message}`)
    if (args.exit) process.exit(1)
    return
  }

  // Check schema header
  const header = await readTraceHeader(filePath)
  if (!header) {
    console.error('❌ No schema header found in trace file')
    if (args.exit) process.exit(1)
    return
  }

  // Lint
  const result = lintTrace(content)
  formatResult(result, args)

  if (args.exit && !result.valid) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Lint failed:', err.message)
  process.exit(1)
})
