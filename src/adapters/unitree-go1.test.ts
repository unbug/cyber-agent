/**
 * UnitreeGo1Adapter tests — covers protocol message serialization,
 * telemetry parsing, command queueing, and the adapter's v2 lifecycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  UnitreeGo1Adapter,
  createUnitreeGo1Adapter,
  PROTOCOL_VERSION,
  MAX_SPEED,
  MAX_BODY_HEIGHT,
  MIN_BODY_HEIGHT,
  MAX_YAW,
  MAX_PITCH,
  MAX_ROLL,
  GaitType,
  MotionMode,
  SpeedLevel,
  GO1_MIN_BATTERY_VOLTAGE,
  GO1_MAX_BATTERY_VOLTAGE,
  GO2_MIN_BATTERY_VOLTAGE,
  GO2_MAX_BATTERY_VOLTAGE,
} from './unitree-go1'
import type { AdapterCommand } from '../engine/types'

// ─── Helpers ──────────────────────────────────────────────────────

function makeGo1Adapter(): UnitreeGo1Adapter {
  return new UnitreeGo1Adapter({
    relayUrl: 'ws://localhost:8081',
    robot: 'go1',
    autoConnect: false,
  })
}

function makeGo2Adapter(): UnitreeGo1Adapter {
  return new UnitreeGo1Adapter({
    relayUrl: 'ws://localhost:8081',
    robot: 'go2',
    autoConnect: false,
  })
}

// ─── Protocol Message Serialization Tests ─────────────────────────

describe('UnitreeGo1Adapter — protocol v2 serialization', () => {
  let adapter: UnitreeGo1Adapter

  beforeEach(() => {
    adapter = makeGo1Adapter()
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

  it('serializes move left', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'left', speed: 30 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).direction).toBe('left')
  })

  it('serializes move right', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'right', speed: 30 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).direction).toBe('right')
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

  it('serializes body_height command', () => {
    const cmd: AdapterCommand = {
      type: 'body_height',
      payload: { height: 0.15 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('body_height')
    expect((msg.payload as any).height).toBe(0.15)
  })

  it('clamps body height to MAX_BODY_HEIGHT', () => {
    const cmd: AdapterCommand = {
      type: 'body_height',
      payload: { height: 1.0 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).height).toBe(MAX_BODY_HEIGHT)
  })

  it('clamps body height to MIN_BODY_HEIGHT', () => {
    const cmd: AdapterCommand = {
      type: 'body_height',
      payload: { height: -1.0 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).height).toBe(MIN_BODY_HEIGHT)
  })

  it('serializes gait command', () => {
    const cmd: AdapterCommand = {
      type: 'gait',
      payload: { gaitType: GaitType.TrotRun },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('gait')
    expect((msg.payload as any).gaitType).toBe(GaitType.TrotRun)
  })

  it('defaults gait to TrotWalk', () => {
    const cmd: AdapterCommand = { type: 'gait', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).gaitType).toBe(GaitType.TrotWalk)
  })

  it('serializes pose command', () => {
    const cmd: AdapterCommand = {
      type: 'pose',
      payload: { yaw: 0.5, pitch: 0.1, roll: -0.2 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('pose')
    expect((msg.payload as any).yaw).toBe(0.5)
    expect((msg.payload as any).pitch).toBe(0.1)
    expect((msg.payload as any).roll).toBe(-0.2)
  })

  it('clamps yaw to [-MAX_YAW, MAX_YAW]', () => {
    const cmd: AdapterCommand = {
      type: 'pose',
      payload: { yaw: 10, pitch: 0, roll: 0 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).yaw).toBe(MAX_YAW)
  })

  it('clamps pitch to [-MAX_PITCH, MAX_PITCH]', () => {
    const cmd: AdapterCommand = {
      type: 'pose',
      payload: { yaw: 0, pitch: 2, roll: 0 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).pitch).toBe(MAX_PITCH)
  })

  it('clamps roll to [-MAX_ROLL, MAX_ROLL]', () => {
    const cmd: AdapterCommand = {
      type: 'pose',
      payload: { yaw: 0, pitch: 0, roll: 1 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).roll).toBe(MAX_ROLL)
  })

  it('serializes damp command', () => {
    const cmd: AdapterCommand = { type: 'damp', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('damp')
  })

  it('serializes stand_up command', () => {
    const cmd: AdapterCommand = { type: 'stand_up', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('stand_up')
  })

  it('serializes stand_down command', () => {
    const cmd: AdapterCommand = { type: 'stand_down', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('stand_down')
  })

  it('serializes sit command', () => {
    const cmd: AdapterCommand = { type: 'sit', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('sit')
  })

  it('serializes dance command', () => {
    const cmd: AdapterCommand = {
      type: 'dance',
      payload: { pattern: 'dance2' },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('dance')
    expect((msg.payload as any).pattern).toBe('dance2')
  })

  it('defaults dance to dance1', () => {
    const cmd: AdapterCommand = { type: 'dance', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect((msg.payload as any).pattern).toBe('dance1')
  })

  it('serializes jump command', () => {
    const cmd: AdapterCommand = {
      type: 'jump',
      payload: { yaw: 1.57 },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('jump')
    expect((msg.payload as any).yaw).toBe(1.57)
  })

  it('serializes flip command', () => {
    const cmd: AdapterCommand = { type: 'flip', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('flip')
  })

  it('serializes emergency_stop', () => {
    const cmd: AdapterCommand = { type: 'emergency_stop', payload: {} }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('emergency_stop')
  })

  it('serializes custom command', () => {
    const cmd: AdapterCommand = {
      type: 'custom',
      payload: { cmd: 'calibrate', args: { sensor: 'imu' } },
    }
    const msg = adapter.serializeCommand(cmd)
    expect(msg.type).toBe('custom')
    expect((msg.payload as any).cmd).toBe('calibrate')
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

describe('UnitreeGo1Adapter — telemetry parsing', () => {
  let adapter: UnitreeGo1Adapter

  beforeEach(() => {
    adapter = makeGo1Adapter()
  })

  it('parses battery telemetry', () => {
    const msg = { type: 'battery', payload: { voltage: 24.5, percentage: 72 }, t: 1000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('battery')
    expect((event!.payload as any).voltage).toBe(24.5)
    expect((event!.payload as any).percentage).toBe(72)
    expect(event!.t).toBe(1000)
  })

  it('parses IMU telemetry', () => {
    const msg = {
      type: 'imu',
      payload: { ax: 0.02, ay: -0.01, az: 0.99, gx: 0.0, gy: 0.05, gz: 0.0 },
      t: 2000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('imu')
    expect((event!.payload as any).az).toBe(0.99)
  })

  it('parses joint_state telemetry', () => {
    const msg = {
      type: 'joint_state',
      payload: { q: [0.1, -0.5, 1.2, 0.1, -0.5, 1.2, 0.1, -0.5, 1.2, 0.1, -0.5, 1.2], qd: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tau: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
      t: 3000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('joint_state')
    expect((event!.payload as any).q.length).toBe(12)
    expect((event!.payload as any).qd.length).toBe(12)
    expect((event!.payload as any).tau.length).toBe(12)
  })

  it('defaults joint_state to empty arrays when payload missing', () => {
    const msg = { type: 'joint_state', payload: {}, t: 4000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect((event!.payload as any).q.length).toBe(12)
    expect((event!.payload as any).qd.length).toBe(12)
    expect((event!.payload as any).tau.length).toBe(12)
  })

  it('parses terrain telemetry', () => {
    const msg = { type: 'terrain', payload: { type: 'stairs', confidence: 0.95 }, t: 5000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('terrain')
    expect((event!.payload as any).type).toBe('stairs')
    expect((event!.payload as any).confidence).toBe(0.95)
  })

  it('updates terrainType internally from terrain telemetry', () => {
    const msg = { type: 'terrain', payload: { type: 'rough', confidence: 0.8 }, t: 6000 }
    adapter.parseTelemetry(msg)
    expect(adapter.getTerrainType()).toBe('rough')
  })

  it('parses foot_force telemetry', () => {
    const msg = {
      type: 'foot_force',
      payload: { FL: 15.2, FR: 14.8, RL: 12.1, RR: 11.9 },
      t: 7000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('foot_force')
    expect((event!.payload as any).FL).toBe(15.2)
    expect((event!.payload as any).RR).toBe(11.9)
  })

  it('parses state telemetry', () => {
    const msg = {
      type: 'state',
      payload: { mode: MotionMode.Walking, gaitType: GaitType.TrotWalk, speedLevel: SpeedLevel.Medium },
      t: 8000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('state')
    expect((event!.payload as any).mode).toBe(MotionMode.Walking)
    expect((event!.payload as any).gaitType).toBe(GaitType.TrotWalk)
    expect((event!.payload as any).speedLevel).toBe(SpeedLevel.Medium)
  })

  it('parses position telemetry', () => {
    const msg = {
      type: 'position',
      payload: { x: 1.23, y: -0.45, yaw: 0.78 },
      t: 9000,
    }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('position')
    expect((event!.payload as any).x).toBe(1.23)
    expect((event!.payload as any).y).toBe(-0.45)
    expect((event!.payload as any).yaw).toBe(0.78)
  })

  it('parses heartbeat telemetry', () => {
    const msg = { type: 'heartbeat', payload: { uptime_ms: 123456 }, t: 10000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('heartbeat')
    expect((event!.payload as any).uptime_ms).toBe(123456)
  })

  it('parses ack telemetry', () => {
    const msg = { type: 'ack', payload: { command_id: 42, status: 'ok' }, t: 11000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('ack')
    expect((event!.payload as any).command_id).toBe(42)
    expect((event!.payload as any).status).toBe('ok')
  })

  it('returns null for unparseable message type', () => {
    const msg = { type: 'unknown_type', payload: {}, t: 12000 }
    expect(adapter.parseTelemetry(msg)).toBeNull()
  })

  it('handles missing payload fields gracefully', () => {
    const msg = { type: 'battery', payload: {}, t: 13000 }
    const event = adapter.parseTelemetry(msg)
    expect(event).not.toBeNull()
    expect((event!.payload as any).voltage).toBe(0)
    expect((event!.payload as any).percentage).toBe(0)
  })
})

// ─── Adapter Tests ────────────────────────────────────────────────

describe('UnitreeGo1Adapter', () => {
  let adapter: UnitreeGo1Adapter

  beforeEach(() => {
    adapter = makeGo1Adapter()
  })

  it('has correct type and name', () => {
    expect(adapter.type).toBe('unitree-go1')
    expect(adapter.name).toBe('Unitree Go1/Go2 Robot Adapter')
  })

  it('has contractVersion v2', () => {
    expect(adapter.contractVersion).toBe('v2')
  })

  it('has correct protocol version', () => {
    expect(adapter.protocolVersion).toBe(PROTOCOL_VERSION)
  })

  it('defaults to go1 robot model', () => {
    expect(adapter.robot).toBe('go1')
  })

  it('accepts go2 robot model', () => {
    const go2 = makeGo2Adapter()
    expect(go2.robot).toBe('go2')
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
    const cmd: AdapterCommand = { type: 'emergency_stop', payload: {} }
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
    const adapter = makeGo1Adapter()
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

  it('setBodyHeight() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.setBodyHeight(0.15)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('body_height')
    expect(sent.payload.height).toBe(0.15)
  })

  it('setGait() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.setGait(GaitType.TrotRun)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('gait')
    expect(sent.payload.gaitType).toBe(GaitType.TrotRun)
  })

  it('setPose() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.setPose(0.5, 0.1, -0.2)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('pose')
    expect(sent.payload.yaw).toBe(0.5)
    expect(sent.payload.pitch).toBe(0.1)
    expect(sent.payload.roll).toBe(-0.2)
  })

  it('damping() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.damping()
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('damp')
  })

  it('standUp() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.standUp()
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('stand_up')
  })

  it('sit() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.sit()
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('sit')
  })

  it('standDown() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.standDown()
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('stand_down')
  })

  it('dance() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.dance('dance2')
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('dance')
    expect(sent.payload.pattern).toBe('dance2')
  })

  it('jump() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.jump(1.57)
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('jump')
    expect(sent.payload.yaw).toBe(1.57)
  })

  it('flip() sends correct command', () => {
    const sendSpy = vi.fn()
    const mockWS = {
      readyState: 1,
      send: sendSpy,
      close: vi.fn(),
    } as unknown as WebSocket
    ;(adapter as any).ws = mockWS
    ;(adapter as any)._connected = true
    adapter.flip()
    expect(sendSpy).toHaveBeenCalled()
    const sent = JSON.parse(sendSpy.mock.calls[0]![0])
    expect(sent.type).toBe('flip')
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

  it('selfTest includes min battery voltage for go1', () => {
    const report = adapter.selfTest()
    const batteryCheck = report.checks.find((c) => c.name === 'min_battery_voltage')
    expect(batteryCheck).toBeDefined()
    expect(batteryCheck!.message).toContain(GO1_MIN_BATTERY_VOLTAGE.toString())
  })

  it('capabilities returns extended v2 capabilities', () => {
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.rotation).toBe(true)
    expect(caps.speed).toBe(true)
    expect(caps.led).toBe(false)
    expect(caps.sound).toBe(false)
    expect(caps.gesture).toBe(true)
    expect(caps.maxSpeed).toBe(150) // Go1 max
    expect(caps.maxRotationSpeed).toBe(180)
    expect(caps.batteryReporting).toBe(true)
    expect(caps.imuReporting).toBe(true)
    expect(caps.selfTestable).toBe(true)
    expect(caps.hardwareEStop).toBe(true)
    expect(caps.maxBatteryVoltage).toBe(GO1_MAX_BATTERY_VOLTAGE)
    expect(caps.minBatteryVoltage).toBe(GO1_MIN_BATTERY_VOLTAGE)
  })

  it('go2 capabilities reflect faster max speed', () => {
    const go2 = makeGo2Adapter()
    const caps = go2.capabilities()
    expect(caps.maxSpeed).toBe(200) // Go2 max
    expect(caps.maxBatteryVoltage).toBe(GO2_MAX_BATTERY_VOLTAGE)
    expect(caps.minBatteryVoltage).toBe(GO2_MIN_BATTERY_VOLTAGE)
  })

  it('onTelemetry registers a callback and returns unsubscribe', () => {
    const cb = vi.fn()
    const unsub = adapter.onTelemetry(cb)
    expect(cb).not.toHaveBeenCalled()
    expect(typeof unsub).toBe('function')
    unsub()
  })

  // ─── Factory ──────────────────────────────────────────────

  it('createUnitreeGo1Adapter returns a UnitreeGo1Adapter instance', () => {
    const adapter = createUnitreeGo1Adapter({ relayUrl: 'ws://test:8081', autoConnect: false })
    expect(adapter).toBeInstanceOf(UnitreeGo1Adapter)
    expect(adapter.type).toBe('unitree-go1')
  })

  it('factory defaults go1 robot model', () => {
    const adapter = createUnitreeGo1Adapter({ autoConnect: false })
    expect(adapter.robot).toBe('go1')
  })

  it('factory accepts go2 robot model', () => {
    const adapter = createUnitreeGo1Adapter({ relayUrl: 'ws://test:8081', robot: 'go2', autoConnect: false })
    expect(adapter.robot).toBe('go2')
  })
})

// ─── GaitType & MotionMode enum sanity ────────────────────────────

describe('UnitreeGo1Adapter — enums', () => {
  it('GaitType has expected values', () => {
    expect(GaitType.Idle).toBe(0)
    expect(GaitType.TrotWalk).toBe(1)
    expect(GaitType.TrotRun).toBe(2)
    expect(GaitType.StairsClimb).toBe(3)
    expect(GaitType.TrotObstacle).toBe(4)
  })

  it('MotionMode has expected values', () => {
    expect(MotionMode.Idle).toBe(0)
    expect(MotionMode.Standing).toBe(1)
    expect(MotionMode.Walking).toBe(2)
    expect(MotionMode.Damping).toBe(7)
    expect(MotionMode.Backflip).toBe(9)
    expect(MotionMode.Dance1).toBe(12)
    expect(MotionMode.Dance2).toBe(13)
  })
})
