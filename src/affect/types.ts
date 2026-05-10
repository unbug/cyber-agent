/**
 * CyberAgent Affect Engine — VAL (Valence / Arousal / Dominance)
 *
 * VAL is a psychological model for affective state:
 *   - Valence:   how pleasant/unpleasant the experience is (-1 to +1)
 *   - Arousal:   how activated/deactivated the state is (0 to 1)
 *   - Dominance:   how in-control vs overwhelmed the agent feels (0 to 1)
 *
 * Each tick, VAL decays toward a baseline. Perception events and BT
 * conditions can shift VAL. Selector nodes can declare bias conditions
 * that reorder children by current affect.
 *
 * Architecture:
 *   src/affect/types.ts     — VAL state, bias conditions, emotion DSL
 *   src/affect/engine.ts    — per-agent VAL engine with decay
 *   src/affect/emotions.ts  — composable emotion DSL (anxious, playful, stoic...)
 */

// ─── VAL State ─────────────────────────────────────────────────

export interface ValState {
  /** How pleasant/unpleasant: -1 (negative) → +1 (positive) */
  valence: number
  /** How activated/deactivated: 0 (calm) → 1 (hyper) */
  arousal: number
  /** How in-control vs overwhelmed: 0 (overwhelmed) → 1 (in control) */
  dominance: number
}

export function createValState(
  valence = 0,
  arousal = 0.3,
  dominance = 0.5,
): ValState {
  return {
    valence: clamp(valence, -1, 1),
    arousal: clamp(arousal, 0, 1),
    dominance: clamp(dominance, 0, 1),
  }
}

export function cloneValState(vs: ValState): ValState {
  return { ...vs }
}

export function valenceToString(v: number): string {
  if (v > 0.5) return 'positive'
  if (v < -0.5) return 'negative'
  return 'neutral'
}

export function arousalToString(a: number): string {
  if (a > 0.7) return 'high'
  if (a > 0.4) return 'medium'
  return 'low'
}

export function dominanceToString(d: number): string {
  if (d > 0.7) return 'dominant'
  if (d > 0.4) return 'neutral'
  return 'submissive'
}

export function valToString(vs: ValState): string {
  return `${valenceToString(vs.valence)}/${arousalToString(vs.arousal)}/${dominanceToString(vs.dominance)}`
}

// ─── Bias Conditions ───────────────────────────────────────────

/**
 * A bias condition that a BT node (typically a Selector child)
 * can declare. The selector will reorder children by how well
 * each child's bias matches the current VAL state.
 */
export interface ValBias {
  /** Which VAL dimension to check */
  dimension: 'valence' | 'arousal' | 'dominance'
  /** Comparison operator */
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  /** Threshold value */
  threshold: number
}

export function evaluateBias(bias: ValBias, val: ValState): boolean {
  const valence = bias.dimension === 'valence' ? val.valence
    : bias.dimension === 'arousal' ? val.arousal
    : val.dominance

  switch (bias.operator) {
    case '>': return valence > bias.threshold
    case '<': return valence < bias.threshold
    case '>=': return valence >= bias.threshold
    case '<=': return valence <= bias.threshold
    case '==': return Math.abs(valence - bias.threshold) < 0.01
    case '!=': return Math.abs(valence - bias.threshold) >= 0.01
    default: return false
  }
}

/**
 * Score how well a bias matches current VAL. Higher = better match.
 * Used by the selector to reorder children.
 */
export function biasMatchScore(bias: ValBias | undefined, val: ValState): number {
  if (!bias) return 0 // no bias = neutral ordering
  if (!evaluateBias(bias, val)) return -1 // no match
  return 1 // match
}

// ─── Emotion DSL ───────────────────────────────────────────────

/**
 * A composable emotion definition. Characters declare their
 * base emotion which sets initial VAL + decay rates.
 */
export interface EmotionDSL {
  /** Emotion label (e.g. 'anxious', 'playful', 'stoic') */
  label: string
  /** Initial VAL state */
  initial: ValState
  /** How quickly VAL decays toward baseline (0 = no decay, 1 = instant) */
  decayRate: number
  /** Perception sensitivity: how much perception events shift VAL */
  perceptionSensitivity: number
  /** Baseline VAL (target of decay) */
  baseline: ValState
  /** Optional: modifier for specific perception categories */
  perceptionModifiers?: Record<string, { valenceShift: number; arousalShift: number }>
}

/**
 * Compose multiple emotion modifiers. The last one wins for each field.
 */
