/**
 * TelloAdapter tests — covers lifecycle, telemetry parsing,
 * convenience methods, and safety constraints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TelloAdapter,
  createTelloAdapter,
  PROTOCOL_VERSION,
  MAX_SPEED,
  MIN_SPEED,
  MAX_DISTANCE,
  FlightStatus,
} from './tello'


// ─── Helpers ──────────────────────────────────────────────────────

function makeAdapter(): TelloAdapter {
  return createTelloAdapter({
    url: 'ws://192.168.1.100:8080',
    autoConnect: false,
  })
}

function makeConnectedAdapter(): TelloAdapter {
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

describe('TelloAdapter — construction', () => {
  it('creates adapter with default config', () => {
    const adapter = makeAdapter()
    expect(adapter.type).toBe('tello')
    expect(adapter.name).toBe('DJI Tello / Tello EDU')
    expect(adapter.contractVersion).toBe('v2')
  })

  it('creates adapter with factory', () => {
    const adapter = createTelloAdapter({ url: 'ws://test:8080' })
    expect(adapter.type).toBe('tello')
  })

  it('respects custom config values', () => {
    const adapter = createTelloAdapter({
      url: 'ws://test:8080',
      heartbeatInterval: 2000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      queueMaxSize: 50,
    })
    expect(adapter.config?.heartbeatInterval).toBe(2000)
    expect(adapter.config?.reconnectInterval).toBe(5000)
    expect(adapter.config?.maxReconnectAttempts).toBe(5)
    expect(adapter.config?.queueMaxSize).toBe(50)
  })
})

// ─── Capabilities Tests ───────────────────────────────────────────

describe('TelloAdapter — capabilities', () => {
  let adapter: TelloAdapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('returns valid capabilities', () => {
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.rotation).toBe(true)
    expect(caps.speed).toBe(true)
    expect(caps.led).toBe(false)
    expect(caps.sound).toBe(false)
    expect(caps.maxSpeed).toBe(MAX_SPEED)
    expect(caps.maxRotationSpeed).toBe(360)
    expect(caps.batteryReporting).toBe(true)
    expect(caps.distanceReporting).toBe(true)
    expect(caps.imuReporting).toBe(true)
    expect(caps.selfTestable).toBe(true)
    expect(caps.hardwareEStop).toBe(true)
  })
})

// ─── Telemetry Parsing Tests ──────────────────────────────────────

describe('TelloAdapter — telemetry parsing', () => {
  let adapter: TelloAdapter
  let events: any[]

  beforeEach(() => {
    adapter = makeAdapter()
    events = []
    adapter.onTelemetry((event) => events.push(event))
  })

  it('parses battery telemetry', () => {
    adapter['handleTelemetry']({
      type: 'battery',
      payload: { percentage: 85 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('battery')
    expect(events[0].payload.percentage).toBe(85)
  })

  it('parses attitude telemetry', () => {
    adapter['handleTelemetry']({
      type: 'attitude',
      payload: { roll: 0.5, pitch: -1.2, yaw: 180.3 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.roll).toBe(0.5)
    expect(events[0].payload.pitch).toBe(-1.2)
    expect(events[0].payload.yaw).toBe(180.3)
  })

  it('parses barometer telemetry', () => {
    adapter['handleTelemetry']({
      type: 'barometer',
      payload: { height_cm: 123.4 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.height_cm).toBe(123.4)
  })

  it('parses tof telemetry', () => {
    adapter['handleTelemetry']({
      type: 'tof',
      payload: { front: 150, bottom: 300 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.front).toBe(150)
    expect(events[0].payload.bottom).toBe(300)
  })

  it('parses flight_data telemetry', () => {
    adapter['handleTelemetry']({
      type: 'flight_data',
      payload: { time: 42, x: 10, y: 20, z: 30, temperature: 38 },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.time).toBe(42)
    expect(events[0].payload.x).toBe(10)
  })

  it('parses flight_status telemetry', () => {
    adapter['handleTelemetry']({
      type: 'flight_status',
      payload: { state: FlightStatus.FLYING },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.state).toBe(FlightStatus.FLYING)
  })

  it('parses ack telemetry', () => {
    adapter['handleTelemetry']({
      type: 'ack',
      payload: { command: 'takeoff', status: 'ok' },
    })
    expect(events).toHaveLength(1)
    expect(events[0].payload.command).toBe('takeoff')
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

// ─── Convenience Method Tests ─────────────────────────────────────

describe('TelloAdapter — convenience methods', () => {
  it('queues takeoff command', () => {
    const adapter = makeAdapter()
    adapter.takeoff()
    expect(adapter['commandQueue'].pop()?.type).toBe('takeoff')
  })

  it('queues land command', () => {
    const adapter = makeAdapter()
    adapter.land()
    expect(adapter['commandQueue'].pop()?.type).toBe('land')
  })

  it('queues emergency stop', () => {
    const adapter = makeAdapter()
    adapter.emergencyStop()
    expect(adapter['commandQueue'].pop()?.type).toBe('emergency_stop')
  })

  it('clamps move distance', () => {
    const adapter = makeAdapter()
    adapter.move('forward', 600) // exceeds MAX_DISTANCE
    const cmd = adapter['commandQueue'].pop()
    expect((cmd?.payload as any).distance_cm).toBe(MAX_DISTANCE)
  })

  it('clamps rotate angle', () => {
    const adapter = makeAdapter()
    adapter.rotate('cw', 400) // exceeds 360
    const cmd = adapter['commandQueue'].pop()
    expect((cmd?.payload as any).angle_deg).toBe(360)
  })

  it('clamps speed', () => {
    const adapter = makeAdapter()
    adapter.setSpeed(150) // exceeds MAX_SPEED
    const cmd = adapter['commandQueue'].pop()
    expect((cmd?.payload as any).speed_cm_s).toBe(MAX_SPEED)
  })

  it('flips in all directions', () => {
    const adapter = makeAdapter()
    for (const dir of ['left', 'right', 'forward', 'backward'] as const) {
      adapter.flip(dir)
      const cmd = adapter['commandQueue'].pop()
      expect(cmd?.type).toBe('flip')
      expect((cmd?.payload as any).direction).toBe(dir)
    }
  })

  it('queues waypoint command', () => {
    const adapter = makeAdapter()
    adapter.startWaypoint(1, 100, 200, 50)
    const cmd = adapter['commandQueue'].pop()
    expect(cmd?.type).toBe('waypoint')
    expect((cmd?.payload as any).sid).toBe(1)
  })

  it('queues video enable', () => {
    const adapter = makeAdapter()
    adapter.enableVideo(true)
    const cmd = adapter['commandQueue'].pop()
    expect(cmd?.type).toBe('video')
    expect((cmd?.payload as any).enable).toBe(true)
  })
})

// ─── Self Test Tests ──────────────────────────────────────────────

describe('TelloAdapter — selfTest', () => {
  let adapter: TelloAdapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('returns failing report when not connected', () => {
    const report = adapter.selfTest()
    expect(report.ok).toBe(false)
    expect(report.status).toBe('unhealthy')
    expect(report.checks).toHaveLength(0)
    expect(report.summary).toContain('INDOOR ONLY')
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

describe('TelloAdapter — lifecycle', () => {
  let adapter: TelloAdapter

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

describe('TelloAdapter — constants', () => {
  it('exports correct protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('v2')
  })

  it('exports correct speed limits', () => {
    expect(MAX_SPEED).toBe(100)
    expect(MIN_SPEED).toBe(10)
  })

  it('exports correct max distance', () => {
    expect(MAX_DISTANCE).toBe(500)
  })

  it('exports FlightStatus enum', () => {
    expect(FlightStatus.FLYING).toBe(3)
    expect(FlightStatus.EMERGENCY).toBe(4)
  })
})
