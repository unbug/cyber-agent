/**
 * Multi-agent social BT primitives — tests via the executor's
 * hydrate + tick path (same as builtins.test.ts).
 *
 * Covers:
 *   Conditions: isCloseTo, isFarFrom, agentHasSignal, agentHasEmotion, agentIsAlert
 *   Actions:    findNearestAgent, greet, follow, flee, broadcastEmotion,
 *               onSignal, emitSignal, mirror, roleSwap, negotiate
 */

import { describe, it, expect, vi } from 'vitest'
import { hydrate, tick } from './executor'
import { createBlackboard } from './types'
import type { RobotAdapter, Blackboard, BehaviorNodeDef } from './types'
import { World } from './world'
import './builtins-multi'

// ─── Helpers ──────────────────────────────────────────────────────

function mockAdapter(): RobotAdapter {
  const commands: Array<{ type: string; payload: Record<string, unknown> }> = []
  return {
    type: 'mock',
    name: 'Mock',
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    sendCommand: vi.fn((cmd) => commands.push(cmd)),
    capabilities: () => ({
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: true,
      maxSpeed: 100,
      maxRotationSpeed: 180,
    }),
    _commands: commands,
  } as unknown as RobotAdapter
}

function makeBb(overrides?: Partial<Blackboard>): Blackboard {
  return {
    ...createBlackboard(800, 600),
    ...overrides,
  } as Blackboard
}

/** Create a blackboard with a mock World attached */
function makeWorldBB(world: World, agentId: string): Blackboard {
  const bb = makeBb() as Blackboard & { world?: any; id?: string }
  bb.world = world
  bb.id = agentId
  return bb as Blackboard
}

// ─── World setup helpers ──────────────────────────────────────────

function createWorld(): World {
  const w = new World({ width: 800, height: 600, cellSize: 50, seed: 42 })
  w.registerAgent('a', 'dog', 200, 200)
  w.registerAgent('b', 'cat', 300, 300)
  w.registerAgent('c', 'bird', 600, 500)
  return w
}

// ═══════════════════════════════════════════════════════════════
//  CONDITIONS
// ═══════════════════════════════════════════════════════════════

