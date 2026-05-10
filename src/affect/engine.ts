/**
 * CyberAgent Affect Engine — Per-agent VAL state machine
 *
 * Each character has its own VAL state that:
 * 1. Decays toward baseline over time
 * 2. Shifts in response to perception events
 * 3. Can be modified by BT conditions/actions
 * 4. Emits val events to the tracer for debug visibility
 */

import type { ValState, ValBias, EmotionDSL } from './types'
import {
  createValState,
  biasMatchScore,
  clamp,
} from './types'
import { tracer } from '@/engine/tracer'

// ─── Default emotion presets ───────────────────────────────────

export const emotionPresets: Record<string, EmotionDSL> = {
  anxious: {
    label: 'anxious',
    initial: { valence: -0.3, arousal: 0.7, dominance: 0.2 },
    decayRate: 0.002,
    perceptionSensitivity: 0.15,
    baseline: { valence: 0, arousal: 0.3, dominance: 0.5 },
    perceptionModifiers: {
      'see.face': { valenceShift: -0.2, arousalShift: 0.1 },
      'near': { valenceShift: -0.1, arousalShift: 0.15 },
      'hear.sound': { valenceShift: -0.05, arousalShift: 0.2 },
    },
  },
  playful: {
    label: 'playful',
    initial: { valence: 0.6, arousal: 0.6, dominance: 0.6 },
    decayRate: 0.001,
    perceptionSensitivity: 0.12,
    baseline: { valence: 0.3, arousal: 0.4, dominance: 0.5 },
    perceptionModifiers: {
      'see.object': { valenceShift: 0.15, arousalShift: 0.1 },
      'hear.sound': { valenceShift: 0.1, arousalShift: 0.15 },
    },
  },
  stoic: {
    label: 'stoic',
    initial: { valence: 0, arousal: 0.2, dominance: 0.8 },
    decayRate: 0.0005,
    perceptionSensitivity: 0.05,
    baseline: { valence: 0, arousal: 0.2, dominance: 0.8 },
  },
  curious: {
    label: 'curious',
    initial: { valence: 0.3, arousal: 0.5, dominance: 0.4 },
    decayRate: 0.001,
    perceptionSensitivity: 0.1,
    baseline: { valence: 0.2, arousal: 0.35, dominance: 0.5 },
    perceptionModifiers: {
      'see.object': { valenceShift: 0.1, arousalShift: 0.05 },
      'see.face': { valenceShift: 0.05, arousalShift: 0.1 },
    },
  },
  guardian: {
    label: 'guardian',
    initial: { valence: 0.1, arousal: 0.5, dominance: 0.9 },
    decayRate: 0.0008,
    perceptionSensitivity: 0.12,
    baseline: { valence: 0.1, arousal: 0.3, dominance: 0.8 },
    perceptionModifiers: {
      'see.face': { valenceShift: -0.1, arousalShift: 0.2 },
      'near': { valenceShift: -0.15, arousalShift: 0.25 },
      'bump': { valenceShift: -0.2, arousalShift: 0.3 },
    },
  },
  shy: {
    label: 'shy',
    initial: { valence: -0.1, arousal: 0.4, dominance: 0.2 },
    decayRate: 0.0015,
    perceptionSensitivity: 0.18,
    baseline: { valence: 0.1, arousal: 0.2, dominance: 0.4 },
    perceptionModifiers: {
      'see.face': { valenceShift: -0.3, arousalShift: 0.2 },
      'near': { valenceShift: -0.15, arousalShift: 0.15 },
    },
  },
  energetic: {
    label: 'energetic',
    initial: { valence: 0.5, arousal: 0.8, dominance: 0.7 },
    decayRate: 0.001,
    perceptionSensitivity: 0.08,
    baseline: { valence: 0.3, arousal: 0.5, dominance: 0.6 },
  },
  calm: {
    label: 'calm',
    initial: { valence: 0.3, arousal: 0.15, dominance: 0.5 },
    decayRate: 0.0003,
    perceptionSensitivity: 0.03,
    baseline: { valence: 0.3, arousal: 0.15, dominance: 0.5 },
  },
}

// ─── VAL Engine ────────────────────────────────────────────────

export interface ValEngineOptions {
  /** Character ID for tracer labels */
  characterId: string
  /** Initial emotion preset name */
  emotionPreset?: string
  /** Custom emotion DSL (overrides preset) */
  emotion?: Partial<EmotionDSL>
  /** VAL decay rate multiplier (1 = default) */
  decayMultiplier?: number
}

export class ValEngine {
  private val: ValState
  private baseline: ValState
  private decayRate: number
  private perceptionSensitivity: number
  private perceptionModifiers?: Record<string, { valenceShift: number; arousalShift: number }>
  private characterId: string
  private history_: ValState[] = [] // for debug trajectory
  private readonly MAX_HISTORY = 300

