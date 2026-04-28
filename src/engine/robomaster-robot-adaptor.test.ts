/**
 * RoboMasterMotionAdapter tests — covers init, update, destroy,
 * sendCommand, motion primitives, and factory functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RoboMasterMotionAdapter,
  createRoboMasterAdapter,
  createRoboMasterWebSocketAdapter,
  motionPrimitive,
} from './robomaster-robot-adaptor'
import type { AdapterCommand } from './types'
import type { RobotAdapterV2, RobotCapabilitiesV2 } from '@cyber-agent/sdk/adapter/contract'

// ─── Helpers ──────────────────────────────────────────────────────

function createBaseAdapter(): RobotAdapterV2 {
  return {
    type: 'base',
    name: 'Base',
    contractVersion: 'v2' as const,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    sendCommand: vi.fn(),
    onTelemetry: vi.fn().mockReturnValue(() => {}),
    selfTest: vi.fn().mockReturnValue({ ok: true, status: 'healthy', summary: 'mock', checks: [], timestamp: 0, version: 'v2' }),
    capabilities: (): RobotCapabilitiesV2 => ({
      movement: true,
      rotation: true,
      speed: true,
      led: false,
      sound: false,
      gesture: false,
      maxSpeed: 100,
      maxRotationSpeed: 180,
      batteryReporting: false,
      distanceReporting: false,
      imuReporting: false,
      selfTestable: false,
      hardwareEStop: false,
    }),
  }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('motionPrimitive', () => {
  it('motors returns correct command', () => {
    const cmd = motionPrimitive.motors(0.5, -0.5)
    expect(cmd.type).toBe('motors')
    expect(cmd.payload).toEqual({ left: 0.5, right: -0.5 })
  })

  it('moveDuration returns correct command', () => {
    const cmd = motionPrimitive.moveDuration(0.3, 0.7, 1000)
    expect(cmd.type).toBe('move_duration')
    expect(cmd.payload).toEqual({ left: 0.3, right: 0.7, duration: 1000 })
  })

  it('moveDistance returns correct command', () => {
    const cmd = motionPrimitive.moveDistance(100)
    expect(cmd.type).toBe('move_distance')
    expect(cmd.payload).toEqual({ distance: 100, left: 0.5, right: 0.5 })
  })

  it('rotateDegrees returns correct command', () => {
    const cmd = motionPrimitive.rotateDegrees(90, 0.5)
    expect(cmd.type).toBe('rotate_degrees')
    expect(cmd.payload).toEqual({ degrees: 90, speed: 0.5, left: -0.5, right: 0.5 })
  })

  it('stop returns correct command', () => {
    const cmd = motionPrimitive.stop()
    expect(cmd.type).toBe('stop')
    expect(cmd.payload).toEqual({})
  })
})

describe('RoboMasterMotionAdapter', () => {
  let baseAdapter: RobotAdapterV2

  beforeEach(() => {
    baseAdapter = createBaseAdapter()
    vi.clearAllMocks()
  })

  it('has correct type and name', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    expect(adapter.type).toBe('robomaster-motor')
    expect(adapter.name).toBe('RoboMaster Motion Adapter')
  })

  it('uses default config', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    // Config is private, but we can verify it works
    const bb = { x: 0, y: 0 } as any
    adapter.init(bb)
    expect(baseAdapter.init).toHaveBeenCalled()
  })

  it('init delegates to base adapter', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    const bb = { x: 0, y: 0 } as any
    adapter.init(bb)
    expect(baseAdapter.init).toHaveBeenCalledWith(bb)
  })

  it('update delegates to base adapter', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    const bb = { x: 0, y: 0 } as any
    adapter.init(bb)
    adapter.update(bb)
    expect(baseAdapter.update).toHaveBeenCalled()
  })

  it('destroy delegates to base adapter', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    const bb = { x: 0, y: 0 } as any
    adapter.init(bb)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    adapter.destroy()
    expect(baseAdapter.destroy).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('sendCommand sets lastMotionCommand', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    const cmd: AdapterCommand = { type: 'motors', payload: { left: 0.5, right: 0.5 } }
    adapter.sendCommand(cmd)
    expect(adapter.getLastMotionCommand()).toEqual(cmd)
  })

  it('getLastMotionCommand returns undefined after stop', () => {
    const adapter = new RoboMasterMotionAdapter(baseAdapter)
    const cmd: AdapterCommand = { type: 'motors', payload: { left: 0.5, right: 0.5 } }
    adapter.sendCommand(cmd)
    adapter.stop()
    expect(adapter.getLastMotionCommand()).toBeUndefined()
  })

  describe('motion primitives', () => {
    it('moveForward sends motors command', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.moveForward(0.8)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'motors',
        payload: { left: 0.8, right: 0.8 },
      })
    })

    it('moveForward clamps speed', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.moveForward(2) // should clamp to 1
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'motors',
        payload: { left: 1, right: 1 },
      })
    })

    it('moveBackward sends reverse motors command', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.moveBackward(0.5)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'motors',
        payload: { left: -0.5, right: -0.5 },
      })
    })

    it('spinLeft sends differential motors command', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.spinLeft(0.7)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'motors',
        payload: { left: -0.7, right: 0.7 },
      })
    })

    it('spinRight sends differential motors command', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.spinRight(0.7)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'motors',
        payload: { left: 0.7, right: -0.7 },
      })
    })

    it('moveForwardFor sends move_duration command', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.moveForwardFor(2000, 0.5)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'move_duration',
        payload: { left: 0.5, right: 0.5, duration: 2000 },
      })
    })

    it('rotateTo sends rotate_degrees command', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.rotateTo(180, 0.5)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'rotate_degrees',
        payload: { degrees: 180, speed: 0.5, left: -0.5, right: 0.5 },
      })
    })

    it('stop sends stop command and clears lastMotionCommand', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.moveForward(0.5)
      expect(adapter.getLastMotionCommand()).toBeDefined()
      adapter.stop()
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'stop',
        payload: {},
      })
      expect(adapter.getLastMotionCommand()).toBeUndefined()
    })
  })

  describe('LED and sound', () => {
    it('playTone sends sound command with clamped values', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.playTone(50, 5) // should clamp to 100 Hz, 10 ms
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'sound',
        payload: { frequency: 100, duration: 10 },
      })
    })

    it('setLED sends led command with clamped values', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      adapter.setLED(300, -10, 128)
      expect(baseAdapter.sendCommand).toHaveBeenCalledWith({
        type: 'led',
        payload: { r: 255, g: 0, b: 128 },
      })
    })

    it('ledBlink sends multiple LED commands', () => {
      const adapter = new RoboMasterMotionAdapter(baseAdapter)
      // Mock setTimeout to avoid real timers
      const origSetTimeout = globalThis.setTimeout
      globalThis.setTimeout = vi.fn() as any
      adapter.ledBlink(3, 500)
      expect(baseAdapter.sendCommand).toHaveBeenCalledTimes(4) // 3 blinks + final
      globalThis.setTimeout = origSetTimeout
    })
  })
})

describe('createRoboMasterAdapter', () => {
  it('creates a RoboMasterMotionAdapter instance', () => {
    const base = createBaseAdapter()
    const adapter = createRoboMasterAdapter(base, { host: 'robot.local' })
    expect(adapter).toBeInstanceOf(RoboMasterMotionAdapter)
    expect(adapter.type).toBe('robomaster-motor')
  })
})

describe('createRoboMasterWebSocketAdapter', () => {
  it('creates a RoboMasterMotionAdapter wrapping WebSocketAdapter', () => {
    // We can't easily test the WebSocket part, but we can verify the wrapper
    const adapter = createRoboMasterWebSocketAdapter('ws://test.local')
    expect(adapter).toBeInstanceOf(RoboMasterMotionAdapter)
    expect(adapter.type).toBe('robomaster-motor')
    // WebSocketAdapter is the base, so it should be type 'websocket'
    const inner = (adapter as any).adapter
    expect(inner.type).toBe('websocket')
  })
})
