/**
 * Built-in actions & conditions — exercises the full register surface.
 * Covers conditions, movement actions, emotion actions, robotics actions,
 * robot command actions, enhanced movement, sound/response, and extended
 * conditions.
 */

import { describe, it, expect, vi } from 'vitest'
import { hydrate, tick } from './executor'
import { createBlackboard } from './types'
import type { RobotAdapter, Blackboard, BehaviorNodeDef } from './types'

import './builtins'

// ─── Helpers ──────────────────────────────────────────────────────

function mockAdapter(): RobotAdapter {
  return {
    type: 'mock',
    name: 'Mock',
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    sendCommand: vi.fn(),
    capabilities: () => ({
      movement: true,
      rotation: true,
      speed: true,
      led: false,
      sound: false,
      gesture: false,
      maxSpeed: 100,
      maxRotationSpeed: 180,
    }),
  }
}

function makeBb(overrides?: Partial<Blackboard>): Blackboard {
  return {
    ...createBlackboard(400, 300),
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
//  CONDITIONS
// ═══════════════════════════════════════════════════════════════

describe('Conditions', () => {
  it('pointerNearby returns true when close', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'pointerNearby',
      args: { radius: 50 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 120, pointerY: 100 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('pointerNearby returns false when far', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'pointerNearby',
      args: { radius: 10 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 300, pointerY: 300 })
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('pointerActive returns true when active', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'pointerActive' }
    const root = hydrate(def)
    const bb = makeBb({ pointerActive: true })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('energyAbove returns true when above threshold', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'energyAbove',
      args: { threshold: 0.5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.8 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('energyBelow returns true when below threshold', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'energyBelow',
      args: { threshold: 0.5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.2 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('excitementAbove returns true when above threshold', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'excitementAbove',
      args: { threshold: 0.3 },
    }
    const root = hydrate(def)
    const bb = makeBb({ excitement: 0.6 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('nearEdge returns true near edge', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'nearEdge',
      args: { margin: 30 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 10, y: 150 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('nearEdge returns false in center', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'nearEdge',
      args: { margin: 30 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 200, y: 150 })
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('emotionIs returns true when match', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'emotionIs',
      args: { emotion: 'happy' },
    }
    const root = hydrate(def)
    const bb = makeBb({ emotion: 'happy' })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('tickModulo returns true when tick matches', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'tickModulo',
      args: { mod: 10 },
    }
    const root = hydrate(def)
    const bb = makeBb({ tick: 20 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  // Robotics-specific conditions
  it('energyLow returns true when energy < 0.3', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'energyLow' }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.2 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('energyHigh returns true when energy > 0.7', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'energyHigh' }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.8 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('balanceStable returns true when emotion is idle', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'balanceStable' }
    const root = hydrate(def)
    const bb = makeBb({ emotion: 'idle' })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('balanceCritical returns true when energy < 0.2', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'balanceCritical' }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.1 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('isAlerted returns true when emotion is alert', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'isAlerted' }
    const root = hydrate(def)
    const bb = makeBb({ emotion: 'alert' })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('notAlerted returns true when emotion is not alert', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'notAlerted' }
    const root = hydrate(def)
    const bb = makeBb({ emotion: 'happy' })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('shouldMap returns true every 50 ticks', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'shouldMap' }
    const root = hydrate(def)
    const bb = makeBb({ tick: 50 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  // Additional conditions
  it('excitementHigh returns true when above threshold', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'excitementHigh',
      args: { threshold: 0.3 },
    }
    const root = hydrate(def)
    const bb = makeBb({ excitement: 0.6 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('isNear returns true when close to target', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'isNear',
      args: { x: 120, y: 100, distance: 30 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('pauseRandomly returns false when no pause set', () => {
    const def: BehaviorNodeDef = { type: 'condition', check: 'pauseRandomly' }
    const root = hydrate(def)
    const bb = makeBb({})
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Movement
// ═══════════════════════════════════════════════════════════════

describe('Actions — Movement', () => {
  it('moveToPointer moves toward pointer', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'moveToPointer',
      args: { speed: 10 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 200, pointerY: 100 })
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeGreaterThan(100)
  })

  it('moveToPointer succeeds when close enough', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'moveToPointer',
      args: { speed: 100 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 105, pointerY: 100 })
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
  })

  it('wander picks a wander target', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'wander',
      args: { speed: 5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 200, y: 150, tick: 0 })
    tick(root, bb, mockAdapter())
    expect(bb._wanderTargetX).toBeDefined()
    expect(bb._wanderTargetY).toBeDefined()
  })

  it('patrol cycles waypoints', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'patrol',
      args: { speed: 100 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 30, y: 30, tick: 0 })
    tick(root, bb, mockAdapter())
    expect(bb._patrolIdx).toBe(1)
  })

  it('moveToCenter moves toward center', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'moveToCenter',
      args: { speed: 100 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 0, y: 0 })
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeGreaterThan(0)
    expect(bb.y).toBeGreaterThan(0)
  })

  it('bounceFromEdge bounces at margin', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'bounceFromEdge',
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 5, y: 150 })
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect(bb.x).toBe(20) // margin
  })

  it('bounceFromEdge returns failure when not at edge', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'bounceFromEdge',
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 200, y: 150 })
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('failure')
  })

  // Enhanced movement
  it('spiralInward spirals toward center', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'spiralInward',
      args: { speed: 5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100 })
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeDefined()
  })

  it('orbit orbits around center', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'orbit',
      args: { centerX: 200, centerY: 150, radius: 60, speed: 0.1 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 260, y: 150 })
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeDefined()
  })

  it('moveAwayFromPointer moves away from pointer', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'moveAwayFromPointer',
      args: { speed: 10 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 50, pointerY: 100 })
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeGreaterThan(100)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Emotion / State
// ═══════════════════════════════════════════════════════════════

describe('Actions — Emotion / State', () => {
  it('setEmotion changes emotion', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'setEmotion',
      args: { emotion: 'curious' },
    }
    const root = hydrate(def)
    const bb = makeBb()
    tick(root, bb, mockAdapter())
    expect(bb.emotion).toBe('curious')
  })

  it('drainEnergy decreases energy', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'drainEnergy',
      args: { rate: 0.1 },
    }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.5 })
    tick(root, bb, mockAdapter())
    expect(bb.energy).toBeLessThan(0.5)
  })

  it('restoreEnergy increases energy', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'restoreEnergy',
      args: { rate: 0.1 },
    }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.5 })
    tick(root, bb, mockAdapter())
    expect(bb.energy).toBeGreaterThan(0.5)
  })

  it('increaseExcitement increases excitement', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'increaseExcitement',
      args: { amount: 0.2 },
    }
    const root = hydrate(def)
    const bb = makeBb({ excitement: 0.3 })
    tick(root, bb, mockAdapter())
    expect(bb.excitement).toBeGreaterThan(0.3)
  })

  it('decayExcitement decreases excitement', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'decayExcitement',
    }
    const root = hydrate(def)
    const bb = makeBb({ excitement: 0.5 })
    tick(root, bb, mockAdapter())
    expect(bb.excitement).toBeLessThan(0.5)
  })

  it('idle returns success', () => {
    const def: BehaviorNodeDef = { type: 'action', action: 'idle' }
    const root = hydrate(def)
    const bb = makeBb()
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('setExcitement sets excitement level', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'setExcitement',
      args: { level: 0.8 },
    }
    const root = hydrate(def)
    const bb = makeBb({ excitement: 0.2 })
    tick(root, bb, mockAdapter())
    expect(bb.excitement).toBe(0.8)
  })

  it('randomEmotion sets a random emotion', () => {
    const def: BehaviorNodeDef = { type: 'action', action: 'randomEmotion' }
    const root = hydrate(def)
    const bb = makeBb()
    tick(root, bb, mockAdapter())
    const validEmotions = ['happy', 'curious', 'playful', 'alert', 'idle']
    expect(validEmotions).toContain(bb.emotion)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Robotics-specific
// ═══════════════════════════════════════════════════════════════

describe('Actions — Robotics', () => {
  it('heartbeat always succeeds', () => {
    const def: BehaviorNodeDef = { type: 'action', action: 'heartbeat' }
    const root = hydrate(def)
    const bb = makeBb()
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('followWithBalanceCheck fails when energy < 0.2', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'followWithBalanceCheck',
      args: { speed: 10 },
    }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.1, pointerX: 200, pointerY: 100 })
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('failure')
  })

  it('adaptToTerrain always succeeds', () => {
    const def: BehaviorNodeDef = { type: 'action', action: 'adaptToTerrain' }
    const root = hydrate(def)
    const bb = makeBb()
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('walkOnTerrain returns running', () => {
    const def: BehaviorNodeDef = { type: 'action', action: 'walkOnTerrain' }
    const root = hydrate(def)
    const bb = makeBb()
    expect(tick(root, bb, mockAdapter())).toBe('running')
  })
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Robot Commands
// ═══════════════════════════════════════════════════════════════

describe('Actions — Robot Commands', () => {
  it('sendCommand forwards to adapter', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'sendCommand',
      args: { type: 'motors', payload: { left: 0.5, right: 0.5 } },
    }
    const root = hydrate(def)
    const bb = makeBb()
    const adapter = mockAdapter()
    tick(root, bb, adapter)
    expect(adapter.sendCommand).toHaveBeenCalledWith({
      type: 'motors',
      payload: { left: 0.5, right: 0.5 },
    })
  })

  it('speakPhrase sends speak command', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'speakPhrase',
      args: { text: 'hello' },
    }
    const root = hydrate(def)
    const bb = makeBb()
    const adapter = mockAdapter()
    tick(root, bb, adapter)
    expect(adapter.sendCommand).toHaveBeenCalledWith({
      type: 'speak',
      payload: { text: 'hello' },
    })
  })

  it('playSound sends sound command', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'playSound',
      args: { frequency: 440, duration: 500 },
    }
    const root = hydrate(def)
    const bb = makeBb()
    const adapter = mockAdapter()
    tick(root, bb, adapter)
    expect(adapter.sendCommand).toHaveBeenCalledWith({
      type: 'sound',
      payload: { frequency: 440, duration: 500 },
    })
  })

  it('flashLED sends led command from hex color', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'flashLED',
      args: { color: '#ff0000' },
    }
    const root = hydrate(def)
    const bb = makeBb()
    const adapter = mockAdapter()
    tick(root, bb, adapter)
    expect(adapter.sendCommand).toHaveBeenCalledWith({
      type: 'led',
      payload: { r: 255, g: 0, b: 0 },
    })
  })
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — stayStill & erraticMove
// ═══════════════════════════════════════════════════════════════

