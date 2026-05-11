/**
 * v2.0 — Domain randomization tests
 *
 * Tests that mass, friction, latency, and sensor noise
 * randomization parameters are correctly applied in the SimEngine.
 */

import { describe, it, expect } from 'vitest'
import { SimEngine } from './engine'
import { DEFAULT_RANDOMIZATION } from './types'

describe('DomainRandomization', () => {
  it('starts with default randomization (all zeroed)', () => {
    const engine = new SimEngine()
    const r = engine.randomization
    expect(r.mass.current).toBe(1.0)
    expect(r.friction.current).toBe(0.0)
    expect(r.latency.current).toBe(0)
    expect(r.sensorNoise.current).toBe(0)
  })

  it('applies mass randomization multiplier', () => {
    const engine = new SimEngine()
    engine.setRandomization({ mass: { ...DEFAULT_RANDOMIZATION.mass, current: 2.0 } })
    engine.addBody({
      id: 'test',
      pos: { x: 100, y: 100 },
      vel: { vx: 0, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    })

    // Run a few steps to trigger mass randomization
    for (let i = 0; i < 10; i++) {
      engine.step([])
    }

    const body = engine.getBody('test')
    expect(body).toBeDefined()
    if (body) {
      // Mass should have been multiplied
      expect(body.mass).toBeGreaterThan(1)
      expect(body.mass).toBeCloseTo(2, 0)
    }
  })

  it('applies sensor noise to positions', () => {
    const engine = new SimEngine()
    engine.setRandomization({
      sensorNoise: { ...DEFAULT_RANDOMIZATION.sensorNoise, current: 5 },
    })
    engine.addBody({
      id: 'test',
      pos: { x: 100, y: 100 },
      vel: { vx: 0, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    })

    const initialX = 100
    engine.step([])
    const body = engine.getBody('test')
    if (body) {
      // Position should be perturbed by sensor noise
      const perturbation = Math.abs(body.pos.x - initialX)
      expect(perturbation).toBeGreaterThan(0)
      expect(perturbation).toBeLessThanOrEqual(10) // max noise * 2
    }
  })

  it('no noise when sensorNoise.current is 0', () => {
    const engine = new SimEngine()
    engine.setRandomization({
      sensorNoise: { ...DEFAULT_RANDOMIZATION.sensorNoise, current: 0 },
    })
    engine.addBody({
      id: 'test',
      pos: { x: 100, y: 100 },
      vel: { vx: 0, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    })

    engine.step([])
    const body = engine.getBody('test')
    expect(body?.pos.x).toBe(100)
    expect(body?.pos.y).toBe(100)
  })

  it('resetRandomization restores defaults', () => {
    const engine = new SimEngine()
    engine.setRandomization({
      mass: { min: 0.5, max: 2.0, current: 1.5 },
      sensorNoise: { min: 0, max: 10, current: 5 },
    })
    engine.resetRandomization()

    expect(engine.randomization.mass.current).toBe(1.0)
    expect(engine.randomization.sensorNoise.current).toBe(0)
  })

  it('friction randomization modifies damping', () => {
    const engine = new SimEngine()
    engine.setRandomization({
      friction: { min: -0.05, max: 0.05, current: 0.03 },
    })
    engine.addBody({
      id: 'test',
      pos: { x: 100, y: 100 },
      vel: { vx: 10, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    })

    const initialVel = 10
    engine.step([])
    const body = engine.getBody('test')
    if (body) {
      // With positive friction, velocity should decay more
      expect(body.vel.vx).toBeLessThan(initialVel * 0.95)
    }
  })

  it('setRandomization merges partial updates', () => {
    const engine = new SimEngine()
    engine.setRandomization({ mass: { min: 0.5, max: 2.0, current: 1.5 } })
    expect(engine.randomization.mass.current).toBe(1.5)
    expect(engine.randomization.sensorNoise.current).toBe(0) // unchanged

    engine.setRandomization({ sensorNoise: { min: 0, max: 10, current: 3 } })
    expect(engine.randomization.mass.current).toBe(1.5) // preserved
    expect(engine.randomization.sensorNoise.current).toBe(3)
  })
})
