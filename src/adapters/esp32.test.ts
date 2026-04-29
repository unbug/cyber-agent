/**
 * ESP32Adapter tests — covers protocol v2 message serialization,
 * telemetry parsing, command queueing, and the adapter's v2 lifecycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ESP32Adapter,
  createESP32Adapter,
  PROTOCOL_VERSION,
  MAX_SPEED,
  MIN_BATTERY_VOLTAGE,
  MAX_BATTERY_VOLTAGE,
} from './esp32'
import type { AdapterCommand } from '../engine/types'

// ─── Helpers ──────────────────────────────────────────────────────

function makeAdapter(): ESP32Adapter {
  return new ESP32Adapter({
    url: 'ws://192.168.4.1:8080',
    autoConnect: false,
  })
}

// ─── Protocol Message Serialization Tests ─────────────────────────

describe('ESP32Adapter — protocol v2 serialization', () => {
  let adapter: ESP32Adapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('serializes move forward', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: 75 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('move')
    expect((msg.payload as any).direction).toBe('forward')
    expect((msg.payload as any).speed).toBe(75)
    expect(typeof (msg.payload as any).command_id).toBe('number')
    expect(msg.t).toBeGreaterThan(0)
  })

  it('serializes move backward', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'backward', speed: 50 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).direction).toBe('backward')
    expect((msg.payload as any).speed).toBe(50)
  })

  it('serializes move stop', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'stop', speed: 0 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).direction).toBe('stop')
    expect((msg.payload as any).speed).toBe(0)
  })

  it('clamps speed to MAX_SPEED', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: 200 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).speed).toBe(MAX_SPEED)
  })

  it('clamps speed to 0 minimum', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: -50 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).speed).toBe(0)
  })

  it('serializes motors command', () => {
    const cmd: AdapterCommand = {
      type: 'motors',
      payload: { left: 60, right: -40 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('motors')
    expect((msg.payload as any).left).toBe(60)
    expect((msg.payload as any).right).toBe(-40)
  })

  it('clamps motor speeds to [-MAX_SPEED, MAX_SPEED]', () => {
    const cmd: AdapterCommand = {
      type: 'motors',
      payload: { left: 150, right: -150 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).left).toBe(MAX_SPEED)
    expect((msg.payload as any).right).toBe(-MAX_SPEED)
  })

  it('serializes LED command', () => {
    const cmd: AdapterCommand = {
      type: 'led',
      payload: { r: 255, g: 128, b: 0, brightness: 200 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('led')
    expect((msg.payload as any).r).toBe(255)
    expect((msg.payload as any).g).toBe(128)
    expect((msg.payload as any).b).toBe(0)
    expect((msg.payload as any).brightness).toBe(200)
  })

  it('serializes LED with defaults', () => {
    const cmd: AdapterCommand = { type: 'led', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).r).toBe(0)
    expect((msg.payload as any).g).toBe(0)
    expect((msg.payload as any).b).toBe(0)
    expect((msg.payload as any).brightness).toBe(255)
  })

  it('serializes sound command', () => {
    const cmd: AdapterCommand = {
      type: 'sound',
      payload: { frequency: 440, duration_ms: 1000, volume: 90 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('sound')
    expect((msg.payload as any).frequency).toBe(440)
    expect((msg.payload as any).duration_ms).toBe(1000)
    expect((msg.payload as any).volume).toBe(90)
  })

  it('clamps frequency to [200, 20000]', () => {
    const cmd: AdapterCommand = {
      type: 'sound',
      payload: { frequency: 100, duration_ms: 500, volume: 50 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).frequency).toBe(200)
  })

  it('serializes gesture command', () => {
    const cmd: AdapterCommand = {
      type: 'gesture',
      payload: { pattern: 'rainbow', duration_ms: 3000 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('gesture')
    expect((msg.payload as any).pattern).toBe('rainbow')
    expect((msg.payload as any).duration_ms).toBe(3000)
  })

  it('serializes emergency_stop', () => {
    const cmd: AdapterCommand = {
      type: 'emergency_stop',
      payload: {},
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('emergency_stop')
  })

  it('serializes custom command', () => {
    const cmd: AdapterCommand = {
      type: 'custom',
      payload: { command: 'calibrate', args: { sensor: 'imu' } },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('custom')
    expect((msg.payload as any).command).toBe('calibrate')
    expect((msg.payload as any).args).toEqual({ sensor: 'imu' })
  })

  it('forwards unknown command types as custom', () => {
    const cmd: AdapterCommand = {
      type: 'unknown_type',
      payload: { foo: 'bar' },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('custom')
    expect((msg.payload as any).command).toBe('unknown_type')
  })

  it('increments command_id for each serialization', () => {
    const cmd1 = adapter.serializeCommand({ type: 'move', payload: {} } as AdapterCommand)
    const cmd2 = adapter.serializeCommand({ type: 'move', payload: {} } as AdapterCommand)
    expect((cmd1.payload as any).command_id).toBeLessThan((cmd2.payload as any).command_id)
  })
})

// ─── Telemetry Parsing Tests ──────────────────────────────────────

describe('ESP32Adapter — telemetry parsing', () => {
  let adapter: ESP32Adapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('parses battery telemetry', () => {
    const msg = { type: 'battery', payload: { voltage: 7.4, percentage: 85 }, t: 1000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('battery')
    expect((event!.payload as any).voltage).toBe(7.4)
    expect((event!.payload as any).percentage).toBe(85)
    expect(event!.t).toBe(1000)
  })

  it('parses IMU telemetry', () => {
    const msg = {
      type: 'imu',
      payload: { ax: 0.01, ay: -0.02, az: 0.98, gx: 0.0, gy: 0.1, gz: 0.0 },
      t: 2000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('imu')
    expect((event!.payload as any).ax).toBe(0.01)
    expect((event!.payload as any).az).toBe(0.98)
  })

  it('parses distance telemetry', () => {
    const msg = { type: 'distance', payload: { value: 42, unit: 'cm' }, t: 3000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('distance')
    expect((event!.payload as any).value).toBe(42)
    expect((event!.payload as any).unit).toBe('cm')
  })

  it('parses bump telemetry', () => {
    const msg = { type: 'bump', payload: { side: 'left', force: 0.5 }, t: 4000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('bump')
    expect((event!.payload as any).side).toBe('left')
    expect((event!.payload as any).force).toBe(0.5)
  })

  it('parses motor_state telemetry', () => {
    const msg = {
      type: 'motor_state',
      payload: { left_rpm: 120, right_rpm: 118, load_left: 0.3, load_right: 0.28 },
      t: 5000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('motor_state')
    expect((event!.payload as any).left_rpm).toBe(120)
    expect((event!.payload as any).right_rpm).toBe(118)
  })

  it('parses heartbeat telemetry', () => {
    const msg = { type: 'heartbeat', payload: { uptime_ms: 123456, free_heap: 45678 }, t: 6000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('heartbeat')
    expect((event!.payload as any).uptime_ms).toBe(123456)
    expect((event!.payload as any).free_heap).toBe(45678)
  })

  it('parses ack telemetry', () => {
    const msg = { type: 'ack', payload: { command_id: 42, status: 'ok' }, t: 7000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('ack')
    expect((event!.payload as any).command_id).toBe(42)
    expect((event!.payload as any).status).toBe('ok')
  })

  it('returns null for unparseable message type', () => {
    const msg = { type: 'unknown_type', payload: {}, t: 8000 }
    expect(adapter.parseTelemetry(msg)).toBeNull()
  })

  it('handles missing payload fields gracefully', () => {
    const msg = { type: 'battery', payload: {}, t: 9000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect((event!.payload as any).voltage).toBe(0)
    expect((event!.payload as any).percentage).toBe(0)
  })
})

// ─── Adapter Tests ────────────────────────────────────────────────

describe('ESP32Adapter', () => {
  let adapter: ESP32Adapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('has correct type and name', () => {
    expect(adapter.type).toBe('esp32')
    expect(adapter.name).toBe('ESP32 Robot Adapter')
  })

  it('has contractVersion v2', () => {
    expect(adapter.contractVersion).toBe('v2')
  })

  it('has correct protocol version', () => {
    expect(adapter.protocolVersion).toBe(PROTOCOL_VERSION)
  })

  it('init does not crash', () => {
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.init(bb)).not.toThrow()
  })

  it('update does not crash', () => {
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('destroy does not crash', () => {
    expect(() => adapter.destroy()).not.toThrow()
  })

  // ─── Command Serialization ─────────────────────────────────

  it('sendCommand with move type does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: 75 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with emergency_stop does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'emergency_stop',
      payload: {},
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with led does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'led',
      payload: { r: 255, g: 0, b: 0 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with gesture does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'gesture',
      payload: { pattern: 'wave' },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand queues commands when disconnected', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: 50 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
    expect((adapter as any).commandQueue.length).toBe(1)
  })

  it('sendCommand drops when queue is full', () => {
    const adapter = makeAdapter()
    const queue = (adapter as any).commandQueue as AdapterCommand[]
    for (let i = 0; i < 100; i++) {
      adapter.sendCommand({ type: 'move', payload: { direction: 'forward', speed: 50 } })
    }
    expect(() => adapter.sendCommand({ type: 'move', payload: { direction: 'forward', speed: 50 } })).not.toThrow()
    expect(queue.length).toBe(100)
  })

  // ─── Convenience Methods ─────────────────────────────────

  it('move() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.move('forward', 60)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('move')
    expect(sent.payload.direction).toBe('forward')
    expect(sent.payload.speed).toBe(60)
  })

  it('setMotors() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.setMotors(70, -30)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('motors')
    expect(sent.payload.left).toBe(70)
    expect(sent.payload.right).toBe(-30)
  })

  it('setLED() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.setLED(255, 128, 0, 200)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('led')
    expect(sent.payload.r).toBe(255)
    expect(sent.payload.g).toBe(128)
    expect(sent.payload.b).toBe(0)
    expect(sent.payload.brightness).toBe(200)
  })

  it('playSound() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.playSound(440, 1000, 80)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('sound')
    expect(sent.payload.frequency).toBe(440)
    expect(sent.payload.duration_ms).toBe(1000)
    expect(sent.payload.volume).toBe(80)
  })

  it('playGesture() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.playGesture('rainbow', 3000)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('gesture')
    expect(sent.payload.pattern).toBe('rainbow')
    expect(sent.payload.duration_ms).toBe(3000)
  })

  it('emergencyStop() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.emergencyStop()
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('emergency_stop')
  })

  // ─── v2 lifecycle ──────────────────────────────────────────

  it('selfTest returns a valid report', () => {
    const report = adapter.selfTest()
    expect(report.status).toBeDefined()
    expect(report.checks).toBeInstanceOf(Array)
    expect(report.checks.length).toBeGreaterThan(0)
    expect(report.version).toBe('v2')
    expect(report.timestamp).toBeGreaterThan(0)
    expect(report.ok).toBe(false)
  })

  it('capabilities returns extended v2 capabilities', () => {
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.rotation).toBe(true)
    expect(caps.led).toBe(true)
    expect(caps.sound).toBe(true)
    expect(caps.gesture).toBe(true)
    expect(caps.maxSpeed).toBe(MAX_SPEED)
    expect(caps.maxRotationSpeed).toBe(360)
    expect(caps.batteryReporting).toBe(true)
    expect(caps.distanceReporting).toBe(true)
    expect(caps.imuReporting).toBe(true)
    expect(caps.selfTestable).toBe(true)
    expect(caps.maxBatteryVoltage).toBe(MAX_BATTERY_VOLTAGE)
    expect(caps.minBatteryVoltage).toBe(MIN_BATTERY_VOLTAGE)
    expect(caps.hardwareEStop).toBe(true)
  })

  it('onTelemetry registers a callback and returns unsubscribe', () => {
    const cb = vi.fn()
    const unsub = adapter.onTelemetry(cb)
    expect(cb).not.toHaveBeenCalled()
    expect(typeof unsub).toBe('function')
    unsub()
  })

  // ─── Factory ──────────────────────────────────────────────

  it('createESP32Adapter returns an ESP32Adapter instance', () => {
    const adapter = createESP32Adapter({ url: 'ws://test:8080', autoConnect: false })
    expect(adapter).toBeInstanceOf(ESP32Adapter)
    expect(adapter.type).toBe('esp32')
  })
})
