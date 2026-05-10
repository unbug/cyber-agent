/**
 * Behavior Tree DSL helpers — shorthand constructors for node definitions.
 * Shared by all agent behavior definitions.
 */

import type { BehaviorNodeDef } from '../engine/types'
import type { EmotionDSL, ValBias } from '../affect/types'
import { getEmotion } from '../affect/emotions'

export const cond = (check: string, args?: Record<string, unknown>): BehaviorNodeDef =>
  ({ type: 'condition', check, args })

export const act = (action: string, args?: Record<string, unknown>): BehaviorNodeDef =>
  ({ type: 'action', action, args })

export const seq = (name: string, ...children: BehaviorNodeDef[]): BehaviorNodeDef =>
  ({ type: 'sequence', name, children })

export const sel = (name: string, ...children: BehaviorNodeDef[]): BehaviorNodeDef =>
  ({ type: 'selector', name, children })

export const wait = (ms: number): BehaviorNodeDef =>
  ({ type: 'wait', durationMs: ms })

export const cooldown = (ms: number, child: BehaviorNodeDef): BehaviorNodeDef =>
  ({ type: 'cooldown', durationMs: ms, child })

export const repeat = (count: number, child: BehaviorNodeDef): BehaviorNodeDef =>
  ({ type: 'repeater', count, child })

// ─── VAL-aware selector helpers ────────────────────────────────

/**
 * Create a VAL-biased selector. Children are reordered by how well
 * their bias conditions match the current VAL state.
 *
 * Usage:
 *   valSel('Emotion Root', { dimension: 'arousal', operator: '>', threshold: 0.5 },
 *     seq('High arousal actions...', ...),
 *     seq('Low arousal actions...', ...),
 *   )
 */
export const valSel = (
  name: string,
  bias: ValBias,
  ...children: BehaviorNodeDef[]
): BehaviorNodeDef => ({
  type: 'selector',
  name,
  bias,
  children,
})

/**
 * Create a selector with multiple bias conditions (all must match).
 * Children are reordered by match count (most matches first).
 *
 * Usage:
 *   valSelMulti('Emotion Root', [
 *     { dimension: 'valence', operator: '>', threshold: 0.3 },
 *     { dimension: 'arousal', operator: '>', threshold: 0.5 },
 *   ], ...children)
 */
export const valSelMulti = (
  name: string,
  biases: ValBias[],
  ...children: BehaviorNodeDef[]
): BehaviorNodeDef => ({
  type: 'selector',
  name,
  biases,
  children,
})

// ─── Emotion DSL helpers for character authors ─────────────────

/**
 * Declare an emotion preset for a character.
 * Returns a partial CharacterBehavior with emotion config.
 *
 * Usage:
 *   emotion('anxious') // → { emotionPreset: 'anxious' }
 *   emotion('anxious', { perceptionSensitivity: 0.2 })
 *   emotion(compose('anxious', 'curious'))
 *   emotion(blend('anxious', 'playful', 0.3))
 */
export function emotion(
  nameOrDef: string | Partial<EmotionDSL>,
  overrides?: Partial<EmotionDSL>,
): { emotionPreset?: string; emotion?: Partial<EmotionDSL> } {
  if (typeof nameOrDef === 'string') {
    if (overrides) {
      const preset = getEmotion(nameOrDef)
      if (preset) {
        return { emotion: { ...preset, ...overrides } }
      }
    }
    return { emotionPreset: nameOrDef }
  }
  return { emotion: nameOrDef }
}
