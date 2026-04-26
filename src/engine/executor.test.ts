import { describe, it, expect, vi } from 'vitest'
import { hydrate, tick, resetTree, registerCondition } from './executor'
import { createBlackboard } from './types'
import type { BehaviorNodeDef, Blackboard, RobotAdapter } from './types'

// Ensure builtins are registered
import './builtins'

// ─── Mock adapter ─────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────

function makeBb(overrides?: Partial<Blackboard>): Blackboard {
  return { ...createBlackboard(400, 300), ...overrides }
}

// ═══════════════════════════════════════════════════════════════
//  Core executor tests
// ═══════════════════════════════════════════════════════════════

describe('Sequence node', () => {
  it('succeeds when all children succeed', () => {
    const def: BehaviorNodeDef = {
      type: 'sequence',
      children: [
        { type: 'action', action: 'idle' },
        { type: 'action', action: 'idle' },
      ],
    }
    const root = hydrate(def)
    const result = tick(root, makeBb(), mockAdapter())
    expect(result).toBe('success')
  })

  it('fails on first failure', () => {
    registerCondition('__testAlwaysFalse', () => false)
    const def: BehaviorNodeDef = {
      type: 'sequence',
      children: [
        { type: 'condition', check: '__testAlwaysFalse' },
        { type: 'action', action: 'idle' },
      ],
    }
    const root = hydrate(def)
    const result = tick(root, makeBb(), mockAdapter())
    expect(result).toBe('failure')
  })
})

describe('Selector node', () => {
  it('succeeds on first success', () => {
    registerCondition('__testAlwaysTrue', () => true)
    const def: BehaviorNodeDef = {
      type: 'selector',
      children: [
        { type: 'condition', check: '__testAlwaysFalse' },
        { type: 'condition', check: '__testAlwaysTrue' },
      ],
    }
    const root = hydrate(def)
    const result = tick(root, makeBb(), mockAdapter())
    expect(result).toBe('success')
  })

  it('fails when all children fail', () => {
    const def: BehaviorNodeDef = {
      type: 'selector',
      children: [
        { type: 'condition', check: '__testAlwaysFalse' },
        { type: 'condition', check: '__testAlwaysFalse' },
      ],
    }
    const root = hydrate(def)
    const result = tick(root, makeBb(), mockAdapter())
    expect(result).toBe('failure')
  })
})

describe('Inverter node', () => {
  it('inverts success to failure', () => {
    const def: BehaviorNodeDef = {
      type: 'inverter',
      child: { type: 'action', action: 'idle' },
    }
    const root = hydrate(def)
    const result = tick(root, makeBb(), mockAdapter())
    expect(result).toBe('failure')
  })

  it('inverts failure to success', () => {
    const def: BehaviorNodeDef = {
      type: 'inverter',
      child: { type: 'condition', check: '__testAlwaysFalse' },
    }
    const root = hydrate(def)
    const result = tick(root, makeBb(), mockAdapter())
    expect(result).toBe('success')
  })
})

describe('Wait node', () => {
  it('returns running then success after duration', () => {
    const def: BehaviorNodeDef = { type: 'wait', durationMs: 100 }
    const root = hydrate(def)
    const bb = makeBb({ totalMs: 0 })

    const r1 = tick(root, bb, mockAdapter())
    expect(r1).toBe('running')

    bb.totalMs = 150
    const r2 = tick(root, bb, mockAdapter())
    expect(r2).toBe('success')
  })
})

describe('Action: setEmotion', () => {
  it('changes emotion on blackboard', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'setEmotion',
      args: { emotion: 'happy' },
    }
    const root = hydrate(def)
    const bb = makeBb()
    tick(root, bb, mockAdapter())
    expect(bb.emotion).toBe('happy')
  })
})

describe('Condition: pointerNearby', () => {
  it('returns true when pointer is close', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'pointerNearby',
      args: { radius: 50 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 120, pointerY: 100 })
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('returns false when pointer is far', () => {
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'pointerNearby',
      args: { radius: 10 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 100, y: 100, pointerX: 300, pointerY: 300 })
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })
})

describe('Action: wander', () => {
  it('moves the agent position', () => {
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'wander',
      args: { speed: 5 },
    }
    const root = hydrate(def)
    const bb = makeBb({ x: 200, y: 150, tick: 0 })
    tick(root, bb, mockAdapter())
    // Should have moved from initial position (or set a wander target)
    expect(bb._wanderTargetX).toBeDefined()
  })
})

describe('resetTree', () => {
  it('resets all nodes to idle', () => {
    const def: BehaviorNodeDef = {
      type: 'sequence',
      children: [{ type: 'action', action: 'idle' }],
    }
    const root = hydrate(def)
    tick(root, makeBb(), mockAdapter())
    expect(root.status).toBe('success')

    resetTree(root)
    expect(root.status).toBe('idle')
    expect(root.children[0]!.status).toBe('idle')
  })
})

describe('hydrate', () => {
  it('creates runtime nodes with children', () => {
    const def: BehaviorNodeDef = {
      type: 'selector',
      children: [
        { type: 'sequence', children: [{ type: 'action', action: 'idle' }] },
        { type: 'action', action: 'idle' },
      ],
    }
    const root = hydrate(def)
    expect(root.children).toHaveLength(2)
    expect(root.children[0]!.children).toHaveLength(1)
  })
})
