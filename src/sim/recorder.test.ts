/**
 * v2.0 — SimRecorder tests
 *
 * Tests for the recorder's export/import functionality,
 * including the .cybersim (cybertrace-compatible) format.
 */

import { describe, it, expect } from 'vitest'
import {
  SimEngine,
  SimRecorder,
  exportCyberSim,
  importCyberSim,
} from './index'
import type { SimCommand } from './types'

describe('SimRecorder', () => {
  it('starts recording and creates a run', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')
    expect(rec.isRecording).toBe(true)
    expect(rec.run).not.toBeNull()
    expect(rec.run?.characterId).toBe('test-char')
  })

  it('records steps and finalizes on stop', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')

    const body = {
      id: 'robot',
      pos: { x: 100, y: 100 },
      vel: { vx: 1, vy: 0 },
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

    const step = engine.step([])
    rec.recordStep(step)
    expect(rec.run?.stepCount).toBe(1)
    expect(rec.run?.steps.length).toBe(1)

    const run = rec.stop()
    expect(rec.isRecording).toBe(false)
    expect(run).not.toBeNull()
    expect(run?.stepCount).toBe(1)
    expect(run?.duration).toBeGreaterThanOrEqual(0)
  })

  it('pauses and resumes recording', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')

    const body = {
      id: 'robot',
      pos: { x: 0, y: 0 },
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

    rec.pause()
    const step = engine.step([])
    rec.recordStep(step)
    // Paused — step is not counted
    expect(rec.run?.stepCount).toBe(0)

    rec.resume()
    const step2 = engine.step([])
    rec.recordStep(step2)
    // After resume, step is counted
    expect(rec.run?.stepCount).toBe(1)

    rec.stop()
  })

  it('ignores recordStep when not recording', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    const body = {
      id: 'robot',
      pos: { x: 0, y: 0 },
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
    const step = engine.step([])
    rec.recordStep(step)
    expect(rec.run).toBeNull()
  })

  it('exportJSON returns valid JSON', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')
    const body = {
      id: 'robot',
      pos: { x: 0, y: 0 },
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
    rec.recordStep(engine.step([]))
    const json = rec.exportJSON()
    const parsed = JSON.parse(json)
    expect(parsed.characterId).toBe('test-char')
    expect(parsed.steps.length).toBe(1)
  })
})

describe('exportCyberSim', () => {
  it('produces a cybertrace-compatible file with header', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')
    const body = {
      id: 'robot',
      pos: { x: 0, y: 0 },
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
    rec.recordStep(engine.step([]))
    const run = rec.stop()!

    const content = exportCyberSim(run)
    const lines = content.split('\n').filter((l) => l.trim().length > 0)

    // Header
    const header = JSON.parse(lines[0]!)
    expect(header.$schema).toBe('cybersim/v1')
    expect(header.$version).toBe(1)
    expect(header.meta.character).toBe('test-char')

    // Events
    expect(lines.length).toBeGreaterThan(1)
  })

  it('includes adapter.tx events for commands', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')
    const body = {
      id: 'robot',
      pos: { x: 0, y: 0 },
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

    const commands: SimCommand[] = [
      { type: 'move', payload: { speed: 0.5, bodyId: 'robot' }, t: Date.now() },
      { type: 'rotate', payload: { angle: 90, bodyId: 'robot' }, t: Date.now() },
    ]
    rec.recordStep(engine.step(commands))
    const run = rec.stop()!

    const content = exportCyberSim(run)
    const lines = content.split('\n').filter((l) => l.trim().length > 0)

    // Find adapter.tx events
    const txEvents = lines.slice(1).map((l) => JSON.parse(l))
    const txTypes = txEvents.filter((e: { type: string }) => e.type === 'adapter.tx')
    expect(txTypes.length).toBe(2)
    expect(txTypes[0].payload.command).toBe('move')
    expect(txTypes[1].payload.command).toBe('rotate')
  })
})

describe('importCyberSim', () => {
  it('round-trips a SimRun through export/import', () => {
    const engine = new SimEngine()
    const rec = new SimRecorder(engine)
    rec.start('test-char')
    const body = {
      id: 'robot',
      pos: { x: 0, y: 0 },
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
    rec.recordStep(engine.step([]))
    const run = rec.stop()!

    const content = exportCyberSim(run)
    const imported = importCyberSim(content)

    expect(imported.characterId).toBe('test-char')
    expect(imported.steps.length).toBe(run.steps.length)
    expect(imported.stepCount).toBe(run.stepCount)
  })

  it('throws on unsupported schema', () => {
    const badContent = '{"$schema":"cybersim/v2","$version":2,"meta":{}}\n'
    expect(() => importCyberSim(badContent)).toThrow('Unsupported cybersim schema')
  })

  it('throws on empty content', () => {
    expect(() => importCyberSim('')).toThrow('Empty cybersim content')
  })
})