describe('Social Conditions', () => {
  it('isCloseTo returns true when within distance', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'isCloseTo',
      args: { distance: 200 },
    }
    const root = hydrate(def)
    ;(bb as any).world = world
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('isCloseTo returns false when too far', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'isCloseTo',
      args: { distance: 50 },
    }
    const root = hydrate(def)
    ;(bb as any).world = world
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('isCloseTo with specific targetId works', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    ;(bb as any)._targetId = 'b'
    ;(bb as any)._targetX = 300
    ;(bb as any)._targetY = 300
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'isCloseTo',
      args: { targetId: 'b', distance: 200 },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('isFarFrom returns true when far from all agents', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'isFarFrom',
      args: { distance: 50 },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('agentHasSignal returns true when signal exists', () => {
    const bb = makeBb() as Blackboard & { _signals?: Array<{ topic: string; tick: number }> }
    bb._signals = [{ topic: 'help', tick: 10 }]
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'agentHasSignal',
      args: { topic: 'help', maxAge: 30 },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('agentHasSignal returns false when signal expired', () => {
    const bb = makeBb() as Blackboard & { _signals?: Array<{ topic: string; tick: number }> }
    bb._signals = [{ topic: 'help', tick: 10 }]
    bb.tick = 100
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'agentHasSignal',
      args: { topic: 'help', maxAge: 30 },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('agentHasEmotion returns true when target has emotion', () => {
    const bb = makeBb() as Blackboard & { _targets?: Map<string, any> }
    bb._targets = new Map([['b', { emotion: 'happy' }]])
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'agentHasEmotion',
      args: { targetId: 'b', emotion: 'happy' },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('agentHasEmotion returns false when target has different emotion', () => {
    const bb = makeBb() as Blackboard & { _targets?: Map<string, any> }
    bb._targets = new Map([['b', { emotion: 'angry' }]])
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'agentHasEmotion',
      args: { targetId: 'b', emotion: 'happy' },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('agentIsAlert returns false when no alert nearby', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'condition',
      check: 'agentIsAlert',
      args: { radius: 150 },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════════

describe('Social Actions', () => {
  it('findNearestAgent finds nearest agent within radius', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'findNearestAgent',
      args: { maxRadius: 200 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect((bb as any)._targetId).toBe('b')
    expect((bb as any)._targetX).toBe(300)
    expect((bb as any)._targetY).toBe(300)
  })

  it('findNearestAgent returns failure when no agent in range', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'findNearestAgent',
      args: { maxRadius: 50 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('failure')
    expect((bb as any)._targetId).toBeNull()
  })

  it('findNearestAgent at custom position', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'findNearestAgent',
      args: { x: 600, y: 500, maxRadius: 200 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect((bb as any)._targetId).toBe('c')
  })

  it('greet succeeds when near target', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 300
    bb._targetY = 300
    bb.x = 290
    bb.y = 290

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'greet',
      args: { speed: 100 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    const events = world.getRecentEvents()
    const greetEvent = events.find((e) => e.type === 'agent.greet')
    expect(greetEvent).toBeDefined()
  })

  it('greet returns failure when no target set', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'greet',
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('follow moves toward target', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 300
    bb._targetY = 300
    bb.x = 200
    bb.y = 200

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'follow',
      args: { speed: 20, keepDistance: 50 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('running')
    expect(bb.x).toBeGreaterThan(200)
    expect(bb.y).toBeGreaterThan(200)
  })

  it('follow succeeds when within keepDistance', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 300
    bb._targetY = 300
    bb.x = 270
    bb.y = 270

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'follow',
      args: { speed: 20, keepDistance: 50 },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('success')
  })

  it('flee moves away from target', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 300
    bb._targetY = 300
    bb.x = 200
    bb.y = 200

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'flee',
      args: { speed: 20, fleeDistance: 150 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('running')
    expect(bb.x).toBeLessThan(200)
    expect(bb.y).toBeLessThan(200)
  })

  it('flee clamps to world bounds', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 10
    bb._targetY = 10
    bb.x = 5
    bb.y = 5

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'flee',
      args: { speed: 20, fleeDistance: 150 },
    }
    const root = hydrate(def)
    tick(root, bb, mockAdapter())
    expect(bb.x).toBeGreaterThanOrEqual(10)
    expect(bb.y).toBeGreaterThanOrEqual(10)
  })

  it('broadcastEmotion emits emotion broadcast event', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb.emotion = 'happy'

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'broadcastEmotion',
      args: { emotion: 'happy', radius: 200 },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    const events = world.getRecentEvents()
    expect(events.some((e) => e.type === 'agent.emotion.broadcast')).toBe(true)
  })

  it('emitSignal broadcasts a typed signal', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'emitSignal',
      args: { topic: 'help', payload: { reason: 'lost' } },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    const events = world.getRecentEvents()
    expect(events.some((e) => e.type === 'agent.signal.help')).toBe(true)
  })

  it('onSignal consumes oldest signal on topic', () => {
    const bb = makeBb() as Blackboard & { _signals?: Array<{ topic: string; payload: Record<string, unknown>; tick: number }> }
    bb._signals = [
      { topic: 'help', payload: { reason: 'lost' }, tick: 10 },
      { topic: 'help', payload: { reason: 'need' }, tick: 20 },
    ]
    bb.tick = 25

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'onSignal',
      args: { topic: 'help' },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect((bb as any)._signalPayload).toEqual({ reason: 'lost' })
    expect((bb as any)._signalTick).toBe(10)
  })

  it('onSignal returns failure when no matching signal', () => {
    const bb = makeBb() as Blackboard & { _signals?: Array<{ topic: string; payload: Record<string, unknown>; tick: number }> }
    bb._signals = [{ topic: 'greet', payload: {}, tick: 10 }]
    bb.tick = 15

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'onSignal',
      args: { topic: 'help' },
    }
    const root = hydrate(def)
    expect(tick(root, bb, mockAdapter())).toBe('failure')
  })

  it('mirror adopts target emotion', () => {
    const bb = makeBb() as Blackboard & { _targetId?: string; _targets?: Map<string, any> }
    bb._targetId = 'b'
    bb._targets = new Map([['b', { emotion: 'happy' }]])

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'mirror',
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect(bb.emotion).toBe('happy')
  })

  it('roleSwap proposes role swap', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'roleSwap',
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect((bb as any)._roleSwapTarget).toBe('b')
    expect((bb as any)._roleSwapPending).toBe(true)
  })

  it('negotiate propose phase returns running', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'negotiate',
      args: { phase: 'propose' },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('running')
    expect((bb as any)._negotiatePhase).toBe('waiting')
  })

  it('negotiate accept phase returns success', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'negotiate',
      args: { phase: 'accept' },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    expect((bb as any)._negotiatePhase).toBe('complete')
  })

  it('negotiate reject phase returns failure', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'

    const def: BehaviorNodeDef = {
      type: 'action',
      action: 'negotiate',
      args: { phase: 'reject' },
    }
    const root = hydrate(def)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('failure')
    expect((bb as any)._negotiatePhase).toBe('failed')
  })
})

// ═══════════════════════════════════════════════════════════════
//  Integration: BT with social primitives
// ═══════════════════════════════════════════════════════════════

describe('Social BT Integration', () => {
  it('selector with isCloseTo + greet works end-to-end', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 300
    bb._targetY = 300
    bb.x = 290
    bb.y = 290

    const tree: BehaviorNodeDef = {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'isCloseTo', args: { targetId: 'b', distance: 100 } },
            { type: 'action', action: 'greet', args: { speed: 100 } },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'action', action: 'findNearestAgent', args: { maxRadius: 200 } },
            { type: 'action', action: 'follow', args: { speed: 10 } },
          ],
        },
      ],
    }

    const root = hydrate(tree)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('success')
    const events = world.getRecentEvents()
    expect(events.some((e) => e.type === 'agent.greet')).toBe(true)
  })

  it('fallback to follow when not close', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 300
    bb._targetY = 300
    bb.x = 100
    bb.y = 100

    const tree: BehaviorNodeDef = {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'isCloseTo', args: { targetId: 'b', distance: 50 } },
            { type: 'action', action: 'greet', args: { speed: 100 } },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'action', action: 'findNearestAgent', args: { maxRadius: 200 } },
            { type: 'action', action: 'follow', args: { speed: 10 } },
          ],
        },
      ],
    }

    const root = hydrate(tree)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('running')
    expect((bb as any)._targetId).toBe('a')
  })

  it('flee when target is too close (emergency)', () => {
    const world = createWorld()
    const bb = makeWorldBB(world, 'a')
    bb._targetId = 'b'
    bb._targetX = 210
    bb._targetY = 210
    bb.x = 200
    bb.y = 200

    const tree: BehaviorNodeDef = {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'isCloseTo', args: { targetId: 'b', distance: 20 } },
            { type: 'action', action: 'flee', args: { speed: 30, fleeDistance: 150 } },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'action', action: 'findNearestAgent', args: { maxRadius: 200 } },
            { type: 'action', action: 'follow', args: { speed: 10 } },
          ],
        },
      ],
    }

    const root = hydrate(tree)
    const result = tick(root, bb, mockAdapter())
    expect(result).toBe('running')
    expect(bb.x).toBeLessThan(200)
    expect(bb.y).toBeLessThan(200)
  })
})

