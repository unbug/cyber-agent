import { describe, it, expect, vi } from 'vitest'
import { EmbodimentAdapter, LoopbackRobotAdapter, EMOTION_LED, wrapDeg } from './embodiment'
import { createBlackboard, type Blackboard, type AdapterCommand } from './types'
import type {
  RobotAdapterV2,
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
} from '@cyber-agent/sdk/adapter/contract'

// ─── Mock inner adapter ───────────────────────────────────────────

class MockRobot implements RobotAdapterV2 {
  readonly type = 'mock'
  readonly name = 'Mock Robot'
  readonly contractVersion = 'v2' as const
  commands: AdapterCommand[] = []
  initCalled = false
  destroyed = false
  disconnected = false

  init(): void {
    this.initCalled = true
  }
  update(): void {
    /* noop */
  }
  destroy(): void {
    this.destroyed = true
  }
  sendCommand(c: AdapterCommand): void {
    this.commands.push(c)
  }
  capabilities(): RobotCapabilitiesV2 {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: false,
      maxSpeed: 1,
      maxRotationSpeed: 90,
      batteryReporting: false,
      distanceReporting: false,
      imuReporting: false,
      selfTestable: true,
      hardwareEStop: false,
    }
  }
  async connect(): Promise<void> {
    /* noop */
  }
  async disconnect(): Promise<void> {
    this.disconnected = true
  }
  onTelemetry(_cb: (e: TelemetryEvent) => void): () => void {
    return () => {}
  }
  selfTest(): SelfTestReport {
    return {
      ok: true,
      status: 'healthy',
      summary: 'mock',
      checks: [],
      timestamp: Date.now(),
      version: 'v2',
    }
  }
}

function freshBb(overrides?: Partial<Blackboard>): Blackboard {
  return { ...createBlackboard(400, 300), ...overrides }
}

const motorsOf = (robot: MockRobot) =>
  robot.commands.filter((c) => c.type === 'motors')

// ─── wrapDeg ──────────────────────────────────────────────────────

describe('wrapDeg', () => {
  it('wraps angles into [-180, 180]', () => {
    expect(wrapDeg(0)).toBe(0)
    expect(wrapDeg(180)).toBe(180)
    expect(wrapDeg(181)).toBe(-179)
    expect(wrapDeg(360)).toBe(0)
    expect(wrapDeg(-190)).toBe(170)
    expect(wrapDeg(720 + 45)).toBe(45)
  })
})

// ─── EmbodimentAdapter ────────────────────────────────────────────

