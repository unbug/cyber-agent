/**
 * Breakpoints — Pause execution when conditions match.
 *
 * Supports three breakpoint kinds:
 *   1. BT node breakpoint — pause when a node enters/exits
 *   2. Blackboard predicate — pause when a bb.set matches a field/value pattern
 *   3. Adapter event breakpoint — pause on a specific adapter.tx/adapter.rx
 *
 * When a breakpoint triggers:
 *   - The tracer emits a `breakpoint.triggered` event
 *   - The tracer sets `paused = true` and notifies listeners
 *   - The UI can inspect state at the pause point and resume
 */

import type { TracerEvent } from './tracer'

// ─── Breakpoint Types ────────────────────────────────────────────

export type BreakpointKind = 'node' | 'blackboard' | 'adapter'

export interface Breakpoint {
  /** Unique ID */
  id: string
  /** Kind of breakpoint */
  kind: BreakpointKind
  /** Human-readable name */
  name: string
  /** Whether this breakpoint is currently enabled */
  enabled: boolean
  /** Condition: depends on kind */
  condition: NodeCondition | BbCondition | AdapterCondition
  /** How many times this BP has triggered */
  hitCount: number
  /** Optional: auto-disable after N hits (0 = never) */
  hitLimit: number
}

export interface NodeCondition {
  type: 'node'
  /** BT node name (supports * wildcard) */
  nodePattern: string
  /** Match on enter, exit, or both */
  phase: 'enter' | 'exit' | 'both'
}

export interface BbCondition {
  type: 'blackboard'
  /** Blackboard field name (supports * wildcard) */
  fieldPattern: string
  /** Optional: match only when value equals this (string or number) */
  valuePattern?: string | number | boolean
}

export interface AdapterCondition {
  type: 'adapter'
  /** Event type */
  eventType: 'adapter.tx' | 'adapter.rx'
  /** Command name (supports * wildcard) */
  commandPattern?: string
}

// ─── Breakpoint Events ───────────────────────────────────────────

/** Extra event type emitted when a breakpoint triggers */
export type BreakpointEventType = 'breakpoint.triggered'

// ─── Breakpoint Manager ──────────────────────────────────────────

let nextId = 1

function generateId(): string {
  return `bp-${nextId++}`
}

/** Simple glob-style pattern match: * matches anything */
function matchesPattern(text: string, pattern: string): boolean {
  if (pattern === '*') return true
  // Escape regex special chars except *
  const regex = new RegExp(
    '^' + pattern.split('*').map(escapeRegex).join('.*') + '$',
  )
  return regex.test(text)
}

function escapeRegex(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}

class BreakpointManager {
  private breakpoints: Map<string, Breakpoint> = new Map()
  private listeners = new Set<() => void>()
  _paused = false

  /** Get all breakpoints */
  getAll(): Breakpoint[] {
    return Array.from(this.breakpoints.values())
  }

  /** Add a new breakpoint */
  add(kind: BreakpointKind, condition: NodeCondition | BbCondition | AdapterCondition, name?: string): Breakpoint {
    const bp: Breakpoint = {
      id: generateId(),
      kind,
      name: name ?? `${kind}: ${JSON.stringify(condition)}`,
      enabled: true,
      condition,
      hitCount: 0,
      hitLimit: 0,
    }
    this.breakpoints.set(bp.id, bp)
    this.notifyListeners()
    return bp
  }

  /** Remove a breakpoint */
  remove(id: string): boolean {
    const deleted = this.breakpoints.delete(id)
    if (deleted) this.notifyListeners()
    return deleted
  }

  /** Toggle enabled/disabled */
  toggle(id: string): boolean {
    const bp = this.breakpoints.get(id)
    if (!bp) return false
    bp.enabled = !bp.enabled
    this.notifyListeners()
    return true
  }