// ═══════════════════════════════════════════════════════════════
//  World helpers used by social primitives
// ═══════════════════════════════════════════════════════════════

describe('World helpers', () => {
  it('findNearestAgent returns correct nearest', () => {
    const world = createWorld()
    const nearest = world.findNearestAgent(350, 350)
    expect(nearest).not.toBeNull()
    expect(nearest!.id).toBe('b')
  })

  it('findAgentNeighbors returns adjacent agents', () => {
    const w = new World({ width: 800, height: 600, cellSize: 200, seed: 42 })
    w.registerAgent('a', 'dog', 200, 200)
    w.registerAgent('b', 'cat', 300, 300)
    w.registerAgent('c', 'bird', 600, 500)
    const neighbors = w.findAgentNeighbors('a')
    expect(neighbors.length).toBeGreaterThan(0)
  })

  it('isNear works correctly', () => {
    const world = createWorld()
    expect(world.isNear('a', 'b', 150)).toBe(true)
    expect(world.isNear('a', 'c', 150)).toBe(false)
  })

  it('emitEvent records on bus', () => {
    const world = createWorld()
    world.emitEvent('test.event', 'a', { data: 42 })
    const events = world.getRecentEvents()
    expect(events[events.length - 1]!.type).toBe('test.event')
  })

  it('snapshot captures world state', () => {
    const world = createWorld()
    const snap = world.snapshot()
    expect(snap.agents.length).toBe(3)
    expect(snap.agents[0]?.id).toBe('a')
  })
})
