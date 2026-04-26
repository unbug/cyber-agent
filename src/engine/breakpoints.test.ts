/**
 * Breakpoints — unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  breakpoints,
  addNodeBreakpoint,
  addBbBreakpoint,
  addAdapterBreakpoint,
  checkBreakpoints,
} from './breakpoints'

// Shared mock event helper
function makeEvent(type: string, label: string, payload?: Record<string, unknown>) {
  return {
    t: Date.now(),
    type: type as any,
    label,
    payload: payload ?? {},
  }
}

describe('breakpoints', () => {
  beforeEach(() => {
    breakpoints.clear()
  })

  describe('add / get / remove', () => {
    it('adds and retrieves a node breakpoint', () => {
      const bp = addNodeBreakpoint('Root*', 'enter')
      expect(bp.kind).toBe('node')
      expect(bp.enabled).toBe(true)
      expect(bp.hitCount).toBe(0)
      const retrieved = breakpoints.get(bp.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.name).toBe(bp.name)
    })

    it('adds and removes a blackboard breakpoint', () => {
      const bp = addBbBreakpoint('battery')
      expect(breakpoints.getAll().length).toBe(1)
      const removed = breakpoints.remove(bp.id)
      expect(removed).toBe(true)
      expect(breakpoints.getAll().length).toBe(0)
    })

    it('adds an adapter breakpoint', () => {
      const bp = addAdapterBreakpoint('adapter.tx', 'move_*')
      expect(bp.kind).toBe('adapter')
      const cond = bp.condition as any
      expect(cond.eventType).toBe('adapter.tx')
      expect(cond.commandPattern).toBe('move_*')
    })
  })

  describe('toggle', () => {
    it('toggles enabled state', () => {
      const bp = addNodeBreakpoint('test')
      expect(bp.enabled).toBe(true)
      breakpoints.toggle(bp.id)
      expect(bp.enabled).toBe(false)
      breakpoints.toggle(bp.id)
      expect(bp.enabled).toBe(true)
    })

    it('returns false for unknown id', () => {
      expect(breakpoints.toggle('nonexistent')).toBe(false)
    })
  })

  describe('pattern matching', () => {
    it('matches exact node name', () => {
      const bp = addNodeBreakpoint('RootSelector', 'both')
      const evt = makeEvent('node.enter', 'RootSelector')
      expect(breakpoints.evaluate(evt)).toBe(bp)
    })

    it('matches wildcard node name', () => {
      const bp = addNodeBreakpoint('Root*', 'both')
      expect(breakpoints.evaluate(makeEvent('node.enter', 'RootSelector'))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('node.enter', 'RootAction'))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('node.enter', 'Other'))).toBeNull()
    })

    it('matches exact field name', () => {
      const bp = addBbBreakpoint('battery')
      const evt = makeEvent('bb.set', 'battery', { value: 85 })
      expect(breakpoints.evaluate(evt)).toBe(bp)
    })

    it('matches wildcard field name', () => {
      const bp = addBbBreakpoint('*battery*')
      expect(breakpoints.evaluate(makeEvent('bb.set', 'battery_level', { value: 85 }))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('bb.set', 'low_battery', { value: true }))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('bb.set', 'temp', { value: 30 }))).toBeNull()
    })

    it('matches adapter command pattern', () => {
      const bp = addAdapterBreakpoint('adapter.tx', 'move_*')
      expect(breakpoints.evaluate(makeEvent('adapter.tx', 'move_forward', {}))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('adapter.tx', 'move_backward', {}))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('adapter.tx', 'turn_left', {}))).toBeNull()
      expect(breakpoints.evaluate(makeEvent('adapter.rx', 'telemetry', {}))).toBeNull()
    })

    it('matches adapter event type without command pattern', () => {
      const bp = addAdapterBreakpoint('adapter.rx')
      expect(breakpoints.evaluate(makeEvent('adapter.rx', 'telemetry', {}))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('adapter.tx', 'move', {}))).toBeNull()
    })
  })

  describe('value matching', () => {
    it('matches bb.set when value pattern matches', () => {
      const bp = addBbBreakpoint('battery', 85)
      expect(breakpoints.evaluate(makeEvent('bb.set', 'battery', { value: 85 }))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('bb.set', 'battery', { value: 50 }))).toBeNull()
    })

    it('matches bb.set when value pattern matches as string', () => {
      const bp = addBbBreakpoint('status', 'ready')
      expect(breakpoints.evaluate(makeEvent('bb.set', 'status', { value: 'ready' }))).toBe(bp)
      expect(breakpoints.evaluate(makeEvent('bb.set', 'status', { value: 'idle' }))).toBeNull()
    })
  })

  describe('hit counting and hit limit', () => {
    it('increments hit count on each trigger', () => {
      const bp = addNodeBreakpoint('test', 'both')
      const evt = makeEvent('node.enter', 'test')
      breakpoints.evaluate(evt)
      breakpoints.evaluate(evt)
      breakpoints.evaluate(evt)
      expect(bp.hitCount).toBe(3)
    })

    it('auto-disables when hit limit reached', () => {
      const bp = addNodeBreakpoint('test', 'both')
      breakpoints.setHitLimit(bp.id, 2)
      const evt = makeEvent('node.enter', 'test')
      const t1 = breakpoints.evaluate(evt)
      expect(t1).toBe(bp)
      expect(bp.enabled).toBe(true)
      const t2 = breakpoints.evaluate(evt)
      expect(t2).toBe(bp) // second hit, still enabled
      expect(bp.enabled).toBe(true)
      expect(bp.hitCount).toBe(2)
      // Third hit should auto-disable
      const t3 = breakpoints.evaluate(evt)
      expect(t3).toBeNull() // auto-disabled
      // Re-fetch bp to get latest state (bp ref may be stale after clear)
      const latest = breakpoints.get(bp.id)
      expect(latest?.enabled).toBe(false)
    })
  })

  describe('pause / resume', () => {
    it('pauses and resumes', () => {
      const bp = addNodeBreakpoint('test', 'both')
      const evt = makeEvent('node.enter', 'test')
      breakpoints.pause()
      expect(breakpoints.evaluate(evt)).toBeNull() // paused, skip
      breakpoints.resume()
      expect(breakpoints.evaluate(evt)).toBe(bp)
    })
  })

  describe('checkBreakpoints', () => {
    it('returns trigger and pauses', () => {
      const bp = addNodeBreakpoint('Root*', 'both')
      const evt = makeEvent('node.enter', 'RootSelector')
      const result = checkBreakpoints(evt)
      expect(result).toBe(bp)
      expect(breakpoints._paused).toBe(true)
    })
  })

  describe('clear and reset', () => {
    it('clears all breakpoints', () => {
      addNodeBreakpoint('a')
      addBbBreakpoint('b')
      breakpoints.clear()
      expect(breakpoints.getAll().length).toBe(0)
      expect(breakpoints._paused).toBe(false)
    })

    it('resets hit counts', () => {
      const bp = addNodeBreakpoint('test', 'both')
      const evt = makeEvent('node.enter', 'test')
      breakpoints.evaluate(evt)
      breakpoints.evaluate(evt)
      expect(bp.hitCount).toBe(2)
      breakpoints.resetHitCounts()
      expect(bp.hitCount).toBe(0)
    })
  })

  describe('subscribe', () => {
    it('notifies listeners on add', () => {
      let called = 0
      breakpoints.subscribe(() => called++)
      addNodeBreakpoint('test')
      expect(called).toBe(1)
    })

    it('notifies listeners on remove', () => {
      const bp = addNodeBreakpoint('test')
      let called = 0
      breakpoints.subscribe(() => called++)
      breakpoints.remove(bp.id)
      expect(called).toBe(1)
    })

    it('notifies listeners on toggle', () => {
      const bp = addNodeBreakpoint('test')
      let called = 0
      breakpoints.subscribe(() => called++)
      breakpoints.toggle(bp.id)
      expect(called).toBe(1)
    })
  })

  describe('multiple breakpoints', () => {
    it('evaluates all breakpoints, returns first match', () => {
      const bp1 = addNodeBreakpoint('Root*', 'enter')
      addBbBreakpoint('battery') // just to verify ordering
      const evt = makeEvent('node.enter', 'RootSelector')
      const result = breakpoints.evaluate(evt)
      expect(result).toBe(bp1) // first matching
    })

    it('skips disabled breakpoints', () => {
      const bp1 = addNodeBreakpoint('Root*', 'enter')
      const bp2 = addNodeBreakpoint('Root*', 'enter')
      breakpoints.toggle(bp1.id) // disable bp1
      const evt = makeEvent('node.enter', 'RootSelector')
      const result = breakpoints.evaluate(evt)
      expect(result).toBe(bp2)
    })
  })
})
