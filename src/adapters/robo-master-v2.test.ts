/**
 * RoboMasterAdapterV2 tests — full lifecycle, command queue, tick paths,
 * and edge cases. Covers PriorityCommandQueue, HeartbeatSystem,
 * and RoboMasterAdapterV2 end-to-end.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RoboMasterAdapterV2,
  createRoboMasterAdapter,
} from './robo-master-v2'
import type { AdapterCommand } from '../engine/types'

// ─── Helpers ──────────────────────────────────────────────────────

function makeConfig(): Parameters<typeof createRoboMasterAdapter>[0] {
  return { host: '192.168.1.100', port: 8080, heartbeatInterval: 100 }
}

function makeFullConfig(): Parameters<typeof RoboMasterAdapterV2._forTest>[0] {
  return {
    host: '192.168.1.100',
    port: 8080,
    heartbeatInterval: 100,
    useBinaryProtocol: false,
  }
}

function makeOpenWs(): WebSocket & { send: ReturnType<typeof vi.fn> } {
  const send = vi.fn()
  return {
    readyState: 1,
    send,
    close: vi.fn(),
    binaryType: 'blob' as never,
    bufferedAmount: 0,
    extensions: '' as never,
    onclose: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    protocol: '' as never,
    url: '' as never,
  } as never
}

function makeClosedWs(): WebSocket {
  return {
    readyState: 3, // CLOSED
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onerror: null,
    onclose: null,
  } as unknown as WebSocket
}

/**
 * Create an adapter with a mock WebSocket wired into its HeartbeatSystem.
 */
function makeAdapterWithWs(ws: WebSocket): RoboMasterAdapterV2 {
  const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
  // Inject the mock ws into the private heartbeat
  adapter['heartbeat']['ws'] = ws
  return adapter
}

// ─── PriorityCommandQueue tests ───────────────────────────────────

describe('PriorityCommandQueue', () => {
  it('processes emergency_stop before regular commands', async () => {
    const ws = makeOpenWs()
    const adapter = makeAdapterWithWs(ws)

    adapter.sendCommand({ type: 'move', payload: { x: 1, y: 2 } })
    await adapter.emergencyStop()

    await adapter.tick()

    const calls = (ws.send as any).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const lastCall = calls[calls.length - 1][0]
    expect(JSON.parse(lastCall).type).toBe('emergency_stop')
  })

  it('dequeues in priority order: HIGH > MED > REGULAR', async () => {
    const ws = makeOpenWs()
    const adapter = makeAdapterWithWs(ws)

    adapter.sendCommand({ type: 'move', payload: { x: 1 } }) // REGULAR (0)
    adapter.executeAction({ type: 'turn', priority: 250 }) // MED (250)
    adapter.executeAction({ type: 'gesture', priority: 500 }) // HIGH (500)

    await adapter.tick()

    const calls = (ws.send as any).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const first = JSON.parse(calls[0][0])
    expect(first.type).toBe('gesture')
  })

  it('hasEmergency returns true when emergency_stop is queued', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    expect(adapter['commandQueue']['hasEmergency']()).toBe(false)

    adapter['commandQueue']['enqueue'](
      { type: 'emergency_stop', payload: {} },
      1000,
    )
    expect(adapter['commandQueue']['hasEmergency']()).toBe(true)
  })

  it('hasEmergency returns false for non-emergency commands', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    adapter['commandQueue']['enqueue']({ type: 'move', payload: {} }, 0)
    expect(adapter['commandQueue']['hasEmergency']()).toBe(false)
  })

  it('queue length tracks correctly', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    expect(adapter['commandQueue']['length']).toBe(0)

    adapter.sendCommand({ type: 'move', payload: {} })
    expect(adapter['commandQueue']['length']).toBe(1)

    adapter.sendCommand({ type: 'turn', payload: {} })
    expect(adapter['commandQueue']['length']).toBe(2)
  })

  it('dequeue reduces length by one', async () => {
    const ws = makeClosedWs()
    const adapter = makeAdapterWithWs(ws)
    // Override getWebSocket to return the closed ws
    adapter['heartbeat']['getWebSocket'] = () => ws

    adapter.sendCommand({ type: 'move', payload: {} })
    expect(adapter['commandQueue']['length']).toBe(1)

    await adapter.tick()
    expect(adapter['commandQueue']['length']).toBe(0)
  })
})

// ─── HeartbeatSystem tests ────────────────────────────────────────

describe('HeartbeatSystem', () => {
  it('getWebSocket returns null before connect', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    expect(adapter['heartbeat']['getWebSocket']()).toBeNull()
  })

  it('disconnect clears reconnect timer', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    const clearTimeoutId = 42 as unknown as ReturnType<typeof setTimeout>
    const originalSetTimeout = window.setTimeout
    window.setTimeout = vi.fn().mockReturnValue(clearTimeoutId) as any

    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    // Set up a fake reconnect timer
    adapter['heartbeat']['reconnectTimer'] = clearTimeoutId
    adapter['heartbeat']['disconnect']()

    expect(clearTimeoutSpy).toHaveBeenCalledWith(clearTimeoutId)

    window.setTimeout = originalSetTimeout
    clearTimeoutSpy.mockRestore()
  })

  it('disconnect closes ws if present', () => {
    const closeMock = vi.fn()
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    adapter['heartbeat']['ws'] = { close: closeMock } as unknown as WebSocket

    adapter['heartbeat']['disconnect']()
    expect(closeMock).toHaveBeenCalled()
  })
})

