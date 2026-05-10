/**
 * CyberAgent Affect Engine — Composable emotion DSL
 *
 * Characters declare their base emotion which sets initial VAL
 * state, decay rate, and perception sensitivity. Emotions can be
 * composed to create nuanced affective profiles.
 *
 * Usage in character behavior definitions:
 *   emotion: 'anxious'
 *   emotion: compose('anxious', { perceptionSensitivity: 0.05 })
 *   emotion: compose('curious', 'energetic')
 */

import type { EmotionDSL } from './types'
import { emotionPresets, composeEmotions } from './types'

// Re-export for consumers
export { emotionPresets }

// ─── Emotion definitions ───────────────────────────────────────

const emotionDefs: Record<string, Partial<EmotionDSL>> = {
  anxious: emotionPresets.anxious!,
  playful: emotionPresets.playful!,
  stoic: emotionPresets.stoic!,
  curious: emotionPresets.curious!,
  guardian: emotionPresets.guardian!,
  shy: emotionPresets.shy!,
  energetic: emotionPresets.energetic!,
  calm: emotionPresets.calm!,
}

/**
 * Get an emotion preset by name.
 */
export function getEmotion(name: string): Partial<EmotionDSL> | undefined {
  return emotionDefs[name]
}

/**
 * Compose emotions. The last one wins for each field.
 *
 * Example:
 *   compose('anxious', 'playful')
 *   → anxious baseline + playful perception modifiers
 */
export function compose(...names: string[]): Partial<EmotionDSL> {
  const emotions = names.map(n => emotionDefs[n]).filter(Boolean) as Partial<EmotionDSL>[]
  const result = composeEmotions(...emotions)
  if (names.length > 1) {
    result.label = names.join('+')
  }
  return result
}

/**
 * Override an emotion's fields.
 *
 * Example:
 *   override('anxious', { perceptionSensitivity: 0.2 })
 *   → anxious with higher perception sensitivity
 */
export function override(name: string, overrides: Partial<EmotionDSL>): Partial<EmotionDSL> {
  const base = emotionDefs[name]
  if (!base) return overrides
  return { ...base, ...overrides }
}

/**
 * Blend two emotions by weight.
 *
 * Example:
 *   blend('anxious', 'playful', 0.3)
 *   → 30% anxious + 70% playful
 */
export function blend(
  emotion1: string,
  emotion2: string,
  weight1: number,
): Partial<EmotionDSL> {
  const e1 = emotionDefs[emotion1]
  const e2 = emotionDefs[emotion2]
  if (!e1 || !e2) return e1 ?? e2 ?? {}

  const w2 = 1 - weight1

  return {
    label: `${emotion1}+${emotion2}`,
    initial: blendValState(e1.initial || { valence: 0, arousal: 0.3, dominance: 0.5 }, e2.initial || { valence: 0, arousal: 0.3, dominance: 0.5 }, weight1, w2),
    decayRate: (e1.decayRate ?? 0.001) * weight1 + (e2.decayRate ?? 0.001) * w2,
    perceptionSensitivity:
      (e1.perceptionSensitivity ?? 0.1) * weight1 +
      (e2.perceptionSensitivity ?? 0.1) * w2,
    baseline: blendValState(e1.baseline || { valence: 0, arousal: 0.3, dominance: 0.5 }, e2.baseline || { valence: 0, arousal: 0.3, dominance: 0.5 }, weight1, w2),
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function blendValState(
  a: { valence: number; arousal: number; dominance: number },
  b: { valence: number; arousal: number; dominance: number },
  w1: number,
  w2: number,
): { valence: number; arousal: number; dominance: number } {
  return {
    valence: a.valence * w1 + b.valence * w2,
    arousal: a.arousal * w1 + b.arousal * w2,
    dominance: a.dominance * w1 + b.dominance * w2,
  }
}
