import { describe, it, expect, beforeEach } from 'vitest'
import {
  sanitizeTuning,
  sanitizeTuningMap,
  setTuningFor,
  getTuningFor,
  getTuningsForCharacter,
  applyImportedTunings,
  clearTunings,
  resolveEmbodimentConfig,
} from './drive-tuning'

beforeEach(() => localStorage.clear())

describe('sanitizeTuning', () => {
  it('clamps hostile values into safe ranges', () => {
    const t = sanitizeTuning({ maxSpeed: 99, maxSteer: -5, speedRefPx: 2, yawRefDeg: 500 })
    expect(t).toEqual({ maxSpeed: 1, maxSteer: 0.05, speedRefPx: 5, yawRefDeg: 180 })
  })
  it('drops garbage input', () => {
    expect(sanitizeTuning(null)).toEqual({})
    expect(sanitizeTuning('nope')).toEqual({})
    expect(sanitizeTuning({ maxSpeed: 'fast', extra: 1 })).toEqual({})
  })
  it('map sanitizer rejects non-objects and long keys', () => {
    const m = sanitizeTuningMap({ cyberbrick: { maxSpeed: 0.3 }, bad: 'x', ['y'.repeat(200)]: { maxSteer: 2 } })
    expect(m.cyberbrick).toEqual({ maxSpeed: 0.3 })
    expect(m.bad).toBeUndefined()
    expect(Object.keys(m)).toHaveLength(1)
  })
})

describe('store', () => {
  it('round-trips per (character, platform)', () => {
    setTuningFor('puppy', 'cyberbrick', { maxSpeed: 0.4, maxSteer: 0.5 })
    setTuningFor('puppy', 'robomaster', { maxSpeed: 0.7 })
    expect(getTuningFor('puppy', 'cyberbrick')).toEqual({ maxSpeed: 0.4, maxSteer: 0.5 })
    expect(getTuningFor('puppy', 'robomaster')).toEqual({ maxSpeed: 0.7 })
    expect(getTuningFor('puppy', 'demo')).toBeNull()
    expect(Object.keys(getTuningsForCharacter('puppy'))).toEqual(['cyberbrick', 'robomaster'])
  })

  it('imports merge per platform and count platforms', () => {
    setTuningFor('puppy', 'cyberbrick', { maxSpeed: 0.4 })
    const n = applyImportedTunings('puppy', {
      cyberbrick: { maxSteer: 0.8 },
      robomaster: { maxSpeed: 0.55 },
    })
    expect(n).toBe(2)
    expect(getTuningFor('puppy', 'cyberbrick')).toEqual({ maxSpeed: 0.4, maxSteer: 0.8 })
    expect(getTuningFor('puppy', 'robomaster')).toEqual({ maxSpeed: 0.55 })
  })

  it('ignores empty/hostile imports', () => {
    expect(applyImportedTunings('puppy', 'not-an-object')).toBe(0)
    expect(applyImportedTunings('', { ws: { maxSpeed: 0.5 } })).toBe(0)
    expect(applyImportedTunings('puppy', { ws: { nonsense: 1 } })).toBe(0)
  })

  it('clears per platform or whole character', () => {
    setTuningFor('dino', 'ws', { maxSpeed: 0.5 })
    setTuningFor('dino', 'cyberbrick', { maxSpeed: 0.5 })
    clearTunings('dino', 'ws')
    expect(getTuningFor('dino', 'ws')).toBeNull()
    expect(getTuningFor('dino', 'cyberbrick')).not.toBeNull()
    clearTunings('dino')
    expect(getTuningsForCharacter('dino')).toEqual({})
  })
})

describe('resolveEmbodimentConfig', () => {
  it('preset cap always wins over tuning maxSpeed', () => {
    const cfg = resolveEmbodimentConfig(0.25, { maxSpeed: 0.9, maxSteer: 0.7 })
    expect(cfg.maxSpeed).toBe(0.25)
    expect(cfg.maxSteer).toBe(0.7)
  })
  it('tuning applies when below the cap; no tuning = preset only', () => {
    expect(resolveEmbodimentConfig(0.9, { maxSpeed: 0.6 })).toEqual({ maxSpeed: 0.6 })
    expect(resolveEmbodimentConfig(0.5, null)).toEqual({ maxSpeed: 0.5 })
  })
})
