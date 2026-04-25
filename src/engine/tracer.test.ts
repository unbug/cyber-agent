/**
 * Tracer tests — ring buffer, emit, subscribe, snapshot, clear,
 * enable/disable, IndexedDB persist/load, and all convenience helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tracer, emitTickStart, emitNodeEnter, emitNodeExit, emitActionDispatch, emitBbSet, emitAdapterTx, emitAdapterRx, emitError, TracerEvent } from './tracer'

// ─── Helpers ──────────────────────────────────────────────────────

function makeEvent(type: TracerEvent['type'], label: string = type, payload = {}): TracerEvent {
  return { t: performance.now(), type, label, payload }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Tracer', () => {
  beforeEach(() => {
    tracer.clear()
    tracer.setEnabled(true)
  })

  describe('emit', () => {
    it('pushes event to ring buffer', () => {
      const event = makeEvent('tick.start')
      tracer.emit(event)
      expect(tracer.length()).toBe(1)
    })

    it('notifies listeners', () => {
      const spy = vi.fn()
      const unsub = tracer.subscribe(spy)
      tracer.emit(makeEvent('tick.start'))
      expect(spy).toHaveBeenCalled()
      unsub()
    })

    it('does not emit when disabled', () => {
      tracer.setEnabled(false)
      tracer.emit(makeEvent('tick.start'))
      expect(tracer.length()).toBe(0)
    })

    it('does not crash on listener error', () => {
      tracer.subscribe(() => { throw new Error('boom') })
      expect(() => tracer.emit(makeEvent('tick.start'))).not.toThrow()
    })

    it('supports multiple listeners', () => {
      const s1 = vi.fn()
      const s2 = vi.fn()
      tracer.subscribe(s1)
      tracer.subscribe(s2)
      tracer.emit(makeEvent('tick.start'))
      expect(s1).toHaveBeenCalled()
      expect(s2).toHaveBeenCalled()
    })

    it('unsubscribe removes listener', () => {
      const spy = vi.fn()
      const unsub = tracer.subscribe(spy)
      unsub()
      tracer.emit(makeEvent('tick.start'))
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('snapshot', () => {
    it('returns events in chronological order', () => {
      tracer.emit(makeEvent('tick.start', 'first'))
      tracer.emit(makeEvent('node.enter', 'second'))
      tracer.emit(makeEvent('node.exit', 'third'))
      const snap = tracer.snapshot()
      expect(snap).toHaveLength(3)
      expect(snap[0]!.label).toBe('first')
      expect(snap[1]!.label).toBe('second')
      expect(snap[2]!.label).toBe('third')
    })

    it('returns empty when cleared', () => {
      tracer.emit(makeEvent('tick.start'))
      tracer.clear()
      expect(tracer.snapshot()).toHaveLength(0)
    })
  })

  describe('ring buffer wrap', () => {
    it('wraps at RING_SIZE (1000)', () => {
      for (let i = 0; i < 1500; i++) {
        tracer.emit(makeEvent('tick.start', `evt-${i}`))
      }
      expect(tracer.length()).toBe(1000)
      const snap = tracer.snapshot()
      expect(snap.length).toBe(1000)
    })

    it('preserves order after wrap', () => {
      // Fill and wrap
      for (let i = 0; i < 1200; i++) {
        tracer.emit(makeEvent('tick.start', `evt-${i}`))
      }
      const snap = tracer.snapshot()
      // Last 1000 events should be evt-200 through evt-1199
      expect(snap[0]!.label).toBe('evt-200')
      expect(snap[999]!.label).toBe('evt-1199')
    })
  })

  describe('clear', () => {
    it('clears all events', () => {
      const spy = vi.fn()
      tracer.subscribe(spy)
      tracer.emit(makeEvent('tick.start'))
      tracer.clear()
      expect(tracer.length()).toBe(0)
      expect(tracer.snapshot()).toHaveLength(0)
    })
  })

  describe('enabled flag', () => {
    it('returns current enabled state', () => {
      expect(tracer.enabled).toBe(true)
      tracer.setEnabled(false)
      expect(tracer.enabled).toBe(false)
      tracer.setEnabled(true)
      expect(tracer.enabled).toBe(true)
    })
  })

  describe('IndexedDB persist/load', () => {
    it('persistToIndexedDB and loadFromIndexedDB round-trip', async () => {
      if (typeof indexedDB === 'undefined') {
        return // skip in non-DOM environments
      }

      tracer.clear()
      for (let i = 0; i < 10; i++) {
        tracer.emit(makeEvent('tick.start', `idx-${i}`, { idx: i }))
      }

      await tracer.persistToIndexedDB()
      const loaded = await tracer.loadFromIndexedDB()
      expect(loaded.length).toBe(10)
      expect(loaded[0]!.label).toBe('idx-0')
    }, 10000)
  })
})

// ─── Convenience helpers ──────────────────────────────────────────

describe('emitTickStart', () => {
  it('emits tick.start event', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitTickStart(1000)
    expect(spy).toHaveBeenCalled()
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('tick.start')
    expect(event.t).toBe(1000)
  })
})

describe('emitNodeEnter', () => {
  it('emits node.enter event', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitNodeEnter('sequence-1', 2000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('node.enter')
    expect(event.label).toBe('sequence-1')
  })
})

describe('emitNodeExit', () => {
  it('emits node.exit event with status', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitNodeExit('action-idle', 'success', 3000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('node.exit')
    expect(event.label).toBe('action-idle')
    expect(event.payload).toEqual({ status: 'success' })
  })
})

describe('emitActionDispatch', () => {
  it('emits action.dispatch event', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitActionDispatch('moveToPointer', 4000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('action.dispatch')
    expect(event.label).toBe('moveToPointer')
  })
})

describe('emitBbSet', () => {
  it('emits bb.set event with value', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitBbSet('x', 200, 5000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('bb.set')
    expect(event.label).toBe('x')
    expect(event.payload).toEqual({ value: 200 })
  })
})

describe('emitAdapterTx', () => {
  it('emits adapter.tx event', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitAdapterTx('motors', 6000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('adapter.tx')
    expect(event.label).toBe('motors')
  })
})

describe('emitAdapterRx', () => {
  it('emits adapter.rx event with payload', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitAdapterRx({ battery: 80 }, 7000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('adapter.rx')
    expect(event.payload).toEqual({ battery: 80 })
  })
})

describe('emitError', () => {
  it('emits error event with message', () => {
    const spy = vi.fn()
    tracer.subscribe(spy)
    tracer.clear()
    emitError('motor stall', 8000)
    const event = (spy.mock.calls as any[])[0][0]
    expect(event.type).toBe('error')
    expect(event.payload).toEqual({ message: 'motor stall' })
  })
})
