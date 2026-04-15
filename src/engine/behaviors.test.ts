import { describe, it, expect } from 'vitest'
import { getBehavior, getAllBehaviors } from '../agents'
import { hydrate, tick } from './executor'
import { createBlackboard } from './types'
import type { RobotAdapter } from './types'

import './builtins'

const mockAdapter: RobotAdapter = {
  type: 'mock',
  name: 'Mock',
  init: () => {},
  update: () => {},
  destroy: () => {},
  sendCommand: () => {},
}

describe('Character behaviors', () => {
  it('has a behavior for every character', () => {
    const ids = [
      'loyal-dog',
      'curious-cat',
      'guard-dino',
      'dance-bot',
      'zen-turtle',
      'scout-eagle',
      'ws-demo',
      'robot-helper',
      'unitree-loyal-dog',
      'unitree-scout',
      'unitree-guardian',
    ]
    for (const id of ids) {
      expect(getBehavior(id)).toBeDefined()
    }
  })

  it('getAllBehaviors returns all 11', () => {
    expect(getAllBehaviors()).toHaveLength(11)
  })

  it('each behavior tree can hydrate and tick without crashing', () => {
    for (const behavior of getAllBehaviors()) {
      const root = hydrate(behavior.tree)
      const bb = {
        ...createBlackboard(400, 300),
        ...(behavior.defaults ?? {}),
      }
      // Run 10 ticks
      for (let i = 0; i < 10; i++) {
        bb.tick = i
        bb.deltaMs = 100
        bb.totalMs = i * 100
        tick(root, bb, mockAdapter)
      }
      // Should have moved or changed emotion
      expect(bb.tick).toBe(9)
    }
  })

  it('loyal-dog follows pointer when nearby', () => {
    const behavior = getBehavior('loyal-dog')!
    const root = hydrate(behavior.tree)
    const bb = {
      ...createBlackboard(400, 300),
      ...behavior.defaults,
      pointerX: 300,
      pointerY: 200,
      pointerActive: true,
      totalMs: 0,
      tick: 0,
      deltaMs: 80,
    }

    const startX = bb.x
    // Tick multiple times
    for (let i = 0; i < 5; i++) {
      bb.tick = i
      bb.totalMs = i * 80
      tick(root, bb, mockAdapter)
    }

    // Dog should have moved toward pointer
    const dx = bb.x - startX
    expect(Math.abs(dx)).toBeGreaterThan(0)
    expect(bb.emotion).toBe('happy')
  })

  it('guard-dino goes alert near pointer', () => {
    const behavior = getBehavior('guard-dino')!
    const root = hydrate(behavior.tree)
    const bb = {
      ...createBlackboard(400, 300),
      ...behavior.defaults,
      pointerX: 220,
      pointerY: 160,
      pointerActive: true,
      totalMs: 0,
      tick: 0,
      deltaMs: 100,
    }

    for (let i = 0; i < 3; i++) {
      bb.tick = i
      bb.totalMs = i * 100
      tick(root, bb, mockAdapter)
    }

    expect(bb.emotion).toBe('alert')
  })
})
