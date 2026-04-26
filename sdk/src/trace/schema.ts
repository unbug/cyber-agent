/**
 * .cybertrace — CyberAgent Behavior Trace Format
 *
 * Format: gzipped JSONL (one JSON object per line)
 * File extension: `.cybertrace` (uncompressed) or `.cybertrace.gz` (compressed)
 *
 * Schema versioning:
 *   - Each file starts with a `$schema` header line
 *   - Breaking changes increment `$version`
 *   - Migration registry in `migrations.ts` handles cross-version reads
 *
 * ## Format Spec
 *
 * Line 1 (header):
 *   `{"$schema":"cybertrace/v1","$version":1,"meta":{"platform":"RoboMaster S1","character":"fox","startedAt":"2026-04-26T08:00:00Z","tickRate":30}}`
 *
 * Lines 2+ (events):
 *   `{"t":1234.56,"type":"tick.start","label":"tick.start","payload":{}}`
 *   `{"t":1234.78,"type":"node.enter","label":"RootSelector","payload":{}}`
 *   `{"t":1234.79,"type":"node.exit","label":"RootSelector","payload":{"status":"success"}}`
 *   `{"t":1234.80,"type":"action.dispatch","label":"moveForward","payload":{}}`
 *   `{"t":1234.81,"type":"bb.set","label":"x","payload":{"value":42.5}}`
 *   `{"t":1234.82,"type":"adapter.tx","label":"move_forward","payload":{"speed":0.8}}`
 *   `{"t":1234.83,"type":"adapter.rx","label":"telemetry","payload":{"battery":85}}`
 *   `{"t":1234.84,"type":"error","label":"error","payload":{"message":"timeout"}}`
 *
 * ## Event Schema (v1)
 *
 * | Field    | Type     | Required | Description                          |
 * |----------|----------|----------|--------------------------------------|
 * | $schema  | string   | No*      | Schema URI (only on header line)     |
 * | $version | number   | No*      | Schema version (only on header line) |
 * | t        | number   | Yes      | Monotonic timestamp in ms            |
 * | type     | string   | Yes      | One of the event types below         |
 * | label    | string   | Yes      | Human-readable identifier            |
 * | payload  | object   | No       | Event-specific data                  |
 *
 * ## Event Types
 *
 * | type              | payload schema                          | Description                  |
 * |-------------------|-----------------------------------------|------------------------------|
 * | tick.start        | `{}`                                    | Beginning of a BT tick       |
 * | node.enter        | `{}`                                    | Node begins evaluating       |
 * | node.exit         | `{ status: "success" \| "failure" \| "running" }` | Node finished evaluating |
 * | action.dispatch   | `{ args?: Record<string, unknown> }`   | Leaf action fired            |
 * | bb.set            | `{ field: string, value: unknown }`     | Blackboard field written     |
 * | adapter.tx        | `{ command: string, args?: unknown }`   | Command sent to hardware     |
 * | adapter.rx        | `{ telemetry: Record<string, unknown> }`| Telemetry received from hardware |
 * | error             | `{ message: string, context?: string }` | Runtime error                |
 *
 * ## Meta Schema (header)
 *
 * | Field        | Type   | Description                          |
 * |--------------|--------|--------------------------------------|
 * | platform     | string | Robot platform name                  |
 * | character    | string | Character ID                         |
 * | startedAt    | string | ISO 8601 start timestamp             |
 * | stoppedAt    | string | ISO 8601 stop timestamp              |
 * | tickRate     | number | Target tick rate (Hz)                |
 * | durationMs   | number | Total duration in ms                 |
 * | eventCount   | number | Total events in file                 |
 * | sdkVersion   | string | @cyber-agent/sdk version used        |
 *
 * ## Migration Notes
 *
 * v1 → v2 (proposed):
 *   - payload.bb.set: `{ field, value }` → `{ field, from, to }` (explicit diff)
 *   - payload.adapter.tx: `{ command, args }` → `{ command, args, timestamp }` (per-command timing)
 *
 * Migration scripts are in `migrations.ts`.
 */

// ─── Schema Types ────────────────────────────────────────────────

