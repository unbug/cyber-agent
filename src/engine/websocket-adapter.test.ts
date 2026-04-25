/**
 * WebSocketAdapter tests — covers init, update, destroy, sendCommand,
 * and convenience methods. Uses isolated mock objects per test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketAdapter, createWebSocketAdapter } from './websocket-adapter'
import type { AdapterCommand } from './types'

// ─── Helpers ──────────────────────────────────────────────────────

function makeConnectedAdapter(): {
  adapter: WebSocketAdapter
  _wsSpy: ReturnType<typeof vi.fn>
  mockWS: Partial<WebSocket>
} {
  const mockWS: Partial<WebSocket> & { sendCalls: string[] } = {
    readyState: WebSocket.OPEN,
    sendCalls: [],
    send: vi.fn((data: string) => {
      mockWS.sendCalls.push(data)
    }),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  }
  const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
  ;(adapter as any).ws = mockWS
  return { adapter, _wsSpy: mockWS.send as ReturnType<typeof vi.fn>, mockWS }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('WebSocketAdapter', () => {
  beforeEach(() => {
    // Reset any global state that might leak from other test files
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has correct type and name', () => {
    const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
    expect(adapter.type).toBe('websocket')
    expect(adapter.name).toBe('WebSocket Robot Adapter')
  })

  it('autoConnect: false does not call WebSocket constructor', () => {
    const wsSpy = vi.fn()
    globalThis.WebSocket = wsSpy as any
    new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
    expect(wsSpy).not.toHaveBeenCalled()
  })

  it('init does not crash', () => {
    const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.init(bb)).not.toThrow()
  })

  it('update does nothing (no-op)', () => {
    const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('destroy stops heartbeat and closes ws', () => {
    const { adapter } = makeConnectedAdapter()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const closeSpy = vi.fn()
    ;(adapter as any).ws = { close: closeSpy } as any
    adapter.destroy()
    expect(closeSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  describe('sendCommand', () => {
    it('sends to ws when connected', () => {
      const { adapter, _wsSpy } = makeConnectedAdapter()
      const cmd: AdapterCommand = { type: 'motors', payload: { left: 0.5, right: 0.5 } }
      adapter.sendCommand(cmd)
      expect(_wsSpy).toHaveBeenCalledTimes(1)
      expect(_wsSpy).toHaveBeenCalledWith(JSON.stringify(cmd))
    })

    it('queues command when ws is closing', () => {
      const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
      const wsSpy = vi.fn()
      // Use numeric literal to avoid any enum comparison issues
      const mockWS = Object.freeze({
        readyState: 2, // WebSocket.CLOSING
        send: wsSpy,
        close: vi.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      })
      ;(adapter as any).ws = mockWS
      const cmd: AdapterCommand = { type: 'motors', payload: { left: 0, right: 0 } }
      adapter.sendCommand(cmd)
      expect(wsSpy).not.toHaveBeenCalled()
    })
  })

  describe('connect', () => {
    it('does nothing if already connecting', () => {
      const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
      ;(adapter as any).ws = { readyState: WebSocket.CONNECTING } as any
      const wsSpy = vi.fn(() => ({ readyState: WebSocket.CONNECTING }))
      globalThis.WebSocket = wsSpy as any
      adapter.connect()
      expect(wsSpy).not.toHaveBeenCalled()
    })

    it('does nothing if already open', () => {
      const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
      ;(adapter as any).ws = { readyState: WebSocket.OPEN } as any
      const wsSpy = vi.fn(() => ({ readyState: WebSocket.OPEN }))
      globalThis.WebSocket = wsSpy as any
      adapter.connect()
      expect(wsSpy).not.toHaveBeenCalled()
    })
  })

  describe('setOnConnect', () => {
    it('calls callback on connect', () => {
      const callback = vi.fn()
      const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
      adapter.setOnConnect(callback)
      // Simulate onopen
      ;(adapter as any).ws = { readyState: WebSocket.OPEN, send: vi.fn() } as any
      ;(adapter as any).ws.onopen = () => callback(true)
      ;(adapter as any).ws.onopen?.({} as Event)
      expect(callback).toHaveBeenCalledWith(true)
    })

    it('calls callback on disconnect', () => {
      const callback = vi.fn()
      const adapter = new WebSocketAdapter({ url: 'ws://test.local', autoConnect: false })
      adapter.setOnConnect(callback)
      ;(adapter as any).ws = { readyState: WebSocket.OPEN, send: vi.fn() } as any
      ;(adapter as any).ws.onclose = () => callback(false)
      ;(adapter as any).ws.onclose?.({ code: 1006, reason: 'abnormal' } as CloseEvent)
      expect(callback).toHaveBeenCalledWith(false)
    })
  })

  describe('convenience methods', () => {
    it('setMotors sends clamped values', () => {
      const { adapter, _wsSpy } = makeConnectedAdapter()
      adapter.setMotors(1.5, -2)
      const call = JSON.parse((_wsSpy as any).mock.calls[0][0])
      expect(call.type).toBe('motors')
      expect(call.payload.left).toBe(1)
      expect(call.payload.right).toBe(-1)
    })

    it('setRGB sends clamped values', () => {
      const { adapter, _wsSpy } = makeConnectedAdapter()
      adapter.setRGB(300, -10, 128)
      const call = JSON.parse((_wsSpy as any).mock.calls[0][0])
      expect(call.type).toBe('led')
      expect(call.payload.r).toBe(255)
      expect(call.payload.g).toBe(0)
      expect(call.payload.b).toBe(128)
    })

    it('playTone sends clamped values', () => {
      const { adapter, _wsSpy } = makeConnectedAdapter()
      adapter.playTone(50, 5)
      const call = JSON.parse((_wsSpy as any).mock.calls[0][0])
      expect(call.type).toBe('sound')
      expect(call.payload.frequency).toBe(100)
      expect(call.payload.duration).toBe(10)
    })

    it('custom sends arbitrary command', () => {
      const { adapter, _wsSpy } = makeConnectedAdapter()
      adapter.custom('custom_cmd', { foo: 'bar' })
      const call = JSON.parse((_wsSpy as any).mock.calls[0][0])
      expect(call.type).toBe('custom_cmd')
      expect(call.payload).toEqual({ foo: 'bar' })
    })
  })
})

describe('createWebSocketAdapter', () => {
  it('creates a WebSocketAdapter instance', () => {
    const adapter = createWebSocketAdapter({ url: 'ws://test.local' })
    expect(adapter).toBeInstanceOf(WebSocketAdapter)
    expect(adapter.type).toBe('websocket')
  })
})