describe('EmbodimentAdapter', () => {
  it('sends motor commands proportional to blackboard movement', () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    const bb = freshBb()
    emb.init(bb)

    // Move 15px forward in one tick → half-saturated speed
    const bb2 = freshBb({ x: bb.x + 15 })
    emb.update(bb2)

    const motors = motorsOf(robot)
    expect(motors.length).toBeGreaterThanOrEqual(1)
    const last = motors[motors.length - 1]!
    const left = last.payload.left as number
    const right = last.payload.right as number
    // 15/30 = 0.5 fraction * 0.5 maxSpeed = 0.25 forward, no steering
    expect(left).toBeCloseTo(0.25, 1)
    expect(right).toBeCloseTo(0.25, 1)
  })

  it('splits left/right for yaw changes (tank steering)', () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    const bb = freshBb()
    emb.init(bb)

    // Rotate +45 deg in one tick (yawRefDeg=45 → full steer) while standing
    const bb2 = freshBb({ rotation: bb.rotation + 45 })
    emb.update(bb2)

    const motors = motorsOf(robot)
    const last = motors[motors.length - 1]!
    const left = last.payload.left as number
    const right = last.payload.right as number
    expect(right).toBeGreaterThan(left) // turning right
    expect(left).toBeCloseTo(-0.6, 1)
    expect(right).toBeCloseTo(0.6, 1)
  })

  it('treats sub-deadzone jitter as no motion', () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot, { keepaliveMs: 10_000 })
    const bb = freshBb()
    emb.init(bb)

    const bb2 = freshBb({ x: bb.x + 0.2, y: bb.y + 0.2 })
    emb.update(bb2)

    const motors = motorsOf(robot)
    const last = motors[motors.length - 1]!
    expect(last.payload.left).toBeCloseTo(0, 2)
    expect(last.payload.right).toBeCloseTo(0, 2)
  })

  it('emits LED command on emotion change (edge-triggered)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    const bb = freshBb({ emotion: 'idle' })
    emb.init(bb)

    emb.update(freshBb({ emotion: 'happy' }))
    const leds = robot.commands.filter((c) => c.type === 'led')
    expect(leds.length).toBe(1)
    expect(leds[0]!.payload).toMatchObject(EMOTION_LED.happy)

    // Same emotion again → no duplicate LED
    emb.update(freshBb({ emotion: 'happy' }))
    expect(robot.commands.filter((c) => c.type === 'led').length).toBe(1)

    // Different emotion after cooldown → new LED
    vi.setSystemTime(1_000_500)
    emb.update(freshBb({ emotion: 'angry' }))
    expect(robot.commands.filter((c) => c.type === 'led').length).toBe(2)
    vi.useRealTimers()
  })

  it('sends repeated stop commands while eStopActive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(2_000_000)
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    const bb = freshBb({ eStopActive: true, x: 100, y: 100 })
    emb.init(bb)

    emb.update(bb)
    expect(robot.commands.some((c) => c.type === 'stop')).toBe(true)
    expect(motorsOf(robot).length).toBe(0) // no motion while stopped

    vi.setSystemTime(2_000_300)
    emb.update(bb)
    expect(robot.commands.filter((c) => c.type === 'stop').length).toBe(2)
    vi.useRealTimers()
  })

  it('passes through arbitrary commands', () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    emb.sendCommand({ type: 'speak', payload: { text: 'woof' } })
    expect(robot.commands[0]).toMatchObject({ type: 'speak', payload: { text: 'woof' } })
  })

  it('stops the robot on destroy and disconnect', async () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    emb.init(freshBb())

    emb.destroy()
    expect(robot.commands.some((c) => c.type === 'stop')).toBe(true)
    expect(robot.destroyed).toBe(true)

    // updates after destroy are inert
    robot.commands = []
    emb.update(freshBb({ x: 500 }))
    expect(robot.commands.length).toBe(0)

    const robot2 = new MockRobot()
    const emb2 = new EmbodimentAdapter(robot2)
    await emb2.disconnect()
    expect(robot2.commands.some((c) => c.type === 'stop')).toBe(true)
    expect(robot2.disconnected).toBe(true)
  })

  it('throttles identical motor commands via keepalive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(3_000_000)
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot, { keepaliveMs: 5000 })
    const bb = freshBb()
    emb.init(bb)

    emb.update(freshBb({ x: bb.x + 20 }))
    // Arriving at a standstill is a change → one stop command
    emb.update(freshBb({ x: bb.x + 20 }))
    const first = motorsOf(robot).length
    const last = motorsOf(robot)[first - 1]!
    expect(last.payload.left).toBeCloseTo(0, 2)
    // Same stopped pose again within keepalive → no new command
    emb.update(freshBb({ x: bb.x + 20 }))
    expect(motorsOf(robot).length).toBe(first)

    vi.setSystemTime(3_005_100)
    emb.update(freshBb({ x: bb.x + 20 }))
    expect(motorsOf(robot).length).toBe(first + 1) // keepalive refresh
    vi.useRealTimers()
  })

  it('forwards capabilities, connect, telemetry, selfTest', async () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot)
    expect(emb.capabilities().movement).toBe(true)
    await expect(emb.connect()).resolves.toBeUndefined()
    expect(emb.selfTest().ok).toBe(true)
    const cb = vi.fn()
    const off = emb.onTelemetry(cb)
    expect(typeof off).toBe('function')
  })

  it('resets previous pose on init', () => {
    const robot = new MockRobot()
    const emb = new EmbodimentAdapter(robot, { keepaliveMs: 10_000 })
    const bb1 = freshBb({ x: 10 })
    emb.init(bb1)
    emb.update(freshBb({ x: 200 })) // big jump → big forward
    motorsOf(robot)

    // Re-init at the new pose → next tick without motion → ~0
    const bb3 = freshBb({ x: 200 })
    emb.init(bb3)
    emb.update(freshBb({ x: 200.1 }))
    const last = motorsOf(robot)[motorsOf(robot).length - 1]!
    expect(Math.abs(last.payload.left as number)).toBeLessThan(0.05)
  })
})

// ─── LoopbackRobotAdapter ─────────────────────────────────────────

describe('LoopbackRobotAdapter', () => {
  it('records commands for demo mode', () => {
    const loop = new LoopbackRobotAdapter()
    loop.sendCommand({ type: 'motors', payload: { left: 0.5, right: 0.5 } })
    loop.sendCommand({ type: 'stop', payload: {} })
    expect(loop.commands.length).toBe(2)
    expect(loop.commands[0]).toMatchObject({ type: 'motors' })
  })

  it('caps command history at 500', () => {
    const loop = new LoopbackRobotAdapter()
    for (let i = 0; i < 600; i++) loop.sendCommand({ type: 'noop', payload: { i } })
    expect(loop.commands.length).toBe(500)
    expect(loop.commands[499]).toMatchObject({ payload: { i: 599 } })
  })

  it('drives with EmbodimentAdapter end-to-end', () => {
    const loop = new LoopbackRobotAdapter()
    const emb = new EmbodimentAdapter(loop)
    const bb = freshBb()
    emb.init(bb)
    emb.update(freshBb({ x: bb.x + 30, emotion: 'playful' }))

    const types = loop.commands.map((c) => c.type)
    expect(types).toContain('motors')
    expect(types).toContain('led')
  })
})