  constructor(opts: ValEngineOptions) {
    this.characterId = opts.characterId
    const preset = opts.emotionPreset ? emotionPresets[opts.emotionPreset] : undefined
    const emotion = opts.emotion || {}

    this.val = createValState(
      emotion.initial?.valence ?? preset?.initial.valence ?? 0,
      emotion.initial?.arousal ?? preset?.initial.arousal ?? 0.3,
      emotion.initial?.dominance ?? preset?.initial.dominance ?? 0.5,
    )

    this.baseline = createValState(
      emotion.baseline?.valence ?? preset?.baseline?.valence ?? 0,
      emotion.baseline?.arousal ?? preset?.baseline?.arousal ?? 0.3,
      emotion.baseline?.dominance ?? preset?.baseline?.dominance ?? 0.5,
    )

    this.decayRate = (emotion.decayRate ?? preset?.decayRate ?? 0.001) * (opts.decayMultiplier ?? 1)
    this.perceptionSensitivity = emotion.perceptionSensitivity ?? preset?.perceptionSensitivity ?? 0.1
    this.perceptionModifiers = emotion.perceptionModifiers ?? preset?.perceptionModifiers
  }

  get valence(): number { return this.val.valence }
  get arousal(): number { return this.val.arousal }
  get dominance(): number { return this.val.dominance }
  get state(): ValState { return { ...this.val } }
  get history(): readonly ValState[] { return this.history_ }

  /** Decay VAL toward baseline (call each tick) */
  tick(deltaMs: number): void {
    const t = performance.now()
    const decay = this.decayRate * (deltaMs / 100) // normalized per 100ms tick

    this.val.valence = lerp(this.val.valence, this.baseline.valence, decay)
    this.val.arousal = lerp(this.val.arousal, this.baseline.arousal, decay)
    this.val.dominance = lerp(this.val.dominance, this.baseline.dominance, decay)

    this.val.valence = clamp(this.val.valence, -1, 1)
    this.val.arousal = clamp(this.val.arousal, 0, 1)
    this.val.dominance = clamp(this.val.dominance, 0, 1)

    // Record history for debug
    this.history_.push({ ...this.val })
    if (this.history_.length > this.MAX_HISTORY) {
      this.history_.shift()
    }

    // Emit val.update event
    emitValEvent('val.update', t, this.val, { characterId: this.characterId })
  }

  /**
   * Apply a perception event to shift VAL.
   * Returns the shifted state.
   */
  onPerception(category: string, confidence: number): ValState {
    const modifier = this.perceptionModifiers?.[category]
    if (modifier) {
      this.val.valence = clamp(
        this.val.valence + modifier.valenceShift * confidence * this.perceptionSensitivity,
        -1, 1,
      )
      this.val.arousal = clamp(
        this.val.arousal + modifier.arousalShift * confidence * this.perceptionSensitivity,
        0, 1,
      )
    } else {
      // Generic shift
      this.val.valence = clamp(this.val.valence + 0.05 * confidence, -1, 1)
      this.val.arousal = clamp(this.val.arousal + 0.03 * confidence, 0, 1)
    }

    emitValEvent('val.update', performance.now(), this.val, {
      characterId: this.characterId,
      category,
      confidence,
    })

    return { ...this.val }
  }

  /**
   * Check how well a bias condition matches current VAL.
   * Returns score: -1 (no match), 0 (neutral), 1 (match)
   */
  checkBias(bias: ValBias): number {
    const score = biasMatchScore(bias, this.val)
    const type = score === 1 ? 'val.bias.match' : score === -1 ? 'val.bias.mismatch' : 'val.update'
    emitValEvent(type, performance.now(), this.val, {
      characterId: this.characterId,
      bias,
    })
    return score
  }

  /**
   * Manually shift VAL (for BT action nodes).
   */
  shift(valenceDelta?: number, arousalDelta?: number, dominanceDelta?: number): ValState {
    if (valenceDelta !== undefined) {
      this.val.valence = clamp(this.val.valence + valenceDelta, -1, 1)
    }
    if (arousalDelta !== undefined) {
      this.val.arousal = clamp(this.val.arousal + arousalDelta, 0, 1)
    }
    if (dominanceDelta !== undefined) {
      this.val.dominance = clamp(this.val.dominance + dominanceDelta, 0, 1)
    }
    emitValEvent('val.update', performance.now(), this.val, {
      characterId: this.characterId,
      valenceDelta,
      arousalDelta,
      dominanceDelta,
    })
    return { ...this.val }
  }

  /** Reset to initial state */
  reset(): void {
    this.val = createValState(
      this.baseline.valence,
      this.baseline.arousal,
      this.baseline.dominance,
    )
    this.history_ = []
  }

  /** Get history as VAL events for debug */
  toValEvents(): Array<{ t: number; type: string; label: string; valence: number; arousal: number; dominance: number }> {
    return this.history_.map((vs, i) => ({
      t: i,
      type: 'val.update',
      label: `val:${this.characterId}`,
      valence: vs.valence,
      arousal: vs.arousal,
      dominance: vs.dominance,
    }))
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function emitValEvent(
  type: string,
  t: number,
  val: ValState,
  payload: Record<string, unknown>,
): void {
  try {
    tracer.emit({
      t,
      type: 'val.update',
      label: type,
      payload: {
        valence: val.valence,
        arousal: val.arousal,
        dominance: val.dominance,
        ...payload,
      },
    })
  } catch {
    // Tracer may not be initialized
  }
}

// Re-export types for convenience
export type { ValState } from './types'

