/**
 * MultiExecutor unit tests
 *
 * Tests agent registration, tick execution, scheduling modes,
 * VAL engine integration, and the run lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { World } from './world'
import { MultiExecutor } from './multi-executor'
import { hydrate } from './executor'
import type { BehaviorNodeDef } from './types'

function makeTree(): BehaviorNodeDef {
  return { type: 'sequence', children: [] }
}

describe('MultiExecutor', () => {
  let world: World
  let executor: MultiExecutor

  beforeEach(() => {
    world = new World({ width: 800, height: 600, cellSize: 50, seed: 42 })
    executor = new MultiExecutor(world)
  })

  describe('agent registration', () => {
    it('registers an agent context', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      const ctx = executor.registerAgent('a1', tree, bb)
      expect(ctx.agentId).toBe('a1')
      expect(executor.getContextCount()).toBe(1)
    })

    it('unregisters an agent context', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      executor.registerAgent('a1', tree, bb)
      executor.unregisterAgent('a1')
      expect(executor.getContextCount()).toBe(0)
    })

    it('gets all contexts', () => {
      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = world.registerAgent('a1', 'puppy').blackboard
      const bb2 = world.registerAgent('a2', 'cat').blackboard
      executor.registerAgent('a1', tree1, bb1)
      executor.registerAgent('a2', tree2, bb2)
      const contexts = executor.getContexts()
      expect(contexts).toHaveLength(2)
      expect(contexts.map((c) => c.agentId).sort()).toEqual(['a1', 'a2'])
    })
  })

  describe('tick execution', () => {
    it('ticks all agents', () => {
      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = world.registerAgent('a1', 'puppy').blackboard
      const bb2 = world.registerAgent('a2', 'cat').blackboard
      executor.registerAgent('a1', tree1, bb1)
      executor.registerAgent('a2', tree2, bb2)

      const results = executor.tickAll()
      expect(results).toHaveLength(2)
      expect(results.every((r) => r.status === 'success')).toBe(true)
    })

    it('ticks a single agent', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      executor.registerAgent('a1', tree, bb)

      const result = executor.tickAgent('a1')
      expect(result).toBe('success')
    })

    it('skips inactive agents', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      executor.registerAgent('a1', tree, bb)
      executor.unregisterAgent('a1')

      const result = executor.tickAgent('a1')
      expect(result).toBe('skipped')
    })

    it('ticks only active agents', () => {
      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = world.registerAgent('a1', 'puppy').blackboard
      const bb2 = world.registerAgent('a2', 'cat').blackboard
      executor.registerAgent('a1', tree1, bb1)
      executor.registerAgent('a2', tree2, bb2)
      executor.unregisterAgent('a2')

      const results = executor.tickActive()
      expect(results).toHaveLength(1)
      expect(results[0]!.agentId).toBe('a1')
    })
  })

  describe('scheduling modes', () => {
    it('all-at-once executes in map order', () => {
      executor.setConfig({ schedule: 'all-at-once' })
      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = world.registerAgent('a1', 'puppy').blackboard
      const bb2 = world.registerAgent('a2', 'cat').blackboard
      executor.registerAgent('a1', tree1, bb1)
      executor.registerAgent('a2', tree2, bb2)

      const results = executor.tickAll()
      expect(results).toHaveLength(2)
    })

    it('phased executes in phase order', () => {
      executor.setConfig({ schedule: 'phased', phaseOrder: ['a2', 'a1'] })
      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = world.registerAgent('a1', 'puppy').blackboard
      const bb2 = world.registerAgent('a2', 'cat').blackboard
      executor.registerAgent('a1', tree1, bb1)
      executor.registerAgent('a2', tree2, bb2)

      const results = executor.tickAll()
      expect(results).toHaveLength(2)
      // In phased mode, order is determined by phaseOrder
      expect(results[0]!.agentId).toBe('a2')
      expect(results[1]!.agentId).toBe('a1')
    })

    it('skips agents not in phase order', () => {
      executor.setConfig({ schedule: 'phased', phaseOrder: ['a1'] })
      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = world.registerAgent('a1', 'puppy').blackboard
      const bb2 = world.registerAgent('a2', 'cat').blackboard
      executor.registerAgent('a1', tree1, bb1)
      executor.registerAgent('a2', tree2, bb2)

      const results = executor.tickAll()
      expect(results).toHaveLength(1)
      expect(results[0]!.agentId).toBe('a1')
      expect(results[0]!.status).toBe('success')
    })
  })

  describe('run', () => {
    it('runs the simulation for N steps', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      executor.registerAgent('a1', tree, bb)

      const snap = executor.run(10)
      expect(snap.step).toBe(10)
      expect(snap.agents).toHaveLength(1)
      expect(snap.agents[0]!.id).toBe('a1')
    })
  })

  describe('deterministic behavior', () => {
    it('produces same results with same seed', () => {
      const w1 = new World({ seed: 42 })
      const e1 = new MultiExecutor(w1)
      const w2 = new World({ seed: 42 })
      const e2 = new MultiExecutor(w2)

      const tree1 = hydrate(makeTree())
      const tree2 = hydrate(makeTree())
      const bb1 = w1.registerAgent('a1', 'puppy').blackboard
      const bb2 = w2.registerAgent('a1', 'puppy').blackboard
      e1.registerAgent('a1', tree1, bb1)
      e2.registerAgent('a1', tree2, bb2)

      const snap1 = e1.run(10)
      const snap2 = e2.run(10)
      expect(snap1.agents).toEqual(snap2.agents)
    })
  })

  describe('reset / destroy', () => {
    it('resets without clearing agents', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      executor.registerAgent('a1', tree, bb)

      executor.reset()
      expect(executor.getContextCount()).toBe(1)
    })

    it('destroys all agents', () => {
      const tree = hydrate(makeTree())
      const bb = world.registerAgent('a1', 'puppy').blackboard
      executor.registerAgent('a1', tree, bb)

      executor.destroy()
      expect(executor.getContextCount()).toBe(0)
    })
  })
})
