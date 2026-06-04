/**
 * Perception Event Bus — pub/sub for perception events.
 *
 * Sensors publish events; BT conditions / actions subscribe to them.
 * Events are also emitted to the tracer for debugger visibility.
 *
 * Usage:
 *   const bus = new PerceptionBus()
 *   bus.publish({ category: 'see.face', payload: {...}, source: 'webcam' })
 *   bus.on('see.face', (event) => { handle event })
 */

import type { PerceptionCategory, PerceptionEvent } from './types'
import { emitPerceptionEvent } from '../engine/tracer'
import type { PerceptionConfig } from '../agents/types'

let eventIdCounter = 0

function nextEventId(): number {
  return ++eventIdCounter
}

export type PerceptionEventHandler = (event: PerceptionEvent) => void

export interface PerceptionBusOptions {
  /** Max events to retain in circular buffer (default: 256) */
  bufferSize?: number
  /** Whether to emit to tracer (default: true) */
  emitToTracer?: boolean
}

export class PerceptionBus {
  private subscribers: Map<PerceptionCategory, Set<PerceptionEventHandler>>
  private wildcardSubscribers: Set<PerceptionEventHandler>
  private buffer: PerceptionEvent[]
  private readonly maxBufferSize: number
  private readonly emitToTracer: boolean
  public readonly enabled: boolean
  public readonly categories?: string[]
  public readonly sensitivity?: Record<string, number>

  constructor(optionsOrConfig?: PerceptionBusOptions | PerceptionConfig) {
    this.subscribers = new Map()
    this.wildcardSubscribers = new Set()
    this.buffer = []
    // v3.0: accept PerceptionConfig from character editor
    if (optionsOrConfig && typeof optionsOrConfig === 'object' && 'enabled' in optionsOrConfig) {
      const cfg = optionsOrConfig as PerceptionConfig
      this.enabled = cfg.enabled ?? true
      this.maxBufferSize = cfg.bufferSize ?? 256
      this.emitToTracer = cfg.emitToTracer ?? true
      this.categories = cfg.categories
      this.sensitivity = cfg.sensitivity
    } else {
      const opts = optionsOrConfig as PerceptionBusOptions | undefined
      this.enabled = true
      this.maxBufferSize = opts?.bufferSize ?? 256
      this.emitToTracer = opts?.emitToTracer ?? true
      this.categories = undefined
      this.sensitivity = undefined
    }
  }

  /** Publish a perception event to all subscribers. */
  publish(event: Omit<PerceptionEvent, 'id'>): PerceptionEvent {
    // v3.0: respect enabled flag from character config
    if (!this.enabled) return { ...event, id: nextEventId() } as PerceptionEvent

    const fullEvent: PerceptionEvent = {
      ...event,
      id: nextEventId(),
    }

    // v3.0: filter by configured categories
    if (this.categories && !this.categories.includes(fullEvent.category)) {
      return fullEvent
    }

    // Emit to tracer for debugger visibility
    if (this.emitToTracer) {
      emitPerceptionEvent(fullEvent)
    }

    // Push to circular buffer
    this.buffer.push(fullEvent)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    // Notify category subscribers
    const categorySubs = this.subscribers.get(fullEvent.category)
    if (categorySubs) {
      for (const handler of categorySubs) {
        try {
          handler(fullEvent)
        } catch (_e) {
          // Don't let subscriber errors kill the bus
        }
      }
    }

    // Notify wildcard subscribers
    for (const handler of this.wildcardSubscribers) {
      try {
        handler(fullEvent)
      } catch (_e) {
        // Don't let subscriber errors kill the bus
      }
    }

    return fullEvent
  }

  /** Subscribe to a specific event category. Returns unsubscribe function. */
  on(category: PerceptionCategory, handler: PerceptionEventHandler): () => void {
    if (!this.subscribers.has(category)) {
      this.subscribers.set(category, new Set())
    }
    this.subscribers.get(category)!.add(handler)
    return () => this.subscribers.get(category)?.delete(handler)
  }

  /** Subscribe to all events (wildcard). Returns unsubscribe function. */
  onAll(handler: PerceptionEventHandler): () => void {
    this.wildcardSubscribers.add(handler)
    return () => this.wildcardSubscribers.delete(handler)
  }

  /** Get recent events from the circular buffer. */
  getRecent(count?: number): PerceptionEvent[] {
    const n = count ?? this.buffer.length
    return this.buffer.slice(-n)
  }

  /** Clear all subscribers and buffer. */
  clear(): void {
    this.subscribers.clear()
    this.wildcardSubscribers.clear()
    this.buffer = []
  }

  /** Get subscriber count for a category. */
  subscriberCount(category: PerceptionCategory): number {
    return this.subscribers.get(category)?.size ?? 0
  }

  /** Get total subscriber count across all categories. */
  totalSubscribers(): number {
    let total = this.wildcardSubscribers.size
    for (const subs of this.subscribers.values()) {
      total += subs.size
    }
    return total
  }
}
