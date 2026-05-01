/**
 * ESP32 Perception Relay tests
 *
 * Tests the ESP32PerceptionRelay class: connection, sensor events,
 * perception relay, self-test, and capabilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ESP32PerceptionRelay } from '../../src/adapters/esp32-perception-relay'
import { PerceptionBus } from '../../src/perception/bus'
import type { PerceptionCategory } from '../../src/perception/types'

// ─── Shared mock state ────────────────────────────────────────────

let mockSend: ReturnType<typeof vi.fn>
let mockSentMessages: string[] = []
let mockClose: ReturnType<typeof vi.fn>
let capturedWsInstance: any = null

function resetMock() {
  mockSentMessages = []
  mockSend = vi.fn((data: string) => { mockSentMessages.push(data) })
  mockClose = vi.fn()
  capturedWsInstance = null
}

function createMockClass() {
  return class MockWebSocket {
    public onopen: Function | null = null
    public onmessage: Function | null = null
    public onclose: Function | null = null
    public onerror: Function | null = null
    public url: string
    public readyState = 1 // OPEN

    constructor(url: string) {
      this.url = url
      // Capture the instance for test access
      capturedWsInstance = this
    }

    send = mockSend
    close = mockClose

    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function fireOpen() {
  capturedWsInstance?.onopen?.({} as Event)
}

function fireMessage(data: string) {
  capturedWsInstance?.onmessage?.({
    data,
    origin: capturedWsInstance?.url ?? 'ws://test.local',
  } as MessageEvent)
}

function fireClose(code = 1000) {
  capturedWsInstance?.onclose?.({ code } as CloseEvent)
}

function fireSensor(category: PerceptionCategory, payload: Record<string, unknown>, source = 'esp32') {
  fireMessage(JSON.stringify({
    type: 'sensor',
    payload: {
      category,
      payload,
      source,
      timestamp: Date.now(),
    },
  }))
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ESP32PerceptionRelay', () => {
  let relay: ESP32PerceptionRelay

  beforeEach(() => {
    resetMock()
    vi.stubGlobal('WebSocket', createMockClass())
  })

  afterEach(() => {
    relay?.destroy()
    vi.unstubAllGlobals()
  })

  describe('construction', () => {
    it('creates relay with default config', () => {
      relay = new ESP32PerceptionRelay()
      expect(relay.type).toBe('esp32-perception-relay')
      expect(relay.name).toBe('ESP32 Perception Relay')
      expect(relay.protocolVersion).toBe(2)
      expect(relay.connected).toBe(false)
    })

    it('creates relay with custom config', () => {
      relay = new ESP32PerceptionRelay({
        wsUrl: 'ws://test.local/perception',
        reconnectIntervalMs: 5000,
      })
      expect(relay.connected).toBe(false)
    })
  })

  describe('connection', () => {
    it('connects and sets connected state', async () => {
      relay = new ESP32PerceptionRelay({ wsUrl: 'ws://test.local/perception' })
      await relay.connect()
      fireOpen()
      expect(relay.connected).toBe(true)
    })

    it('disconnects cleanly', async () => {
      relay = new ESP32PerceptionRelay({ wsUrl: 'ws://test.local/perception' })
      await relay.connect()
      fireOpen()
      expect(relay.connected).toBe(true)
      relay.disconnect()
      expect(relay.connected).toBe(false)
    })

    it('destroys and cleans up', () => {
      relay = new ESP32PerceptionRelay({ wsUrl: 'ws://test.local/perception' })
      relay.destroy()
      expect(relay.connected).toBe(false)
    })
  })

  describe('sensor events', () => {
    it('receives sensor events from ESP32', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      fireOpen()

      const handler = vi.fn()
      relay.onSensor(handler)

      fireSensor('near', { distance: 42, unit: 'cm' }, 'ultrasonic')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].category).toBe('near')
      expect(handler.mock.calls[0][0].payload.distance).toBe(42)
      expect(handler.mock.calls[0][0].source).toBe('ultrasonic')
    })

    it('handles bump sensor events', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      fireOpen()

      const handler = vi.fn()
      relay.onSensor(handler)

      fireSensor('bump', { direction: 'front', force: 0.7 }, 'bump-sensor')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].category).toBe('bump')
    })

    it('handles tilt sensor events', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      fireOpen()

      const handler = vi.fn()
      relay.onSensor(handler)

      fireSensor('tilt', { pitch: 5.2, roll: -1.1, yaw: 0.3 }, 'imu')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].category).toBe('tilt')
    })
  })

  describe('perception relay', () => {
    it('relays perception events to ESP32', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      fireOpen()

      relay.relayPerception({
        category: 'see.face',
        payload: { bbox: [0, 0, 100, 100] },
        source: 'webcam',
        timestamp: Date.now(),
        confidence: 0.95,
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(mockSentMessages[0])
      expect(sent.type).toBe('perception')
      expect(sent.payload.category).toBe('see.face')
    })

    it('does not relay when disconnected', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      // Don't trigger open — stay disconnected

      relay.relayPerception({
        category: 'see.face',
        payload: { bbox: [0, 0, 100, 100] },
        source: 'webcam',
        timestamp: Date.now(),
      })

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('perception bus subscription', () => {
    it('subscribes to perception bus and relays events', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      fireOpen()

      const bus = new PerceptionBus()
      relay.subscribePerceptionBus(bus)

      bus.publish({
        category: 'hear.sound',
        payload: { type: 'clap', confidence: 0.8 },
        source: 'microphone',
        timestamp: Date.now(),
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
    })
  })

  describe('capabilities', () => {
    it('returns valid capabilities object', () => {
      relay = new ESP32PerceptionRelay()
      const caps = relay.capabilities

      expect(caps.movement).toBe(false)
      expect(caps.led).toBe(true)
      expect(caps.sound).toBe(true)
      expect(caps.sensors).toContain('bump')
      expect(caps.sensors).toContain('proximity')
      expect(caps.sensors).toContain('imu')
      expect(caps.sensors).toContain('distance')
      expect(caps.perceptionRelay).toBe(true)
      expect(caps.protocolVersion).toBe(2)
    })
  })

  describe('selfTest', () => {
    it('returns failing report when not connected', async () => {
      relay = new ESP32PerceptionRelay()
      const report = await relay.selfTest()

      expect(report.ok).toBe(false)
      expect(report.status).toBe('disconnected')
      expect(report.checks).toHaveLength(3)
      expect(report.checks[0].name).toBe('WebSocket support')
      expect(report.checks[0].ok).toBe(true)
      expect(report.checks[1].name).toBe('Connection')
      expect(report.checks[1].ok).toBe(false)
    })

    it('returns passing report when connected', async () => {
      relay = new ESP32PerceptionRelay()
      await relay.connect()
      fireOpen()

      const report = await relay.selfTest()

      expect(report.ok).toBe(true)
      expect(report.status).toBe('ok')
      expect(report.checks.every((c) => c.ok)).toBe(true)
    })
  })

  describe('status subscription', () => {
    it('notifies status handlers on connect', async () => {
      relay = new ESP32PerceptionRelay()
      const handler = vi.fn()
      relay.onStatus(handler)

      await relay.connect()
      fireOpen()

      expect(handler).toHaveBeenCalledWith(true)
    })

    it('notifies status handlers on disconnect', async () => {
      relay = new ESP32PerceptionRelay()
      const handler = vi.fn()
      relay.onStatus(handler)

      await relay.connect()
      fireOpen()
      handler.mockClear()

      relay.disconnect()

      expect(handler).toHaveBeenCalledWith(false)
    })
  })

  describe('static methods', () => {
    it('isAvailable returns true when WebSocket exists', () => {
      expect(ESP32PerceptionRelay.isAvailable()).toBe(true)
    })
  })
})