export function composeEmotions(...emotions: Partial<EmotionDSL>[]): Partial<EmotionDSL> {
  const result: Partial<EmotionDSL> = {}
  for (const e of emotions) {
    if (e.label) result.label = e.label
    if (e.initial) result.initial = { ...e.initial }
    if (e.decayRate !== undefined) result.decayRate = e.decayRate
    if (e.perceptionSensitivity !== undefined) result.perceptionSensitivity = e.perceptionSensitivity
    if (e.baseline) result.baseline = { ...e.baseline }
    if (e.perceptionModifiers) {
      result.perceptionModifiers = { ...e.perceptionModifiers }
    }
  }
  return result
}

// ─── VAL Event (for tracer / debug) ────────────────────────────

export interface ValEvent {
  t: number
  type: 'val.update' | 'val.bias.match' | 'val.bias.mismatch'
  label: string
  valence: number
  arousal: number
  dominance: number
  payload?: Record<string, unknown>
}

// ─── Helpers ───────────────────────────────────────────────────

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─── Emotion Presets ───────────────────────────────────────────

/**
 * Default emotion presets that characters can use as their
 * starting affective profile.
 */
export const emotionPresets: Record<string, EmotionDSL> = {
  anxious: {
    label: 'anxious',
    initial: { valence: -0.3, arousal: 0.7, dominance: 0.2 },
    decayRate: 0.0008,
    perceptionSensitivity: 0.15,
    baseline: { valence: 0, arousal: 0.4, dominance: 0.5 },
    perceptionModifiers: {
      'see.face': { valenceShift: -0.1, arousalShift: 0.1 },
      'see.object': { valenceShift: -0.05, arousalShift: 0.05 },
    },
  },
  playful: {
    label: 'playful',
    initial: { valence: 0.6, arousal: 0.6, dominance: 0.6 },
    decayRate: 0.001,
    perceptionSensitivity: 0.12,
    baseline: { valence: 0.3, arousal: 0.4, dominance: 0.5 },
    perceptionModifiers: {
      'see.object': { valenceShift: 0.1, arousalShift: 0.1 },
      'hear.word': { valenceShift: 0.05, arousalShift: 0.15 },
    },
  },
  stoic: {
    label: 'stoic',
    initial: { valence: 0, arousal: 0.2, dominance: 0.8 },
    decayRate: 0.0003,
    perceptionSensitivity: 0.05,
    baseline: { valence: 0, arousal: 0.2, dominance: 0.7 },
  },
  curious: {
    label: 'curious',
    initial: { valence: 0.3, arousal: 0.5, dominance: 0.4 },
    decayRate: 0.0008,
    perceptionSensitivity: 0.2,
    baseline: { valence: 0.1, arousal: 0.3, dominance: 0.5 },
    perceptionModifiers: {
      'see.object': { valenceShift: 0.1, arousalShift: 0.15 },
      'near': { valenceShift: 0.05, arousalShift: 0.1 },
    },
  },
  guardian: {
    label: 'guardian',
    initial: { valence: 0.1, arousal: 0.5, dominance: 0.9 },
    decayRate: 0.0005,
    perceptionSensitivity: 0.18,
    baseline: { valence: 0, arousal: 0.3, dominance: 0.8 },
    perceptionModifiers: {
      'see.face': { valenceShift: -0.05, arousalShift: 0.2 },
      'see.object': { valenceShift: 0, arousalShift: 0.15 },
      'near': { valenceShift: -0.1, arousalShift: 0.1 },
    },
  },
  shy: {
    label: 'shy',
    initial: { valence: -0.2, arousal: 0.4, dominance: 0.2 },
    decayRate: 0.0006,
    perceptionSensitivity: 0.25,
    baseline: { valence: 0, arousal: 0.3, dominance: 0.4 },
    perceptionModifiers: {
      'see.face': { valenceShift: -0.15, arousalShift: 0.2 },
      'hear.word': { valenceShift: 0.05, arousalShift: 0.1 },
    },
  },
  energetic: {
    label: 'energetic',
    initial: { valence: 0.5, arousal: 0.8, dominance: 0.5 },
    decayRate: 0.0012,
    perceptionSensitivity: 0.1,
    baseline: { valence: 0.2, arousal: 0.5, dominance: 0.5 },
  },
  calm: {
    label: 'calm',
    initial: { valence: 0.4, arousal: 0.2, dominance: 0.6 },
    decayRate: 0.0004,
    perceptionSensitivity: 0.08,
    baseline: { valence: 0.2, arousal: 0.2, dominance: 0.5 },
  },
}
