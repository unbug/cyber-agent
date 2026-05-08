import { describe, it, expect } from 'vitest'
import {
  createValState, cloneValState, evaluateBias, biasMatchScore,
  valenceToString, arousalToString, dominanceToString, valToString,
  composeEmotions,
} from './types'
import { ValEngine } from './engine'
import { emotionPresets, getEmotion, compose, override, blend } from './emotions'

describe('createValState', () => {
  it('creates state with defaults', () => {
    const vs = createValState()
    expect(vs.valence).toBe(0)
    expect(vs.arousal).toBe(0.3)
    expect(vs.dominance).toBe(0.5)
  })
  it('clamps valence to [-1, 1]', () => {
    expect(createValState(-2).valence).toBe(-1)
    expect(createValState(2).valence).toBe(1)
  })
  it('clamps arousal to [0, 1]', () => {
    expect(createValState(0, -0.5).arousal).toBe(0)
    expect(createValState(0, 1.5).arousal).toBe(1)
  })
  it('clamps dominance to [0, 1]', () => {
    expect(createValState(0, 0, -0.1).dominance).toBe(0)
    expect(createValState(0, 0, 1.1).dominance).toBe(1)
  })
})

describe('cloneValState', () => {
  it('returns a shallow copy', () => {
    const original = { valence: 0.5, arousal: 0.6, dominance: 0.7 }
    const cloned = cloneValState(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
  })
})

describe('valenceToString', () => {
  it('returns positive for >0.5', () => { expect(valenceToString(0.6)).toBe('positive') })
  it('returns negative for <-0.5', () => { expect(valenceToString(-0.6)).toBe('negative') })
  it('returns neutral for [-0.5, 0.5]', () => {
    expect(valenceToString(0)).toBe('neutral')
    expect(valenceToString(0.5)).toBe('neutral')
    expect(valenceToString(-0.5)).toBe('neutral')
  })
})

describe('arousalToString', () => {
  it('returns high for >0.7', () => { expect(arousalToString(0.8)).toBe('high') })
  it('returns medium for >0.4', () => { expect(arousalToString(0.5)).toBe('medium') })
  it('returns low for <=0.4', () => { expect(arousalToString(0.2)).toBe('low') })
})

describe('dominanceToString', () => {
  it('returns dominant for >0.7', () => { expect(dominanceToString(0.8)).toBe('dominant') })
  it('returns neutral for >0.4', () => { expect(dominanceToString(0.5)).toBe('neutral') })
  it('returns submissive for <=0.4', () => { expect(dominanceToString(0.2)).toBe('submissive') })
})

describe('valToString', () => {
  it('formats V/A/D correctly', () => {
    expect(valToString(createValState(0.6, 0.8, 0.9))).toBe('positive/high/dominant')
  })
})

describe('evaluateBias', () => {
  const val = createValState(0.5, 0.6, 0.8)
  it('evaluates valence > 0.3', () => {
    expect(evaluateBias({ dimension: 'valence', operator: '>', threshold: 0.3 }, val)).toBe(true)
    expect(evaluateBias({ dimension: 'valence', operator: '>', threshold: 0.7 }, val)).toBe(false)
  })
  it('evaluates arousal >= 0.5', () => {
    expect(evaluateBias({ dimension: 'arousal', operator: '>=', threshold: 0.5 }, val)).toBe(true)
    expect(evaluateBias({ dimension: 'arousal', operator: '>=', threshold: 0.7 }, val)).toBe(false)
  })
  it('evaluates dominance != 0.5', () => {
    expect(evaluateBias({ dimension: 'dominance', operator: '!=', threshold: 0.5 }, val)).toBe(true)
    expect(evaluateBias({ dimension: 'dominance', operator: '==', threshold: 0.8 }, val)).toBe(false)
  })
  it('handles == with tolerance', () => {
    expect(evaluateBias({ dimension: 'valence', operator: '==', threshold: 0.5 }, val)).toBe(true)
    expect(evaluateBias({ dimension: 'valence', operator: '==', threshold: 0.49 }, val)).toBe(false)
  })
})

describe('biasMatchScore', () => {
  const val = createValState(0.5, 0.6, 0.8)
  it('returns 0 for undefined bias', () => { expect(biasMatchScore(undefined, val)).toBe(0) })
  it('returns 1 when bias matches', () => {
    expect(biasMatchScore({ dimension: 'valence', operator: '>', threshold: 0.3 }, val)).toBe(1)
  })
  it('returns -1 when bias does not match', () => {
    expect(biasMatchScore({ dimension: 'valence', operator: '>', threshold: 0.7 }, val)).toBe(-1)
  })
})

describe('ValEngine', () => {
  it('initializes with default state', () => {
    const engine = new ValEngine({ characterId: 'test' })
    expect(engine.valence).toBe(0)
    expect(engine.arousal).toBeCloseTo(0.3, 1)
    expect(engine.dominance).toBeCloseTo(0.5, 1)
  })
  it('initializes with emotion preset', () => {
    const engine = new ValEngine({ characterId: 'test', emotionPreset: 'playful' })
    expect(engine.valence).toBeCloseTo(0.6, 0)
    expect(engine.arousal).toBeCloseTo(0.6, 0)
    expect(engine.dominance).toBeCloseTo(0.6, 0)
  })
  it('decays toward baseline over ticks', () => {
    const engine = new ValEngine({ characterId: 'test', emotionPreset: 'anxious' })
    for (let i = 0; i < 500; i++) engine.tick(100)
    expect(engine.valence).toBeCloseTo(0, 1)
  })
  it('shifts VAL on perception', () => {
    const engine = new ValEngine({ characterId: 'test', emotionPreset: 'playful' })
    const before = engine.state
    engine.onPerception('see.object', 1.0)
    const after = engine.state
    expect(after.valence).toBeGreaterThan(before.valence)
    expect(after.arousal).toBeGreaterThan(before.arousal)
  })
  it('small shift for unknown perception', () => {
    const engine = new ValEngine({ characterId: 'test', emotionPreset: 'playful' })
    const before = engine.state
    engine.onPerception('unknown.category', 1.0)
    const after = engine.state
    expect(after.valence).toBeGreaterThanOrEqual(before.valence - 0.001)
  })
  it('shifts VAL manually', () => {
    const engine = new ValEngine({ characterId: 'test' })
    engine.shift(0.2, -0.1, 0.1)
    expect(engine.valence).toBeCloseTo(0.2, 1)
    expect(engine.arousal).toBeLessThan(0.3)
    expect(engine.dominance).toBeGreaterThan(0.5)
  })
  it('clamps shifted values', () => {
    const engine = new ValEngine({ characterId: 'test' })
    engine.shift(0.5, 0.5, 0.5)
    expect(engine.valence).toBeLessThanOrEqual(1)
    expect(engine.arousal).toBeLessThanOrEqual(1)
    expect(engine.dominance).toBeLessThanOrEqual(1)
  })
  it('resets to initial state', () => {
    const engine = new ValEngine({ characterId: 'test', emotionPreset: 'anxious' })
    engine.shift(0.5, 0.5, 0.5)
    engine.reset()
    expect(engine.valence).toBeCloseTo(0, 1)
    expect(engine.arousal).toBeCloseTo(0.3, 1)
    expect(engine.dominance).toBeCloseTo(0.5, 1)
  })
  it('produces history entries', () => {
    const engine = new ValEngine({ characterId: 'test' })
    for (let i = 0; i < 10; i++) engine.tick(100)
    expect(engine.history.length).toBe(10)
  })
  it('caps history at MAX_HISTORY', () => {
    const engine = new ValEngine({ characterId: 'test' })
    for (let i = 0; i < 500; i++) engine.tick(100)
    expect(engine.history.length).toBeLessThanOrEqual(300)
  })
  it('toValEvents returns events', () => {
    const engine = new ValEngine({ characterId: 'test' })
    engine.tick(100)
    const events = engine.toValEvents()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('val.update')
    expect(events[0].label).toContain('test')
  })
})

describe('emotionPresets', () => {
  it('has all expected presets', () => {
    expect(emotionPresets.anxious).toBeDefined()
    expect(emotionPresets.playful).toBeDefined()
    expect(emotionPresets.stoic).toBeDefined()
    expect(emotionPresets.curious).toBeDefined()
    expect(emotionPresets.guardian).toBeDefined()
    expect(emotionPresets.shy).toBeDefined()
    expect(emotionPresets.energetic).toBeDefined()
    expect(emotionPresets.calm).toBeDefined()
  })
  it('anxious has high arousal, negative valence', () => {
    const p = emotionPresets.anxious
    expect(p.initial.arousal).toBeGreaterThan(0.5)
    expect(p.initial.valence).toBeLessThan(0)
  })
  it('playful has positive valence', () => {
    expect(emotionPresets.playful.initial.valence).toBeGreaterThan(0)
  })
  it('stoic has low arousal, high dominance', () => {
    const p = emotionPresets.stoic
    expect(p.initial.arousal).toBeLessThan(0.3)
    expect(p.initial.dominance).toBeGreaterThan(0.7)
  })
})

describe('getEmotion', () => {
  it('returns preset by name', () => {
    expect(getEmotion('anxious')).toBeDefined()
    expect(getEmotion('nonexistent')).toBeUndefined()
  })
})

describe('compose', () => {
  it('composes two emotions', () => {
    const result = compose('anxious', 'playful')
    expect(result.label).toBe('anxious+playful')
    expect(result.initial).toBeDefined()
  })
})

describe('override', () => {
  it('overrides an emotion field', () => {
    expect(override('anxious', { perceptionSensitivity: 0.2 }).perceptionSensitivity).toBe(0.2)
  })
})

describe('blend', () => {
  it('blends two emotions by weight', () => {
    const result = blend('anxious', 'playful', 0.3)
    expect(result.label).toBe('anxious+playful')
    const aV = emotionPresets.anxious.initial.valence
    const pV = emotionPresets.playful.initial.valence
    expect(result.initial.valence).toBeCloseTo(aV * 0.3 + pV * 0.7, 2)
  })
})

describe('composeEmotions', () => {
  it('merges partial emotions, last wins', () => {
    const result = composeEmotions(
      { label: 'test1', initial: { valence: 0.1, arousal: 0.2, dominance: 0.3 } },
      { label: 'test2', decayRate: 0.005 },
    )
    expect(result.label).toBe('test2')
    expect(result.initial.valence).toBe(0.1)
    expect(result.decayRate).toBe(0.005)
  })
})
