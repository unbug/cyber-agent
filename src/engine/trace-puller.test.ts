/**
 * TracePuller tests — covers start, stop, export, and event buffering.
 * Uses mocked WebSocket to avoid needing a real device.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TracePuller } from './trace-puller'
import type { TracerEvent } from './tracer'

// ─── Helpers ──────────────────────────────────────────────

function makeMockWebSocket(): {
  sendCalls: string[]
  closeCalls: { count: number }
  readyState: number
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  onopen: ((ev: Event) => void) | null
  onmessage: ((ev: MessageEvent) => void) | null
  onerror: (() => void) | null
  onclose: ((ev: CloseEvent) => void) | null
} {
  const sendCalls: string[] = []
  const closeCalls = { count: 0 }
  return {
    readyState: 0, // CONNECTING
    sendCalls,
    closeCalls,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: vi.fn((data: string) => {
      sendCalls.push(data)
    }),
    close: vi.fn(() => {
      closeCalls.count++
    }),
  }
}

function patchWebSocket(mock: ReturnType<typeof makeMockWebSocket>) {
  const originalWS = globalThis.WebSocket
  globalThis.WebSocket = vi.fn(() => mock) as unknown as typeof WebSocket
  return () => { globalThis.WebSocket = originalWS }
}

function simulateOpen(mock: ReturnType<typeof makeMockWebSocket>) {
  mock.readyState = 1 // OPEN
  mock.onopen?.({} as Event)
}

function simulateMessage(mock: ReturnType<typeof makeMockWebSocket>, data: string) {
  mock.onmessage?.({ data } as MessageEvent)
}

// ─── Tests ────────────────────────────────────────────────

describe('TracePuller', () => {
  let puller: TracePuller
  let mockWS: ReturnType<typeof makeMockWebSocket>
  let restoreWS: () => void

  beforeEach(() => {
    puller = new TracePuller()
    mockWS = makeMockWebSocket()
    restoreWS = patchWebSocket(mockWS)
  })

  afterEach(() => {
    restoreWS()
    vi.restoreAllMocks()
  })

  it('start opens WebSocket and sends pull_start', () => {
    const sessionId = puller.start('ws://robot.local:8080/trace', {
      platform: 'RoboMaster S1',
      character: 'fox',
      tickRate: 30,
    })
    // Must simulate open AFTER start so handler is set
    simulateOpen(mockWS)

    expect(sessionId).toBeDefined()
    expect(mockWS.sendCalls).toHaveLength(1)
    const msg = JSON.parse(mockWS.sendCalls[0]!)
    expect(msg.type).toBe('pull_start')
    expect(msg.meta.platform).toBe('RoboMaster S1')
    expect(msg.meta.character).toBe('fox')
    expect(msg.meta.tickRate).toBe(30)
  })

  it('start returns a unique session ID', () => {
    const id1 = puller.start('ws://a.local')!
    simulateOpen(mockWS)

    const mockWS2 = makeMockWebSocket()
    const restore2 = patchWebSocket(mockWS2)
    const id2 = puller.start('ws://b.local')!
    simulateOpen(mockWS2)
    restore2()

    expect(id1).not.toBe(id2)
  })

  it('receives trace_event and buffers it', () => {
    const id = puller.start('ws://robot.local:8080/trace')
    simulateOpen(mockWS)

    const event: TracerEvent = {
      t: 1000,
      type: 'tick.start',
      label: 'tick.start',
      payload: {},
    }
    simulateMessage(mockWS, JSON.stringify({
      type: 'trace_event',
      event,
    }))

    const sessions = puller.getSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.eventCount).toBe(1)
    expect(sessions[0]!.buffer).toHaveLength(1)
    expect(sessions[0]!.buffer[0]).toEqual(event)
    expect(id).toBeDefined()
  })

  it('receives trace_start and merges meta', () => {
    const id = puller.start('ws://robot.local:8080/trace')
    simulateOpen(mockWS)

    simulateMessage(mockWS, JSON.stringify({
      type: 'trace_start',
      meta: { platform: 'mBot', character: 'cat' },
    }))

    const session = puller.getSession(id)
    expect(session!.meta.platform).toBe('mBot')
    expect(session!.meta.character).toBe('cat')
  })

  it('receives trace_end and marks session inactive', () => {
    const id = puller.start('ws://robot.local:8080/trace')
    simulateOpen(mockWS)

    simulateMessage(mockWS, JSON.stringify({
      type: 'trace_end',
      meta: { stoppedAt: '2026-04-26T10:00:00Z', eventCount: 42 },
    }))

    const session = puller.getSession(id)
    expect(session!.active).toBe(false)
    expect(session!.meta.stoppedAt).toBe('2026-04-26T10:00:00Z')
  })

  it('stop sends pull_stop and closes ws', () => {
    const id = puller.start('ws://robot.local:8080/trace')!
    simulateOpen(mockWS)
    simulateMessage(mockWS, JSON.stringify({ type: 'trace_end' }))

    puller.stop(id)
    const lastCall = mockWS.sendCalls[mockWS.sendCalls.length - 1]
    expect(lastCall).toContain('pull_stop')
    expect(mockWS.closeCalls.count).toBe(1)
  })

  it('exportTrace produces valid .cybertrace content', () => {
    const id = puller.start('ws://robot.local:8080/trace')!
    simulateOpen(mockWS)

    simulateMessage(mockWS, JSON.stringify({
      type: 'trace_event',
      event: { t: 100, type: 'tick.start', label: 'tick.start', payload: {} },
    }))
    simulateMessage(mockWS, JSON.stringify({
      type: 'trace_event',
      event: { t: 101, type: 'node.enter', label: 'Root', payload: {} },
    }))

    const content = puller.exportTrace(id)
    const lines = content.split('\n').filter(l => l.trim())

    // Header
    const header = JSON.parse(lines[0]!)
    expect(header.$schema).toBe('cybertrace/v1')
    expect(header.$version).toBe(1)
    expect(header.meta.eventCount).toBe(2)

    // Events
    expect(lines.length).toBe(3) // header + 2 events
    const evt1 = JSON.parse(lines[1]!)
    expect(evt1.type).toBe('tick.start')
    const evt2 = JSON.parse(lines[2]!)
    expect(evt2.type).toBe('node.enter')
  })

  it('removes session on removeSession', () => {
    const id = puller.start('ws://robot.local:8080/trace')!
    simulateOpen(mockWS)
    expect(puller.getSessions()).toHaveLength(1)

    puller.removeSession(id)
    expect(puller.getSessions()).toHaveLength(0)
  })

  it('clear removes all sessions', () => {
    const id1 = puller.start('ws://a.local')!
    simulateOpen(mockWS)

    const mockWS2 = makeMockWebSocket()
    const restore2 = patchWebSocket(mockWS2)
    const id2 = puller.start('ws://b.local')!
    simulateOpen(mockWS2)
    restore2()

    expect(puller.getSessions()).toHaveLength(2)
    puller.clear()
    expect(puller.getSessions()).toHaveLength(0)
    expect(mockWS2.closeCalls.count).toBe(1) // second ws closed by clear
    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
  })

  it('buffers respect BUFFER_LIMIT (5000)', () => {
    const id = puller.start('ws://robot.local:8080/trace')!
    simulateOpen(mockWS)

    for (let i = 0; i < 6000; i++) {
      simulateMessage(mockWS, JSON.stringify({
        type: 'trace_event',
        event: { t: i, type: 'tick.start', label: 'tick.start', payload: {} },
      }))
    }

    const session = puller.getSession(id)
    expect(session!.buffer.length).toBeLessThanOrEqual(5000)
  })

  it('subscribe notifies listeners on changes', () => {
    const callback = vi.fn()
    puller.subscribe(callback)
    callback.mockClear()

    const id = puller.start('ws://robot.local:8080/trace')
    simulateOpen(mockWS)

    expect(callback).toHaveBeenCalled()
    expect(id).toBeDefined()
  })

  it('snapshot returns a copy of buffer', () => {
    const id = puller.start('ws://robot.local:8080/trace')!
    simulateOpen(mockWS)

    simulateMessage(mockWS, JSON.stringify({
      type: 'trace_event',
      event: { t: 100, type: 'tick.start', label: 'tick.start', payload: {} },
    }))

    const snap = puller.snapshot(id)
    expect(snap).toHaveLength(1)
    expect(snap).not.toBe(puller.snapshot(id)) // different array instance
  })
})