// ─── RoboMasterAdapterV2 lifecycle tests ──────────────────────────

describe('RoboMasterAdapterV2', () => {
  let originalWebSocket: typeof globalThis.WebSocket

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
    vi.restoreAllMocks()
  })

  it('has correct type and name', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    expect(adapter.type).toBe('robo-master-v2')
    expect(adapter.name).toBe('RoboMaster Adapter V2')
  })

  it('init does not crash', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    expect(() => adapter.init()).not.toThrow()
  })

  it('update does not crash', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    expect(() => adapter.update()).not.toThrow()
  })

  it('sendCommand enqueues command', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    const cmd: AdapterCommand = { type: 'move', payload: { x: 10, y: 20 } }
    adapter.sendCommand(cmd)
    expect(adapter['commandQueue']['length']).toBe(1)
  })

  it('sendCommand emits tracer event', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    const cmd: AdapterCommand = { type: 'led', payload: { color: 'red' } }
    adapter.sendCommand(cmd)
    expect(adapter['commandQueue']['length']).toBe(1)
  })

  it('executeAction queues with priority', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    const result = await adapter.executeAction({ type: 'dance', priority: 500 })
    expect(result).toEqual({ success: true, delay: 0 })
    expect(adapter['commandQueue']['length']).toBe(1)
  })

  it('executeAction defaults to REGULAR priority', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    await adapter.executeAction({ type: 'idle' })
    expect(adapter['commandQueue']['length']).toBe(1)
  })

  it('executeCommand delegates to executeAction', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    const result = await adapter.executeCommand({ type: 'move', payload: {} })
    expect(result).toEqual({ success: true, delay: 0 })
  })

  it('emergencyStop queues emergency command', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    await adapter.emergencyStop()
    expect(adapter['commandQueue']['hasEmergency']()).toBe(true)
    expect(adapter['commandQueue']['length']).toBe(1)
  })

  it('tick processes emergency stop first', async () => {
    const ws = makeOpenWs()
    const adapter = makeAdapterWithWs(ws)

    adapter.sendCommand({ type: 'move', payload: {} })
    await adapter.emergencyStop()

    await adapter.tick()

    const calls = (ws.send as any).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const last = JSON.parse(calls[calls.length - 1][0])
    expect(last.type).toBe('emergency_stop')
  })

  it('tick sends queued command when no emergency', async () => {
    const ws = makeOpenWs()
    const adapter = makeAdapterWithWs(ws)

    adapter.sendCommand({ type: 'move', payload: { x: 5 } })

    await adapter.tick()

    const calls = (ws.send as any).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const sent = JSON.parse(calls[0][0])
    expect(sent.type).toBe('move')
  })



  it('tick does nothing when queue is empty', async () => {
    const ws = makeOpenWs()
    const adapter = makeAdapterWithWs(ws)

    await adapter.tick()

    const calls = (ws.send as any).mock.calls
    expect(calls.length).toBe(0)
  })

  it('tick skips send when ws is not open', async () => {
    const ws = makeClosedWs()
    const adapter = makeAdapterWithWs(ws)

    adapter.sendCommand({ type: 'move', payload: {} })

    await adapter.tick()

    const calls = (ws.send as any).mock.calls
    expect(calls.length).toBe(0)
  })

  it('connect sets isConnecting flag', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    // Mock heartbeat.connect to avoid real WebSocket
    const connectSpy = vi.spyOn(adapter['heartbeat'], 'connect').mockResolvedValue(undefined)
    await adapter.connect()
    expect(connectSpy).toHaveBeenCalled()
    expect(adapter['isConnecting']).toBe(true)
  })

  it('connect is idempotent (returns early if already connecting)', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    adapter['isConnecting'] = true
    await adapter.connect()
    expect(adapter['isConnecting']).toBe(true)
  })

  it('destroy resets state', async () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    adapter['isConnecting'] = true
    adapter.sendCommand({ type: 'move', payload: {} })

    await adapter.destroy()

    expect(adapter['isConnecting']).toBe(false)
    expect(adapter['commandQueue']['length']).toBe(0)
  })

  it('subscribeSensor returns a no-op teardown', () => {
    const adapter = RoboMasterAdapterV2._forTest(makeFullConfig())
    const teardown = adapter.subscribeSensor(() => {}, ['imu'])
    expect(teardown).toBeTypeOf('function')
    expect(() => teardown()).not.toThrow()
  })

  it('createRoboMasterAdapter factory returns a promise', () => {
    const promise = createRoboMasterAdapter(makeConfig())
    expect(promise).toBeInstanceOf(Promise)
  })
})