/** All supported trace event types */
export type TraceEventType =
  | 'tick.start'
  | 'node.enter'
  | 'node.exit'
  | 'action.dispatch'
  | 'bb.set'
  | 'adapter.tx'
  | 'adapter.rx'
  | 'error'

/** Versioned trace event */
export interface TraceEventV1 {
  /** Monotonic timestamp in ms */
  t: number
  /** Event type */
  type: TraceEventType
  /** Human-readable label */
  label: string
  /** Event-specific payload */
  payload?: Record<string, unknown>
}

/** Trace header (first line of file) */
export interface TraceHeader {
  $schema: 'cybertrace/v1'
  $version: 1
  meta: TraceMeta
}

/** Optional metadata in trace header */
export interface TraceMeta {
  platform?: string
  character?: string
  startedAt?: string
  stoppedAt?: string
  tickRate?: number
  durationMs?: number
  eventCount?: number
  sdkVersion?: string
}

/** Parsed trace: header + events */
export interface ParsedTrace {
  header: TraceHeader
  events: TraceEventV1[]
}

/** Result of a trace lint */
export interface LintResult {
  valid: boolean
  errors: LintError[]
  warnings: string[]
  eventCounts: Record<string, number>
  durationMs?: number
  tickRate?: number
}

export interface LintError {
  line: number
  message: string
  severity: 'error' | 'warning'
}

// ─── Schema Constants ────────────────────────────────────────────

export const TRACE_SCHEMA_URI = 'cybertrace/v1' as const
export const TRACE_SCHEMA_VERSION = 1 as const
export const MAX_EVENTS_PER_FILE = 1_000_000

// ─── Validation ──────────────────────────────────────────────────

const VALID_EVENT_TYPES = new Set<TraceEventType>([
  'tick.start',
  'node.enter',
  'node.exit',
  'action.dispatch',
  'bb.set',
  'adapter.tx',
  'adapter.rx',
  'error',
])

/**
 * Validate a single trace event line (parsed JSON).
 * Returns an error string if invalid, or null if valid.
 */
export function validateTraceEvent(
  obj: unknown,
  lineNum: number,
): LintError | null {
  if (obj == null || typeof obj !== 'object') {
    return { line: lineNum, message: 'Expected JSON object', severity: 'error' }
  }

  const record = obj as Record<string, unknown>

  // Required fields
  if (typeof record.t !== 'number') {
    return { line: lineNum, message: 'Missing or invalid "t" (number)', severity: 'error' }
  }
  if (typeof record.type !== 'string') {
    return { line: lineNum, message: 'Missing or invalid "type" (string)', severity: 'error' }
  }
  if (typeof record.label !== 'string') {
    return { line: lineNum, message: 'Missing or invalid "label" (string)', severity: 'error' }
  }

  // Valid event type
  if (!VALID_EVENT_TYPES.has(record.type as TraceEventType)) {
    return {
      line: lineNum,
      message: `Unknown event type: "${record.type}"`,
      severity: 'error',
    }
  }

  // Type-specific payload validation
  if (record.type === 'node.exit') {
    const payload = record.payload as Record<string, unknown> | undefined
    if (payload && typeof payload.status !== 'string') {
      return { line: lineNum, message: '"node.exit" payload.status must be string', severity: 'error' }
    }
  }
  if (record.type === 'bb.set') {
    const payload = record.payload as Record<string, unknown> | undefined
    if (payload && typeof payload.field !== 'string') {
      return { line: lineNum, message: '"bb.set" payload.field must be string', severity: 'error' }
    }
  }
  if (record.type === 'adapter.tx') {
    const payload = record.payload as Record<string, unknown> | undefined
    if (payload && typeof payload.command !== 'string') {
      return { line: lineNum, message: '"adapter.tx" payload.command must be string', severity: 'error' }
    }
  }

  return null
}

/**
 * Validate a trace header line.
 */