  /** Set hit limit (auto-disable after N hits) */
  setHitLimit(id: string, limit: number): boolean {
    const bp = this.breakpoints.get(id)
    if (!bp) return false
    bp.hitLimit = limit
    return true
  }

  /** Get a single breakpoint */
  get(id: string): Breakpoint | undefined {
    return this.breakpoints.get(id)
  }

  /** Subscribe to breakpoint changes */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private notifyListeners() {
    for (const fn of this.listeners) {
      try { fn() } catch { /* don't break listeners */ }
    }
  }

  /** Evaluate an event against all enabled breakpoints.
   *  Returns the first matching breakpoint (or null if none match). */
  evaluate(event: TracerEvent): Breakpoint | null {
    if (this._paused) return null // already paused, skip

    for (const bp of this.breakpoints.values()) {
      if (!bp.enabled) continue
      if (bp.hitLimit > 0 && bp.hitCount >= bp.hitLimit) {
        bp.enabled = false // auto-disable
        this.notifyListeners()
        continue
      }

      if (this.matches(bp, event)) {
        bp.hitCount++
        return bp
      }
    }
    return null
  }

  private matches(bp: Breakpoint, event: TracerEvent): boolean {
    switch (bp.kind) {
      case 'node': {
        const cond = bp.condition as NodeCondition
        if (cond.phase === 'enter' && event.type !== 'node.enter') return false
        if (cond.phase === 'exit' && event.type !== 'node.exit') return false
        return matchesPattern(event.label, cond.nodePattern)
      }
      case 'blackboard': {
        const cond = bp.condition as BbCondition
        if (event.type !== 'bb.set') return false
        if (!matchesPattern(event.label, cond.fieldPattern)) return false
        if (cond.valuePattern !== undefined) {
          const val = event.payload?.value
          if (val !== cond.valuePattern && String(val) !== String(cond.valuePattern)) return false
        }
        return true
      }
      case 'adapter': {
        const cond = bp.condition as AdapterCondition
        if (event.type !== cond.eventType) return false
        if (cond.commandPattern !== undefined && event.label !== undefined) {
          if (!matchesPattern(event.label, cond.commandPattern)) return false
        }
        return true
      }
    }
    return false
  }

  /** Pause execution and notify listeners */
  pause() {
    this._paused = true
    this.notifyListeners()
  }

  /** Resume execution */
  resume() {
    this._paused = false
    this.notifyListeners()
  }

  /** Clear all breakpoints */
  clear() {
    this.breakpoints.clear()
    this._paused = false
    this.notifyListeners()
  }

  /** Reset hit counts */
  resetHitCounts() {
    for (const bp of this.breakpoints.values()) {
      bp.hitCount = 0
    }
    this.notifyListeners()
  }
}

// ─── Singleton ───────────────────────────────────────────────────

export const breakpoints = new BreakpointManager()

// ─── Convenience helpers ─────────────────────────────────────────

export function addNodeBreakpoint(nodePattern: string, phase: 'enter' | 'exit' | 'both' = 'both', name?: string): Breakpoint {
  return breakpoints.add('node', { type: 'node', nodePattern, phase }, name)
}

export function addBbBreakpoint(fieldPattern: string, valuePattern?: string | number | boolean, name?: string): Breakpoint {
  return breakpoints.add('blackboard', { type: 'blackboard', fieldPattern, valuePattern }, name)
}

export function addAdapterBreakpoint(
  eventType: 'adapter.tx' | 'adapter.rx',
  commandPattern?: string,
  name?: string,
): Breakpoint {
  return breakpoints.add('adapter', { type: 'adapter', eventType, commandPattern }, name)
}

/**
 * Check an event against breakpoints. If any matches, pause and return the trigger.
 * Call this from the tracer's emit path.
 */
export function checkBreakpoints(event: TracerEvent): Breakpoint | null {
  const trigger = breakpoints.evaluate(event)
  if (trigger) {
    breakpoints.pause()
    return trigger
  }
  return null
}