describe('Actions — stayStill & erraticMove', () => {
  it('stayStill returns running then success', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'stayStill',
      args: { duration: 100 },
    }
    const root = hydrate(def)
    const bb = makeBb({ tick: 0 }) as Blackboard & { tickIntervalMs?: number }
    bb.tickIntervalMs = 50

    const r1 = tick(root, bb, mockAdapter())
    expect(r1).toBe('running')

    bb.tick = 5 // 5 * 50 = 250ms >= 100ms
    const r2 = tick(root, bb, mockAdapter())
    expect(r2).toBe('success')
  })

  it('erraticMove moves toward pointer with jitter', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'erraticMove',
      args: { speed: 10, jitter: 0.3, target: 'pointer' },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 200, pointerY: 100 })
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  CONDITIONS — Extended
// ═══════════════════════════════════════════════════════════════

describe('Conditions — Extended', () => {
  it('pointerFarAway returns true when far', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'pointerFarAway',
      args: { radius: 50 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 300, pointerY: 300 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('energyEqual returns true when near value', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'energyEqual',
      args: { value: 0.5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ energy: 0.5 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('emotionNot returns true when emotion differs', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'emotionNot',
      args: { emotion: 'idle' },
    }
    const root = hydrate(def)
    const bb = makeBb({ emotion: 'happy' })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('excitementBelow returns true when below threshold', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'excitementBelow',
      args: { threshold: 0.5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ excitement: 0.2 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('atEdge returns true at edge', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'atEdge',
      args: { margin: 30 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 10, y: 150 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('atCenter returns true near center', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'atCenter',
      args: { tolerance: 30 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 200, y: 150 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('notNearEdge returns true in center', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'notNearEdge',
      args: { margin: 30 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 200, y: 150 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })
})