export function validateTraceHeader(obj: unknown): LintError | null {
  if (obj == null || typeof obj !== 'object') {
    return { line: 1, message: 'Header must be a JSON object', severity: 'error' }
  }

  const record = obj as Record<string, unknown>

  if (record.$schema !== TRACE_SCHEMA_URI) {
    return {
      line: 1,
      message: `Expected $schema="${TRACE_SCHEMA_URI}", got "${record.$schema}"`,
      severity: 'error',
    }
  }

  if (record.$version !== TRACE_SCHEMA_VERSION) {
    return {
      line: 1,
      message: `Expected $version=${TRACE_SCHEMA_VERSION}, got ${record.$version}`,
      severity: 'error',
    }
  }

  return null
}

/**
 * Lint a trace file content (string).
 * Returns a LintResult with validation summary.
 */
export function lintTrace(content: string): LintResult {
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  const errors: LintError[] = []
  const warnings: string[] = []
  const eventCounts: Record<string, number> = {}

  if (lines.length === 0) {
    return { valid: false, errors: [{ line: 0, message: 'Empty file', severity: 'error' }], warnings, eventCounts }
  }

  // Validate header
  try {
    const header = JSON.parse(lines[0]!) 
    const headerErr = validateTraceHeader(header)
    if (headerErr) {
      errors.push(headerErr)
      return { valid: false, errors, warnings, eventCounts }
    }
  } catch (e) {
    errors.push({ line: 1, message: `Invalid JSON in header: ${(e as Error).message}`, severity: 'error' })
    return { valid: false, errors, warnings, eventCounts }
  }

  // Validate events
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1
    const trimmed = lines[i]!.trim()

    if (trimmed.startsWith('{') === false) {
      errors.push({ line: lineNum, message: 'Line does not start with {', severity: 'error' })
      continue
    }

    let obj: unknown
    try {
      obj = JSON.parse(trimmed)
    } catch (e) {
      errors.push({ line: lineNum, message: `Invalid JSON: ${(e as Error).message}`, severity: 'error' })
      continue
    }

    const eventErr = validateTraceEvent(obj, lineNum)
    if (eventErr) {
      errors.push(eventErr)
      continue
    }

    // Count events by type
    const record = obj as Record<string, unknown>
    const eventType = record.type as string
    eventCounts[eventType] = (eventCounts[eventType] || 0) + 1
  }

  // Warnings
  if (errors.length === 0) {
    const tickCount = eventCounts['tick.start'] || 0
    if (tickCount < 2) {
      warnings.push('Less than 2 tick.start events — trace may be too short to be useful')
    }
    if (lines.length - 1 > MAX_EVENTS_PER_FILE) {
      warnings.push(`Exceeds ${MAX_EVENTS_PER_FILE} events — consider splitting`)
    }
  }

  return { valid: errors.length === 0, errors, warnings, eventCounts }
}

// ─── Schema Registry ─────────────────────────────────────────────

/**
 * Known schema versions and their migration paths.
 * Extensible: add new versions here as they ship.
 */
export interface SchemaVersion {
  version: number
  uri: string
  /** Whether this version is the latest stable */
  stable: boolean
  /** Migration function: (events, meta) → [newEvents, newMeta] */
  migrate?: (events: TraceEventV1[], meta: TraceMeta) => [TraceEventV1[], TraceMeta]
}

export const SCHEMA_REGISTRY: Record<string, SchemaVersion> = {
  [TRACE_SCHEMA_URI]: {
    version: TRACE_SCHEMA_VERSION,
    uri: TRACE_SCHEMA_URI,
    stable: true,
  },
}

/**
 * Get the latest stable schema version.
 */
export function getLatestSchema(): SchemaVersion {
  const stable = Object.values(SCHEMA_REGISTRY).filter(s => s.stable)
  if (stable.length === 0) throw new Error('No stable schema version found')
  return stable[stable.length - 1]!
}

/**
 * Check if a schema URI is supported.
 */
export function isSchemaSupported(uri: string): boolean {
  return uri in SCHEMA_REGISTRY
}

/**
 * Get migration function for a given schema URI (if any).
 */
export function getMigration(uri: string): SchemaVersion['migrate'] | null {
  const schema = SCHEMA_REGISTRY[uri]
  return schema ? schema.migrate ?? null : null
}
