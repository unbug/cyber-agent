/**
 * TracePuller — Pull trace events from a real device over WebSocket.
 *
 * Protocol (device → client):
 *   {"type": "trace_start", "meta": {platform, character, ...}}
 *   {"type": "trace_event", "event": {t, type, label, payload}}
 *   {"type": "trace_end", "meta": {stoppedAt, durationMs, eventCount}}
 *
 * Protocol (client → device):
 *   {"type": "pull_start", "meta": {character, platform, tickRate}}
 *   {"type": "pull_stop"}
 *   {"type": "pull_snapshot"}
 *
 * Events are streamed into the tracer in real-time and buffered
 * for export as a `.cybertrace` file.
 */

import { tracer, type TracerEvent } from './tracer'

// ─── Protocol Types ─────────────────────────────────────────────

/** Server-to-client message */
export interface TracePullServerMsg {
  type: 'trace_start' | 'trace_event' | 'trace_end'
  meta?: Record<string, unknown>
  event?: TracerEvent
}

/** Client-to-server message */
export interface TracePullClientMsg {
  type: 'pull_start' | 'pull_stop' | 'pull_snapshot'
  meta?: Record<string, unknown>
}

/** Pull session metadata */
export interface TracePullMeta {
  platform?: string
  character?: string
  startedAt?: string
  stoppedAt?: string
  tickRate?: number
}

/** Pull session state */
export interface TracePullSession {
  url: string
  connected: boolean
  active: boolean
  meta: TracePullMeta
  buffer: TracerEvent[]
  eventCount: number
  errorMsg: string | null
}

// ─── TracePuller ────────────────────────────────────────────────

const BUFFER_LIMIT = 5000

type SessionCallback = (session?: TracePullSession) => void

export class TracePuller {
  private ws: WebSocket | null = null
  private sessions: Map<string, TracePullSession> = new Map()
  private listeners = new Set<SessionCallback>()
  private nextSessionId = 1

  /**
   * Start pulling trace from a device at the given URL.
   * Sends a pull_start handshake, then streams trace_event messages.
   */
  start(url: string, meta?: TracePullMeta): string {
    const sessionId = `pull-${this.nextSessionId++}`
    const session: TracePullSession = {
      url,
      connected: false,
      active: false,
      meta: meta ?? {},
      buffer: [],
      eventCount: 0,
      errorMsg: null,
    }
    this.sessions.set(sessionId, session)
    this.notifyListeners()

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        session.connected = true
        session.active = true
        session.meta.startedAt = new Date().toISOString()
        this.notifyListeners()

        // Send pull_start handshake
        this.ws!.send(JSON.stringify({
          type: 'pull_start',
          meta: {
            character: meta?.character,
            platform: meta?.platform,
            tickRate: meta?.tickRate ?? 30,
          },
        } as TracePullClientMsg))
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data) as TracePullServerMsg
          this.handleServerMessage(session, msg)
        } catch (err) {
          session.errorMsg = `Failed to parse message: ${(err as Error).message}`
          this.notifyListeners()
        }
      }

      this.ws.onerror = () => {
        session.errorMsg = 'WebSocket error'
        this.notifyListeners()
      }

      this.ws.onclose = () => {
        session.connected = false
        this.ws = null
        this.notifyListeners()
      }
    } catch (err) {
      session.errorMsg = `Failed to connect: ${(err as Error).message}`
      this.notifyListeners()
    }

    return sessionId
  }

  /** Handle incoming server messages */
  private handleServerMessage(session: TracePullSession, msg: TracePullServerMsg) {
    switch (msg.type) {
      case 'trace_start': {
        session.meta = { ...session.meta, ...msg.meta }
        this.notifyListeners()
        break
      }
      case 'trace_event': {
        const event = msg.event
        if (!event) return

        // Forward to tracer for live inspection
        tracer.emit(event)

        // Buffer for export
        session.buffer.push(event)
        if (session.buffer.length > BUFFER_LIMIT) {
          session.buffer = session.buffer.slice(-BUFFER_LIMIT)
        }
        session.eventCount++
        this.notifyListeners()
        break
      }
      case 'trace_end': {
        session.active = false
        session.meta = { ...session.meta, ...msg.meta }
        this.notifyListeners()
        break
      }
    }
  }

  /** Stop a pull session */
  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.active = false
    if (this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: 'pull_stop' } as TracePullClientMsg))
      } catch {
        // ws may already be closed
      }
      this.ws.close()
      this.ws = null
    }
    this.notifyListeners()
  }

  /** Request a snapshot of current buffer */
  snapshot(sessionId: string): TracerEvent[] {
    const session = this.sessions.get(sessionId)
    return session ? [...session.buffer] : []
  }

  /** Export current buffer as a .cybertrace content string */
  exportTrace(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return ''

    const lines: string[] = []

    // Header
    const header = {
      $schema: 'cybertrace/v1',
      $version: 1,
      meta: {
        platform: session.meta.platform,
        character: session.meta.character,
        startedAt: session.meta.startedAt,
        stoppedAt: new Date().toISOString(),
        eventCount: session.eventCount,
        sdkVersion: '0.5.0',
      },
    }
    lines.push(JSON.stringify(header))

    // Events
    for (const evt of session.buffer) {
      lines.push(JSON.stringify({
        t: evt.t,
        type: evt.type,
        label: evt.label,
        payload: evt.payload,
      }))
    }

    return lines.join('\n')
  }

  /** Download buffer as a .cybertrace file */
  downloadTrace(sessionId: string, filename?: string): void {
    const content = this.exportTrace(sessionId)
    if (!content) return

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `trace-${Date.now()}.cybertrace`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Get all sessions */
  getSessions(): TracePullSession[] {
    return Array.from(this.sessions.values())
  }

  /** Get a single session */
  getSession(sessionId: string): TracePullSession | undefined {
    return this.sessions.get(sessionId)
  }

  /** Remove a session */
  removeSession(sessionId: string): void {
    this.stop(sessionId)
    this.sessions.delete(sessionId)
    this.notifyListeners()
  }

  /** Subscribe to session changes */
  subscribe(fn?: SessionCallback): () => void {
    if (fn) this.listeners.add(fn)
    return () => { if (fn) this.listeners.delete(fn) }
  }

  private notifyListeners() {
    for (const fn of this.listeners) {
      try { fn() } catch { /* don't break listeners */ }
    }
  }

  /** Clear all sessions */
  clear(): void {
    // Stop all active sessions first
    for (const id of this.sessions.keys()) {
      const s = this.sessions.get(id)
      if (s && s.active) this.stop(id)
    }
    for (const id of this.sessions.keys()) {
      const session = this.sessions.get(id)
      if (session) session.active = false
    }
    // Close the ws once
    if (this.ws) {
      try { this.ws.close() } catch { /* ignore */ }
      this.ws = null
    }
    this.sessions.clear()
    this.notifyListeners()
  }
}

// ─── Singleton ──────────────────────────────────────────────────

export const tracePuller = new TracePuller()
