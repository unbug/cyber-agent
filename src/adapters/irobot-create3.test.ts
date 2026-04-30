/**
 * IRobotCreate3Adapter tests — covers lifecycle, telemetry parsing,
 * command serialization, queueing, and self-test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  IRobotCreate3Adapter,
  createIRobotCreate3Adapter,
  PROTOCOL_VERSION,
  MAX_VELOCITY,
  MIN_BATTERY_VOLTAGE,
  FULL_BATTERY_VOLTAGE,
  ChargeState,
  type IRobotCreate3Command,
} from './irobot-create3'


// ─── Helpers ──────────────────────────────────────────────────────

function makeAdapter(): IRobotCreate3Adapter {
  return createIRobotCreate3Adapter({
    url: 'ws://192.168.1.100:8080',
    autoConnect: false,
  })
}

function makeConnectedAdapter(): IRobotCreate3Adapter {
  const adapter = makeAdapter()
  const mockWS = {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket
  ;(adapter as any).ws = mockWS
  ;(adapter as any).connected = true
  return adapter
}

// ─── Construction Tests ───────────────────────────────────────────

describe('IRobotCreate3Adapter — construction', () => {
  it('creates adapter with default config', () => {
    const adapter = makeAdapter()
    expect(adapter.type).toBe('irobot-create3')
    expect(adapter.name).toBe('iRobot Create 3 / Roomba')
    expect(adapter.contractVersion).toBe('v2')
  })

  it('creates adapter with factory', () => {
    const adapter = createIRobotCreate3Adapter({ url: 'ws://test:8080' })
    expect(adapter.type).toBe('irobot-create3')
  })

  it('respects custom config values', () => {
    const adapter = createIRobotCreate3Adapter({
      url: 'ws://test:8080',
      heartbeatInterval: 2000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 3,
      queueMaxSize: 50,
    })
    expect(adapter.config?.heartbeatInterval).toBe(2000)
    expect(adapter.config?.reconnectInterval).toBe(5000)
    expect(adapter.config?.maxReconnectAttempts).toBe(3)
    expect(adapter.config?.queueMaxSize).toBe(50)
  })
})

// ─── Capabilities Tests ───────────────────────────────────────────

describe('IRobotCreate3Adapter — capabilities', () => {
  let adapter: IRobotCreate3Adapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('returns valid capabilities', () => {
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.rotation).toBe(true)
    expect(caps.speed).toBe(true)
    expect(caps.led).toBe(true)
    expect(caps.sound).toBe(true)
    expect(caps.maxSpeed).toBe(MAX_VELOCITY)
    expect(caps.maxRotationSpeed).toBe(180)
    expect(caps.batteryReporting).toBe(true)
    expect(caps.distanceReporting).toBe(true)
    expect(caps.imuReporting).toBe(false)
    expect(caps.selfTestable).toBe(true)
    expect(caps.hardwareEStop).toBe(true)
    expect(caps.maxBatteryVoltage).toBe(FULL_BATTERY_VOLTAGE / 1000)
    expect(caps.minBatteryVoltage).toBe(MIN_BATTERY_VOLTAGE / 1000)
  })
})

// ─── Telemetry Parsing Tests ──────────────────────────────────────

describe('IRobotCreate3Adapter — telemetry parsing', () => {
  let adapter: IRobotCreate3Adapter
  let events: any[]

  beforeEach(() => {
    adapter = makeAdapter()
    events = []
    adapter.onTelemetry((event) => events.push(event))
  })

  it('parses battery telemetry', () => {
    adapter['handleTelemetry']({
      type: 'battery',
      payload: { voltage_mv: 14400, capacity_mah: 5200, charge_pct: 85 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('battery')
    expect(events[0].payload.voltage_mv).toBe(14400)
    expect(events[0].payload.charge_pct).toBe(85)
  })

  it('parses cliff telemetry', () => {
    adapter['handleTelemetry']({
      type: 'cliff',
      payload: { front_left: 1, front_right: 0, rear_left: 0, rear_right: 0 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.front_left).toBe(1)
  })

  it('parses wall telemetry', () => {
    adapter['handleTelemetry']({
      type: 'wall',
      payload: { value: 120 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.value).toBe(120)
  })

  it('parses bump telemetry', () => {
    adapter['handleTelemetry']({
      type: 'bump',
      payload: { left: true, right: false, center: false },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.left).toBe(true)
  })

  it('parses wheel_drop telemetry', () => {
    adapter['handleTelemetry']({
      type: 'wheel_drop',
      payload: { main_drop: false, caster_drop: true },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.caster_drop).toBe(true)
  })

  it('parses distance telemetry', () => {
    adapter['handleTelemetry']({
      type: 'distance',
      payload: { mm: 1234 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.mm).toBe(1234)
  })

  it('parses angle telemetry', () => {
    adapter['handleTelemetry']({
      type: 'angle',
      payload: { degrees: 45.2 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.degrees).toBe(45.2)
  })

  it('parses velocity telemetry', () => {
    adapter['handleTelemetry']({
      type: 'velocity',
      payload: { mm_s: 100 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.mm_s).toBe(100)
  })

  it('parses charge_state telemetry', () => {
    adapter['handleTelemetry']({
      type: 'charge_state',
      payload: { state: ChargeState.FULL },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.state).toBe(ChargeState.FULL)
  })

  it('parses heartbeat telemetry', () => {
    adapter['handleTelemetry']({
      type: 'heartbeat',
      payload: { uptime_ms: 123456 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.uptime_ms).toBe(123456)
  })

  it('parses ack telemetry', () => {
    adapter['handleTelemetry']({
      type: 'ack',
      payload: { command_id: 42, status: 'ok' },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.command_id).toBe(42)
    expect(events[0].payload.status).toBe('ok')
  })

  it('ignores unknown telemetry type', () => {
    adapter['handleTelemetry']({
      type: 'unknown_type',
      payload: { foo: 'bar' },
    })
    expect(events).toHaveLength(0)
  })
})

// ─── Command Tests ────────────────────────────────────────────────

describe('IRobotCreate3Adapter — commands', () => {
  it('queues command when not connected', () => {
    const adapter = makeAdapter()
    adapter.sendCommand({ type: 'move', payload: { velocity: 100, radius: 0 } })
    expect(adapter['commandQueue']).toHaveLength(1)
  })

  it('sends command when connected', () => {
    const adapter = makeConnectedAdapter()
    const sendSpy = vi.spyOn((adapter as any).ws, 'send')
    adapter.sendCommand({ type: 'move', payload: { velocity: 100, radius: 0 } })
    expect(sendSpy).toHaveBeenCalled()
    const callArgs = sendSpy.mock.calls[0]
    const sent = JSON.parse(callArgs![0] as string)
    expect(sent.type).toBe('move')
    expect((sent.payload as any).velocity).toBe(100)
  })

  it('increments command_id on each command', () => {
    const adapter = makeAdapter()
    adapter.sendCommand({ type: 'move', payload: { velocity: 100, radius: 0 } })
    adapter.sendCommand({ type: 'stop', payload: {} })
    const q = adapter['commandQueue'] as IRobotCreate3Command[]
    expect((q[0] as IRobotCreate3Command).command_id).toBe(1)
    expect((q[1] as IRobotCreate3Command).command_id).toBe(2)
  })

  it('includes timestamp in command', () => {
    const adapter = makeAdapter()
    adapter.sendCommand({ type: 'led', payload: { red: 255, green: 0, blue: 0 } })
    const q = adapter['commandQueue'] as IRobotCreate3Command[]
    expect((q[0] as IRobotCreate3Command).t).toBeGreaterThan(0)
  })

  it('respects queue max size', () => {
    const adapter = createIRobotCreate3Adapter({
      url: 'ws://test:8080',
      autoConnect: false,
      queueMaxSize: 3,
    })
    adapter.sendCommand({ type: 'move', payload: {} })
    adapter.sendCommand({ type: 'move', payload: {} })
    adapter.sendCommand({ type: 'move', payload: {} })
    adapter.sendCommand({ type: 'move', payload: {} }) // should be dropped
    expect(adapter['commandQueue']).toHaveLength(3)
  })

  it('sends emergency stop', () => {
    const adapter = makeAdapter()
    adapter.emergencyStop()
    expect(adapter['commandQueue'].pop()?.type).toBe('emergency_stop')
  })
})

// ─── Self Test Tests ──────────────────────────────────────────────

describe('IRobotCreate3Adapter — selfTest', () => {
  let adapter: IRobotCreate3Adapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('returns failing report when not connected', () => {
    const report = adapter.selfTest()
    expect(report.ok).toBe(false)
    expect(report.status).toBe('unhealthy')
    expect(report.checks).toHaveLength(0)
    expect(report.summary).toContain('Not connected')
  })

  it('returns passing report when connected', () => {
    const adapter = makeConnectedAdapter()
    const report = adapter.selfTest()
    expect(report.checks).toHaveLength(3)
    expect(report.ok).toBe(true)
    expect(report.status).toBe('healthy')
    expect(report.timestamp).toBeGreaterThan(0)
    expect(report.version).toBe('v2')
  })
})

// ─── Lifecycle Tests ──────────────────────────────────────────────

describe('IRobotCreate3Adapter — lifecycle', () => {
  let adapter: IRobotCreate3Adapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('initializes without error', () => {
    expect(() => adapter.init({} as any)).not.toThrow()
  })

  it('updates without error', () => {
    expect(() => adapter.update({} as any)).not.toThrow()
  })

  it('destroys without error', () => {
    expect(() => adapter.destroy()).not.toThrow()
  })

  it('ticks without error when not connected', async () => {
    await expect(adapter.tick()).resolves.not.toThrow()
  })
})

// ─── Constants ────────────────────────────────────────────────────

describe('IRobotCreate3Adapter — constants', () => {
  it('exports correct protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('v2')
  })

  it('exports correct max velocity', () => {
    expect(MAX_VELOCITY).toBe(500)
  })

  it('exports correct battery thresholds', () => {
    expect(MIN_BATTERY_VOLTAGE).toBe(11500)
    expect(FULL_BATTERY_VOLTAGE).toBe(16800)
  })

  it('exports ChargeState enum', () => {
    expect(ChargeState.FULL).toBe(3)
    expect(ChargeState.DISCHARGING).toBe(6)
  })
})
