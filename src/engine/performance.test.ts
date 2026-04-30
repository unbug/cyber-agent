/**
 * Performance benchmark — tick latency budget
 *
 * Ensures the BT engine meets the v1.0 performance budget:
 * <16 ms per tick on a $50 mBot (simulated).
 *
 * Run: npm test -- src/engine/performance.test.ts
 */

import { describe, it, expect } from 'vitest'
import { createBlackboard } from './types'
import { hydrate, tick } from './executor'
// Ensure built-in actions/conditions are registered (side-effect import)
import './builtins'

describe('performance — tick budget', () => {
  it('hydrates a full character tree in <10 ms', () => {
    const tree = {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'pointerActive' },
            { type: 'action', action: 'moveToPointer' },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'energyLow' },
            { type: 'action', action: 'restoreEnergy' },
          ],
        },
        { type: 'action', action: 'wander' },
      ],
    }

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      hydrate(tree)
    }
    const elapsed = performance.now() - start
    const avg = elapsed / 100

    expect(avg).toBeLessThan(10)
  })

  it('ticks a hydrated tree 1000× in <16 ms average', () => {
    const tree = {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'pointerActive' },
            { type: 'action', action: 'moveToPointer' },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'condition', check: 'energyLow' },
            { type: 'action', action: 'restoreEnergy' },
          ],
        },
        { type: 'action', action: 'wander' },
      ],
    }

    const root = hydrate(tree)
    const bb = createBlackboard()
    bb.pointerActive = true
    bb.energy = 0.8

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      tick(root, bb)
    }
    const elapsed = performance.now() - start
    const avg = elapsed / 1000

    expect(avg).toBeLessThan(16)
  })

  it('ticks a complex tree (puppy) 100× in <16 ms average', () => {
    // Complex tree: sequence of selector → sequence → actions
    const tree = {
      type: 'sequence',
      children: [
        { type: 'condition', check: 'pointerActive' },
        {
          type: 'selector',
          children: [
            { type: 'action', action: 'moveToPointer' },
            { type: 'action', action: 'idle' },
          ],
        },
        { type: 'action', action: 'setEmotion' },
        { type: 'action', action: 'drainEnergy' },
      ],
    }

    const root = hydrate(tree)
    const bb = createBlackboard()
    bb.pointerActive = true
    bb.emotion = 'happy'
    bb.energy = 0.5

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      tick(root, bb)
    }
    const elapsed = performance.now() - start
    const avg = elapsed / 100

    expect(avg).toBeLessThan(16)
  })

  it('ticks 10 concurrent trees in <16 ms average', () => {
    const trees = Array.from({ length: 10 }, () => ({
      type: 'selector',
      children: [
        { type: 'condition', check: 'pointerActive' },
        { type: 'action', action: 'wander' },
      ],
    }))

    const roots = trees.map(hydrate)
    const bbs = roots.map(() => createBlackboard())

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < roots.length; j++) {
        tick(roots[j], bbs[j])
      }
    }
    const elapsed = performance.now() - start
    const avg = elapsed / 100

    expect(avg).toBeLessThan(16)
  })
})
