/**
 * World unit tests
 *
 * Tests agent registration, spatial queries, event bus,
 * deterministic RNG, and the tick/run lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { World, type BusEvent, subscribeToWorld } from './world'

describe('World', () => {
  let world: World

  beforeEach(() => {
    world = new World({ width: 800, height: 600, cellSize: 50, seed: 42 })
  })

  describe('agent registration', () => {
    it('registers an agent', () => {
      const agent = world.registerAgent('a1', 'puppy')
      expect(agent.id).toBe('a1')
      expect(agent.characterId).toBe('puppy')
      expect(agent.active).toBe(true)
      expect(world.getAgentCount()).toBe(1)
    })

    it('registers agents at custom positions', () => {
      const agent = world.registerAgent('a1', 'cat', 100, 200)
      expect(agent.x).toBe(100)
      expect(agent.y).toBe(200)
    })

    it('unregisters an agent', () => {
      world.registerAgent('a1', 'puppy')
      world.unregisterAgent('a1')
      expect(world.getAgentCount()).toBe(0)
      expect(world.getAgent('a1')).toBeUndefined()
    })

    it('gets all agents', () => {
      world.registerAgent('a1', 'puppy')
      world.registerAgent('a2', 'cat')
      const agents = world.getAgents()
      expect(agents).toHaveLength(2)
      expect(agents.map((a) => a.id).sort()).toEqual(['a1', 'a2'])
    })
  })

  describe('spatial queries', () => {
    beforeEach(() => {
      world.registerAgent('a1', 'puppy', 50, 50)
      world.registerAgent('a2', 'cat', 55, 55)
      world.registerAgent('a3', 'dog', 200, 200)
      world.registerAgent('a4', 'bird', 400, 300)
    })

    it('finds nearby agents by position', () => {
      const nearby = world.findNearbyAgents(50, 50, 30)
      expect(nearby.map((a) => a.id).sort()).toEqual(['a1', 'a2'])
    })

    it('finds agent neighbors', () => {
      const neighbors = world.findAgentNeighbors('a1')
      expect(neighbors.map((a) => a.id).sort()).toEqual(['a2'])
    })

    it('checks if agents are near each other', () => {
      expect(world.isNear('a1', 'a2', 30)).toBe(true)
      expect(world.isNear('a1', 'a3', 30)).toBe(false)
    })

    it('checks adjacency', () => {
      expect(world.isAdjacent('a1', 'a2')).toBe(true)
      expect(world.isAdjacent('a1', 'a3')).toBe(false)
    })

    it('finds nearest agent to position', () => {
      const nearest = world.findNearestAgent(52, 52)
      expect(nearest?.id).toBe('a1')
    })

    it('finds nearest agent to another agent', () => {
      const nearest = world.findNearestToAgent('a3')
      // a2 at (55,55) is closer to a3 at (200,200) than a1 at (25,25)
      expect(nearest).not.toBeNull()
      expect(nearest!.id).not.toBe('a3') // should not return self
    })

    it('excludes a specific agent from nearest search', () => {
      const nearest = world.findNearestAgent(52, 52, 'a1')
      expect(nearest?.id).toBe('a2')
    })
  })

  describe('event bus', () => {
    it('emits and receives events', () => {
      const received: BusEvent[] = []
      world.onEvent('test.event', () => {
        received.push(...world.getRecentEvents())
      })
      world.emitEvent('test.event', 'a1', { foo: 'bar' })
      expect(received.length).toBeGreaterThan(0)
      expect(received[0]!.type).toBe('test.event')
      expect(received[0]!.source).toBe('a1')
      expect((received[0]!.payload as any).foo).toBe('bar')
    })

    it('emits tick events', () => {
      world.tick()
      const events = world.getRecentEvents()
      const tickEvent = events.find((e) => e.type === 'world.tick')
      expect(tickEvent).toBeDefined()
      expect((tickEvent?.payload as any).step).toBe(1)
    })

    it('emits register/unregister events', () => {
      const events: string[] = []
      world.onEvent('agent.register', () => events.push('register'))
      world.onEvent('agent.unregister', () => events.push('unregister'))
      world.registerAgent('a1', 'puppy')
      world.unregisterAgent('a1')
      expect(events).toEqual(['register', 'unregister'])
    })
  })

  describe('deterministic RNG', () => {
    it('produces same sequence with same seed', () => {
      const w1 = new World({ seed: 42 })
      const w2 = new World({ seed: 42 })
      const seq1 = Array.from({ length: 10 }, () => w1.random())
      const seq2 = Array.from({ length: 10 }, () => w2.random())
      expect(seq1).toEqual(seq2)
    })

    it('produces different sequence with different seed', () => {
      const w1 = new World({ seed: 42 })
      const w2 = new World({ seed: 99 })
      expect(w1.random()).not.toBe(w2.random())
    })

    it('reseed changes sequence', () => {
      const w = new World({ seed: 42 })
      const before = w.random()
      w.reseed(42)
      const after = w.random()
      expect(after).toBe(before)
    })
  })

  describe('shared blackboard', () => {
    it('gets and sets shared state', () => {
      world.setSharedState('x', 100)
      expect(world.getSharedState('x')).toBe(100)
    })

    it('updates via patch', () => {
      world.setBlackboard({ x: 500, y: 400 })
      expect(world.blackboard.x).toBe(500)
      expect(world.blackboard.y).toBe(400)
    })
  })

  describe('tick / run', () => {
    it('increments step and time', () => {
      expect(world.step).toBe(0)
      expect(world.time).toBe(0)
      world.tick()
      expect(world.step).toBe(1)
      expect(world.time).toBe(16)
    })

    it('increments step and time correctly', () => {
      world.tick()
      world.tick()
      expect(world.step).toBe(2)
      expect(world.time).toBe(32)
    })

    it('runs multiple steps', () => {
      const result = world.run(10)
      expect(result.step).toBe(10)
      expect(result.time).toBe(160)
      expect(result.agents).toHaveLength(0)
    })

    it('includes agent snapshots after run', () => {
      world.registerAgent('a1', 'puppy', 100, 200)
      world.run(5)
      const result = world.run(5)
      expect(result.agents).toHaveLength(1)
      expect(result.agents[0]!.id).toBe('a1')
    })
  })

  describe('snapshot', () => {
    it('returns current world state', () => {
      world.registerAgent('a1', 'puppy', 100, 200)
      world.registerAgent('a2', 'cat', 300, 400)
      world.tick()
      const snap = world.snapshot()
      expect(snap.time).toBe(16)
      expect(snap.step).toBe(1)
      expect(snap.agents).toHaveLength(2)
      expect(snap.spatialStats.totalPoints).toBe(2)
    })
  })

  describe('reset / destroy', () => {
    it('resets the world', () => {
      world.registerAgent('a1', 'puppy')
      world.tick()
      world.reset()
      expect(world.getAgentCount()).toBe(0)
      expect(world.step).toBe(0)
      expect(world.time).toBe(0)
    })

    it('destroy is same as reset', () => {
      world.registerAgent('a1', 'puppy')
      world.destroy()
      expect(world.getAgentCount()).toBe(0)
    })
  })

  describe('subscribeToWorld', () => {
    it('subscribes to world events', () => {
      let count = 0
      const unsub = subscribeToWorld(world, () => count++)
      world.tick()
      world.registerAgent('a1', 'puppy')
      expect(count).toBeGreaterThan(0)
      unsub()
      const beforeCount = count
      world.tick()
      expect(count).toBe(beforeCount)
    })
  })
})
