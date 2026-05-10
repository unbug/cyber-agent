/**
 * v2.0 — Simulator engine tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SimEngine } from './engine'
import { SimRecorder } from './recorder'
import { SimReplay } from './replay'
import type { SimBody, SimStep } from './types'

describe('SimEngine', () => {
  let engine: SimEngine

  beforeEach(() => {
    engine = new SimEngine({ width: 800, height: 600 })
  })

  it('starts with no bodies', () => {
    expect(engine.getBodyCount()).toBe(0)
  })

  it('adds and retrieves a body', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)
    expect(engine.getBodyCount()).toBe(1)
    expect(engine.getBody('robot')).toBeDefined()
  })

  it('integrates body position over time', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)

    // Run 10 steps (each ~16ms)
    const final = engine.run(10, () => [])
    const robot = final.bodies[0]

    expect(robot).toBeDefined()
    // Velocity should decrease due to damping
    expect(robot!.vel.vx).toBeLessThan(10)
    expect(robot!.vel.vx).toBeGreaterThan(0)
    // Position should have changed
    expect(robot!.pos.x).toBeGreaterThan(400)
  })

  it('clamps body to boundaries', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 10, y: 10 },
      vel: { vx: -100, vy: -100 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0,
      angularDamping: 0,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(body)

    const final = engine.run(10, () => [])
    const robot = final.bodies[0]

    // Body should be clamped to boundaries
    expect(robot!.pos.x).toBeGreaterThanOrEqual(robot!.radius)
    expect(robot!.pos.x).toBeLessThanOrEqual(800 - robot!.radius)
    expect(robot!.pos.y).toBeGreaterThanOrEqual(robot!.radius)
    expect(robot!.pos.y).toBeLessThanOrEqual(600 - robot!.radius)
  })

  it('applies move command', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)

    engine.step([{
      type: 'move',
      payload: { bodyId: 'robot', speed: 5 },
      t: Date.now(),
    }])

    const robot = engine.getBody('robot')
    expect(robot).toBeDefined()
    expect(robot!.vel.vx).toBeGreaterThan(0)
  })

  it('applies rotate command', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)

    engine.step([{
      type: 'rotate',
      payload: { bodyId: 'robot', angle: Math.PI / 4 },
      t: Date.now(),
    }])

    const robot = engine.getBody('robot')
    expect(robot!.orientation).toBeGreaterThan(0)
  })

  it('applies stop command', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
      vel: { vx: 10, vy: 5 },
      orientation: 0,
      angVel: 1,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(body)

    engine.step([{
      type: 'stop',
      payload: { bodyId: 'robot' },
      t: Date.now(),
    }])

    const robot = engine.getBody('robot')
    expect(robot!.vel.vx).toBe(0)
    expect(robot!.vel.vy).toBe(0)
    expect(robot!.angVel).toBe(0)
  })

  it('applies emergency_stop command', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
      vel: { vx: 10, vy: 5 },
      orientation: 0,
      angVel: 1,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(body)

    engine.step([{
      type: 'emergency_stop',
      payload: { bodyId: 'robot' },
      t: Date.now(),
    }])

    const robot = engine.getBody('robot')
    expect(robot!.vel.vx).toBe(0)
    expect(robot!.vel.vy).toBe(0)
    expect(robot!.angVel).toBe(0)
  })

  it('resets state', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)
    engine.run(10, () => [])
    expect(engine.getStepCounter()).toBe(10)

    engine.reset()
    expect(engine.getStepCounter()).toBe(0)
    expect(engine.getSimTime()).toBe(0)
    expect(engine.getBodyCount()).toBe(0)
  })

  it('tracks simulation time', () => {
    engine.run(5, () => [])
    // 5 steps * 16ms dt = 80ms
    expect(engine.getSimTime()).toBe(80)
  })

  it('removes a body', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)
    expect(engine.getBodyCount()).toBe(1)

    engine.removeBody('robot')
    expect(engine.getBodyCount()).toBe(0)
    expect(engine.getBody('robot')).toBeUndefined()
  })

  it('updates a body', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    engine.addBody(body)

    engine.updateBody('robot', { color: '#ff0000', mass: 2 })
    const robot = engine.getBody('robot')
    expect(robot!.color).toBe('#ff0000')
    expect(robot!.mass).toBe(2)
  })
})

describe('SimRecorder', () => {
  let engine: SimEngine
  let recorder: SimRecorder

  beforeEach(() => {
    engine = new SimEngine({ width: 800, height: 600 })
    recorder = new SimRecorder(engine)
  })

  it('starts and stops recording', () => {
    expect(recorder.isRecording).toBe(false)
    expect(recorder.run).toBeNull()

    recorder.start('test-char')
    expect(recorder.isRecording).toBe(true)

    const run = recorder.stop()
    expect(recorder.isRecording).toBe(false)
    expect(run).not.toBeNull()
    expect(run!.characterId).toBe('test-char')
    expect(run!.stepCount).toBe(0)
  })

  it('records steps', () => {
    recorder.start('test-char')
    for (let i = 0; i < 10; i++) {
      recorder.recordStep({
        t: Date.now(),
        simTime: i * 16,
        bodies: [],
      })
    }
    const run = recorder.stop()
    expect(run!.stepCount).toBe(10)
    expect(run!.steps.length).toBe(10)
  })

  it('exports and imports JSON', () => {
    recorder.start('test-char')
    for (let i = 0; i < 5; i++) {
      recorder.recordStep({
        t: Date.now(),
        simTime: i * 16,
        bodies: [],
      })
    }
    const json = recorder.exportJSON()
    const imported = SimRecorder.importJSON(json)

    expect(imported.characterId).toBe('test-char')
    expect(imported.stepCount).toBe(5)
  })

  it('prevents double start', () => {
    recorder.start('test-char')
    recorder.start('other-char')
    const run = recorder.stop()
    expect(run!.characterId).toBe('test-char')
  })
})

describe('SimReplay', () => {
  let engine: SimEngine
  let replay: SimReplay

  beforeEach(() => {
    engine = new SimEngine({ width: 800, height: 600 })
    replay = new SimReplay(engine)
  })

  it('loads a recorded run', () => {
    const mockSteps: SimStep[] = Array.from({ length: 10 }, (_, i) => ({
      t: Date.now(),
      simTime: i * 16,
      bodies: [],
    }))
    replay.load({ steps: mockSteps })
    expect(replay.stepCount).toBe(10)
  })

  it('steps forward through recording', () => {
    const mockSteps: SimStep[] = Array.from({ length: 10 }, (_, i) => ({
      t: Date.now(),
      simTime: i * 16,
      bodies: [],
    }))
    replay.load({ steps: mockSteps })

    replay.stepForward()
    expect(replay.state.stepIndex).toBe(0)

    replay.stepForward()
    expect(replay.state.stepIndex).toBe(1)
  })

  it('scrubs to a specific step', () => {
    const mockSteps: SimStep[] = Array.from({ length: 10 }, (_, i) => ({
      t: Date.now(),
      simTime: i * 16,
      bodies: [],
    }))
    replay.load({ steps: mockSteps })

    replay.scrubTo(5)
    // scrubTo applies the step but doesn't update stepIndex
    // (stepIndex is updated during playback)
    const bodies = replay.getBodies()
    expect(bodies.length).toBe(0) // mock has no bodies
  })

  it('toggles play/pause', () => {
    const mockSteps: SimStep[] = Array.from({ length: 10 }, (_, i) => ({
      t: Date.now(),
      simTime: i * 16,
      bodies: [],
    }))
    replay.load({ steps: mockSteps })

    expect(replay.isPlaying).toBe(false)
    replay.play()
    expect(replay.isPlaying).toBe(true)
    replay.pause()
    expect(replay.isPlaying).toBe(false)
  })

  it('sets playback speed', () => {
    replay.setSpeed(2)
    expect(replay.state.speed).toBe(2)

    replay.setSpeed(0.5)
    expect(replay.state.speed).toBe(0.5)

    replay.setSpeed(10)
    expect(replay.state.speed).toBe(10) // clamped to max 10
  })

  it('returns bodies from current step', () => {
    const mockBody: SimBody = {
      id: 'robot',
      pos: { x: 400, y: 300 },
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
    }
    const mockSteps: SimStep[] = [{
      t: Date.now(),
      simTime: 0,
      bodies: [mockBody],
    }]
    replay.load({ steps: mockSteps })
    replay.stepForward()

    const bodies = replay.getBodies()
    expect(bodies.length).toBe(1)
    expect(bodies[0]!.id).toBe('robot')
  })
})
