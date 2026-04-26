/**
 * Trace schema tests — validate, lint, and schema registry
 */

import { describe, it, expect } from 'vitest'
import {
  lintTrace,
  validateTraceEvent,
  validateTraceHeader,
  getLatestSchema,
  isSchemaSupported,
  getMigration,
  TRACE_SCHEMA_URI,
  TRACE_SCHEMA_VERSION,
  type TraceEventV1,
} from './schema'

// ─── Helper: valid event ────────────────────────────────────────

function makeEvent(overrides: Partial<TraceEventV1> = {}): TraceEventV1 {
  return {
    t: 1000,
    type: 'tick.start',
    label: 'tick.start',
    payload: {},
    ...overrides,
  }
}

// ─── validateTraceEvent ─────────────────────────────────────────

describe('validateTraceEvent', () => {
  it('accepts valid tick.start event', () => {
    const evt = makeEvent({ type: 'tick.start', label: 'tick.start' })
    expect(validateTraceEvent(evt, 1)).toBeNull()
  })

  it('accepts valid node.exit with status', () => {
    const evt = makeEvent({
      type: 'node.exit',
      label: 'RootSelector',
      payload: { status: 'success' },
    })
    expect(validateTraceEvent(evt, 1)).toBeNull()
  })

  it('accepts valid bb.set event', () => {
    const evt = makeEvent({
      type: 'bb.set',
      label: 'x',
      payload: { field: 'x', value: 42 },
    })
    expect(validateTraceEvent(evt, 1)).toBeNull()
  })

  it('accepts valid adapter.tx event', () => {
    const evt = makeEvent({
      type: 'adapter.tx',
      label: 'move_forward',
      payload: { command: 'move_forward', speed: 0.8 },
    })
    expect(validateTraceEvent(evt, 1)).toBeNull()
  })

  it('rejects missing t field', () => {
    const evt = makeEvent({ t: undefined as unknown as number })
    const err = validateTraceEvent(evt, 5)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('t')
  })

  it('rejects missing type field', () => {
    const evt = makeEvent({ type: undefined as unknown as string })
    const err = validateTraceEvent(evt, 5)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('type')
  })

  it('rejects invalid event type', () => {
    const evt = makeEvent({ type: 'unknown.type' })
    const err = validateTraceEvent(evt, 5)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Unknown event type')
  })

  it('rejects node.exit without status string', () => {
    const evt = makeEvent({
      type: 'node.exit',
      label: 'Root',
      payload: { status: 123 },
    })
    const err = validateTraceEvent(evt, 5)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('status')
  })

  it('rejects bb.set without field string', () => {
    const evt = makeEvent({
      type: 'bb.set',
      label: 'x',
      payload: { field: 123, value: 42 },
    })
    const err = validateTraceEvent(evt, 5)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('field')
  })

  it('rejects adapter.tx without command string', () => {
    const evt = makeEvent({
      type: 'adapter.tx',
      label: 'cmd',
      payload: { command: 123 },
    })
    const err = validateTraceEvent(evt, 5)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('command')
  })
})

// ─── validateTraceHeader ────────────────────────────────────────

describe('validateTraceHeader', () => {
  it('accepts valid header', () => {
    const header = { $schema: TRACE_SCHEMA_URI, $version: TRACE_SCHEMA_VERSION }
    expect(validateTraceHeader(header)).toBeNull()
  })

  it('rejects wrong schema URI', () => {
    const header = { $schema: 'cybertrace/v2', $version: TRACE_SCHEMA_VERSION }
    const err = validateTraceHeader(header)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('cybertrace/v1')
  })

  it('rejects wrong version', () => {
    const header = { $schema: TRACE_SCHEMA_URI, $version: 2 }
    const err = validateTraceHeader(header)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('1')
  })

  it('rejects non-object', () => {
    const err = validateTraceHeader('not json' as unknown as object)
    expect(err).not.toBeNull()
  })
})

// ─── lintTrace ──────────────────────────────────────────────────

describe('lintTrace', () => {
  it('validates a complete trace', () => {
    const content = [
      JSON.stringify({ $schema: TRACE_SCHEMA_URI, $version: TRACE_SCHEMA_VERSION, meta: { platform: 'test' } }),
      JSON.stringify(makeEvent({ t: 100, type: 'tick.start', label: 'tick.start' })),
      JSON.stringify(makeEvent({ t: 101, type: 'node.enter', label: 'Root' })),
      JSON.stringify(makeEvent({ t: 102, type: 'action.dispatch', label: 'idle' })),
      JSON.stringify(makeEvent({ t: 103, type: 'bb.set', label: 'x', payload: { field: 'x', value: 1 } })),
      JSON.stringify(makeEvent({ t: 104, type: 'adapter.tx', label: 'cmd', payload: { command: 'idle' } })),
      JSON.stringify(makeEvent({ t: 105, type: 'adapter.rx', label: 'telemetry', payload: { battery: 90 } })),
      JSON.stringify(makeEvent({ t: 106, type: 'error', label: 'error', payload: { message: 'timeout' } })),
    ].join('\n')

    const result = lintTrace(content)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.eventCounts['tick.start']).toBe(1)
    expect(result.eventCounts['node.enter']).toBe(1)
    expect(result.eventCounts['action.dispatch']).toBe(1)
    expect(result.eventCounts['bb.set']).toBe(1)
    expect(result.eventCounts['adapter.tx']).toBe(1)
    expect(result.eventCounts['adapter.rx']).toBe(1)
    expect(result.eventCounts['error']).toBe(1)
  })

  it('rejects invalid JSON in events', () => {
    const content = [
      JSON.stringify({ $schema: TRACE_SCHEMA_URI, $version: TRACE_SCHEMA_VERSION }),
      'not json at all',
    ].join('\n')

    const result = lintTrace(content)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects missing schema header', () => {
    const content = JSON.stringify(makeEvent({ t: 100 }))
    const result = lintTrace(content)
    expect(result.valid).toBe(false)
  })

  it('warns on short traces', () => {
    const content = [
      JSON.stringify({ $schema: TRACE_SCHEMA_URI, $version: TRACE_SCHEMA_VERSION }),
      JSON.stringify(makeEvent({ t: 100, type: 'tick.start', label: 'tick.start' })),
    ].join('\n')

    const result = lintTrace(content)
    expect(result.valid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('Less than 2 tick.start')
  })

  it('handles empty file', () => {
    const result = lintTrace('')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ─── Schema Registry ────────────────────────────────────────────

describe('Schema Registry', () => {
  it('returns the trace schema', () => {
    expect(isSchemaSupported(TRACE_SCHEMA_URI)).toBe(true)
  })

  it('rejects unknown schema', () => {
    expect(isSchemaSupported('unknown/v1')).toBe(false)
  })

  it('returns latest stable schema', () => {
    const latest = getLatestSchema()
    expect(latest.uri).toBe(TRACE_SCHEMA_URI)
    expect(latest.stable).toBe(true)
  })

  it('returns null migration for stable schema', () => {
    expect(getMigration(TRACE_SCHEMA_URI)).toBeNull()
  })
})
