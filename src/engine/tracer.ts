/**
 * CyberAgent Behavior Tree — Tracer
 *
 * Structured event stream for the BT engine. Every tick, node transition,
 * blackboard mutation, and adapter command is captured as a typed event.
 *
 * Event types:
 *   tick.start    — beginning of a BT tick
 *   node.enter    — a node begins evaluating
 *   node.exit     — a node finishes evaluating
 *   action.dispatch — an action leaf fires
 *   bb.set        — a blackboard field is written
 *   adapter.tx    — command sent to hardware
 *   adapter.rx    — telemetry received from hardware
 *   error         — a runtime error
 *
 * Events flow through a ring buffer (last 1 000) and can be persisted
 * to IndexedDB on demand.
 */

// ─── Event Types ──────────────────────────────────────────────────

export type TracerEventType =
  | 'tick.start'
  | 'node.enter'
  | 'node.exit'
  | 'action.dispatch'
  | 'bb.set'
  | 'adapter.tx'
  | 'adapter.rx'
  | 'error'

export interface TracerEvent {
  /** Monotonic timestamp in ms (performance.now()) */
  t: number
  /** Event type */
  type: TracerEventType
  /** Human-readable label */
  label: string
  /** Optional payload keyed by event type */
  payload?: Record<string, unknown>
}

// ─── Ring Buffer ──────────────────────────────────────────────────

const RING_SIZE = 1000

interface RingEntry {
  event: TracerEvent
}

class RingBuffer {
  private buf: RingEntry[] = []
  private head = 0
  private count = 0

  push(event: TracerEvent) {
    if (this.buf.length < RING_SIZE) {
      this.buf.push({ event })
      this.count++
      return
    }
    this.buf[this.head] = { event }
    this.head = (this.head + 1) % RING_SIZE
    this.count = RING_SIZE
  }

  /** Return events in chronological order */
  snapshot(): TracerEvent[] {
    if (this.count < RING_SIZE) {
      return this.buf.map(e => e.event)
    }
    const result: TracerEvent[] = []
    for (let i = 0; i < RING_SIZE; i++) {
      const idx = (this.head + i) % RING_SIZE
      result.push(this.buf[idx]!.event)
    }
    return result
  }

  length(): number {
    return this.count
  }
}

// ─── Subscriber / Listener ────────────────────────────────────────

type EventCallback = (event: TracerEvent) => void

// ─── Tracer (singleton) ───────────────────────────────────────────

class Tracer {
  private ring = new RingBuffer()
  private listeners = new Set<EventCallback>()
  _enabled = true

  /** Enable / disable event capture */
  setEnabled(on: boolean) {
    this._enabled = on
  }

  get enabled(): boolean {
    return this._enabled
  }

  /** Fire an event */
  emit(event: TracerEvent) {
    if (!this.enabled) return
    this.ring.push(event)
    for (const fn of this.listeners) {
      try { fn(event) } catch { /* don't break listeners */ }
    }
  }

  /** Subscribe to events */
  subscribe(fn: EventCallback): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  /** Get a snapshot of recent events (chronological) */
  snapshot(): TracerEvent[] {
    return this.ring.snapshot()
  }

  /** Current number of events */
  length(): number {
    return this.ring.length()
  }

  /** Clear all events */
  clear() {
    this.ring = new RingBuffer()
  }

  /** Persist current events to IndexedDB under key `cyberagent-trace` */
  async persistToIndexedDB(): Promise<void> {
    try {
      const events = this.snapshot()
      const db = await this.openDB()
      const tx = db.transaction('events', 'readwrite')
      const store = tx.objectStore('events')
      store.clear()
      store.put(events, 'session')
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch (err) {
      console.warn('[Tracer] IndexedDB persist failed:', err)
    }
  }

  /** Load events from IndexedDB */
  async loadFromIndexedDB(): Promise<TracerEvent[]> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('events', 'readonly')
      const store = tx.objectStore('events')
      const result = await new Promise<TracerEvent[] | undefined>((resolve, reject) => {
        const req = store.get('session')
        req.onsuccess = () => resolve(req.result as TracerEvent[] | undefined)
        req.onerror = () => reject(req.error)
      })
      return result ?? []
    } catch {
      return []
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('cyberagent-trace', 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// ─── Public singleton ─────────────────────────────────────────────

export const tracer = new Tracer()

// ─── Convenience helpers ──────────────────────────────────────────

export function emitTickStart(t: number) {
  tracer.emit({ t, type: 'tick.start', label: 'tick.start', payload: {} })
}

export function emitNodeEnter(nodeName: string, t: number) {
  tracer.emit({ t, type: 'node.enter', label: nodeName, payload: {} })
}

export function emitNodeExit(nodeName: string, status: string, t: number) {
  tracer.emit({ t, type: 'node.exit', label: nodeName, payload: { status } })
}

export function emitActionDispatch(actionName: string, t: number) {
  tracer.emit({ t, type: 'action.dispatch', label: actionName, payload: {} })
}

export function emitBbSet(field: string, value: unknown, t: number) {
  tracer.emit({ t, type: 'bb.set', label: field, payload: { value } })
}

export function emitAdapterTx(command: string, t: number) {
  tracer.emit({ t, type: 'adapter.tx', label: command, payload: {} })
}

export function emitAdapterRx(payload: Record<string, unknown>, t: number) {
  tracer.emit({ t, type: 'adapter.rx', label: 'telemetry', payload })
}

export function emitError(message: string, t: number) {
  tracer.emit({ t, type: 'error', label: 'error', payload: { message } })
}
