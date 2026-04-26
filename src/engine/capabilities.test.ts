/**
 * Capability discovery tests
 *
 * Tests:
 * - isNodeCompatible() returns correct results for all node types
 * - Each adapter's capabilities() returns a valid RobotCapabilities object
 * - Grey-out logic: adapters without movement disable action nodes
 */

import { describe, it, expect } from 'vitest'
import { isNodeCompatible, DEFAULT_CAPABILITIES } from './types'
import { CanvasAdapter } from './canvas-adapter'
import { WebSocketAdapter } from './websocket-adapter'
import { MBotAdapter } from '@/adapters/mbot'
import { RoboMasterAdapterV2 } from '@/adapters/robo-master-v2'
import { RoboMasterMotionAdapter } from './robomaster-robot-adaptor'
import type { RobotCapabilities, RobotAdapter } from './types'

// ─── isNodeCompatible tests ───────────────────────────────────

describe('isNodeCompatible', () => {
  it('allows all composites with any adapter', () => {
    const caps: RobotCapabilities = {
      movement: false, rotation: false, speed: false,
      led: false, sound: false, gesture: false,
      maxSpeed: 0, maxRotationSpeed: 0,
    }
    expect(isNodeCompatible('sequence', caps)).toBe(true)
    expect(isNodeCompatible('selector', caps)).toBe(true)
    expect(isNodeCompatible('parallel', caps)).toBe(true)
    expect(isNodeCompatible('inverter', caps)).toBe(true)
    expect(isNodeCompatible('repeater', caps)).toBe(true)
    expect(isNodeCompatible('cooldown', caps)).toBe(true)
    expect(isNodeCompatible('root', caps)).toBe(true)
  })

  it('allows conditions with any adapter', () => {
    const caps: RobotCapabilities = {
      movement: false, rotation: false, speed: false,
      led: false, sound: false, gesture: false,
      maxSpeed: 0, maxRotationSpeed: 0,
    }
    expect(isNodeCompatible('condition', caps)).toBe(true)
  })

  it('allows wait with any adapter', () => {
    const caps: RobotCapabilities = {
      movement: false, rotation: false, speed: false,
      led: false, sound: false, gesture: false,
      maxSpeed: 0, maxRotationSpeed: 0,
    }
    expect(isNodeCompatible('wait', caps)).toBe(true)
  })

  it('allows action when adapter has at least one output capability', () => {
    expect(isNodeCompatible('action', { ...DEFAULT_CAPABILITIES, led: true, movement: false, sound: false, gesture: false })).toBe(true)
    expect(isNodeCompatible('action', { ...DEFAULT_CAPABILITIES, sound: true, movement: false, led: false, gesture: false })).toBe(true)
    expect(isNodeCompatible('action', { ...DEFAULT_CAPABILITIES, gesture: true, movement: false, led: false, sound: false })).toBe(true)
  })

  it('blocks action when adapter has no output capabilities', () => {
    const noOutput: RobotCapabilities = {
      movement: false, rotation: false, speed: false,
      led: false, sound: false, gesture: false,
      maxSpeed: 0, maxRotationSpeed: 0,
    }
    expect(isNodeCompatible('action', noOutput)).toBe(false)
  })

  it('allows action with movement-only adapter', () => {
    const movementOnly: RobotCapabilities = {
      movement: true, rotation: false, speed: false,
      led: false, sound: false, gesture: false,
      maxSpeed: 100, maxRotationSpeed: 0,
    }
    expect(isNodeCompatible('action', movementOnly)).toBe(true)
  })
})

// ─── Adapter capabilities() tests ─────────────────────────────

describe('CanvasAdapter.capabilities()', () => {
  it('returns valid capabilities object', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const adapter = new CanvasAdapter(canvas, '🤖')
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.rotation).toBe(true)
    expect(caps.led).toBe(false)
    expect(caps.sound).toBe(false)
    expect(caps.gesture).toBe(false)
    expect(caps.maxSpeed).toBe(100)
  })

  it('action nodes are compatible with canvas adapter', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const adapter = new CanvasAdapter(canvas, '🤖')
    expect(isNodeCompatible('action', adapter.capabilities())).toBe(true)
  })
})

describe('WebSocketAdapter.capabilities()', () => {
  it('returns full capabilities (passthrough)', () => {
    const adapter = new WebSocketAdapter({ url: 'ws://localhost:8080' })
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.led).toBe(true)
    expect(caps.sound).toBe(true)
    expect(caps.gesture).toBe(true)
    expect(caps.maxSpeed).toBe(200)
    // Clean up
    adapter.destroy()
  })
})

describe('MBotAdapter.capabilities()', () => {
  it('returns mBot-specific capabilities', () => {
    const adapter = MBotAdapter.create()
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.led).toBe(true)
    expect(caps.sound).toBe(true)
    expect(caps.gesture).toBe(false)
    expect(caps.maxSpeed).toBe(100)
  })

  it('action nodes are compatible with mBot adapter', () => {
    const adapter = MBotAdapter.create()
    expect(isNodeCompatible('action', adapter.capabilities())).toBe(true)
  })
})

describe('RoboMasterAdapterV2.capabilities()', () => {
  it('returns full capabilities', () => {
    const adapter = RoboMasterAdapterV2._forTest({
      host: 'localhost',
      port: 8080,
      heartbeatInterval: 100,
      useBinaryProtocol: false,
    })
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.gesture).toBe(true)
    expect(caps.maxSpeed).toBe(400)
    expect(caps.maxRotationSpeed).toBe(360)
  })

  it('action nodes are compatible with RoboMaster adapter', () => {
    const adapter = RoboMasterAdapterV2._forTest({
      host: 'localhost',
      port: 8080,
      heartbeatInterval: 100,
      useBinaryProtocol: false,
    })
    expect(isNodeCompatible('action', adapter.capabilities())).toBe(true)
  })
})

describe('RoboMasterMotionAdapter.capabilities()', () => {
  it('delegates capabilities to underlying adapter', () => {
    const mockBase: RobotAdapter = {
      type: 'mock',
      name: 'Mock',
      init: () => {},
      update: () => {},
      destroy: () => {},
      sendCommand: () => {},
      capabilities: () => ({
        movement: true, rotation: true, speed: true,
        led: false, sound: false, gesture: false,
        maxSpeed: 50, maxRotationSpeed: 90,
      }),
    }
    const adapter = new RoboMasterMotionAdapter(mockBase)
    const caps = adapter.capabilities()
    expect(caps.maxSpeed).toBe(400) // Motion adapter has its own capabilities
  })
})

// ─── Grey-out logic: no-movement adapter blocks actions ───────

describe('Grey-out: no-movement adapter', () => {
  const noMovement: RobotCapabilities = {
    movement: false, rotation: false, speed: false,
    led: false, sound: false, gesture: false,
    maxSpeed: 0, maxRotationSpeed: 0,
  }

  it('blocks action nodes', () => {
    expect(isNodeCompatible('action', noMovement)).toBe(false)
  })

  it('allows composites', () => {
    expect(isNodeCompatible('sequence', noMovement)).toBe(true)
    expect(isNodeCompatible('selector', noMovement)).toBe(true)
  })

  it('allows conditions', () => {
    expect(isNodeCompatible('condition', noMovement)).toBe(true)
  })
})
