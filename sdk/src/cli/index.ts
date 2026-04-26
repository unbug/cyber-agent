#!/usr/bin/env node
/**
 * @cyber-agent/sdk CLI
 *
 * Commands:
 *   record <adapter>   Record adapter events to .cybertrace
 *   replay <file>      Replay a .cybertrace file
 *   trace lint <file>  Lint and validate a .cybertrace file
 */

import { resolve } from 'path'

const cmd = process.argv[2]

switch (cmd) {
  case 'record':
    await import('./record.js')
    break
  case 'replay':
    await import('./replay.js')
    break
  case 'trace':
    if (process.argv[3] === 'lint') {
      await import('./lint.js')
    } else {
      console.error('Unknown trace subcommand: trace ' + (process.argv[3] || '(none)'))
      console.error('Usage: cyber-agent trace lint <file>')
      process.exit(1)
    }
    break
  default:
    console.log('🤖 @cyber-agent/sdk CLI')
    console.log('')
    console.log('Usage:')
    console.log('  cyber-agent record <adapter> [options]  Record adapter events')
    console.log('  cyber-agent replay <file> [options]     Replay a trace file')
    console.log('  npx @cyber-agent/sdk trace lint <file>  Validate a trace file')
    console.log('')
    console.log('Commands:')
    console.log('  record   Capture BT events from a running adapter')
    console.log('  replay   Replay a .cybertrace with timing')
    console.log('  trace    Trace file tools (lint, schema)')
    process.exit(0)
}
