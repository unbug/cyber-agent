export interface Character {
  id: string
  name: string
  emoji: string
  category: 'companion' | 'guard' | 'performer' | 'explorer'
  description: string
  tags: string[]
  personality: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  /** Which robot platforms this character can run on */
  compatibleAdapters: string[]
  /** Base emotion preset for VAL affect engine */
  emotionPreset?: string
  // ─── v3.0: No-code editor config fields ───────────────────────
  /** Custom VAL affect engine config (overrides emotionPreset) */
  valConfig?: ValConfig
  /** Episodic memory config */
  memoryConfig?: MemoryConfig
  /** Perception bus config */
  perceptionConfig?: PerceptionConfig
}

// ─── VAL Config ─────────────────────────────────────────────────

export interface ValConfig {
  /** Override initial VAL state */
  initial?: { valence: number; arousal: number; dominance: number }
  /** Decay rate multiplier (1 = default) */
  decayMultiplier?: number
  /** Override baseline VAL */
  baseline?: { valence: number; arousal: number; dominance: number }
  /** Perception sensitivity override */
  perceptionSensitivity?: number
  /** Custom perception modifiers */
  perceptionModifiers?: Record<string, { valenceShift: number; arousalShift: number }>
}

// ─── Memory Config ───────────────────────────────────────────────

export interface MemoryConfig {
  /** Enable episodic memory (default: true) */
  enabled?: boolean
  /** Forgetting curve half-life in ms (default: 3600000 = 1 hour) */
  halfLifeMs?: number
  /** Initial relevance for new memories (default: 1.0) */
  initialRelevance?: number
  /** Minimum relevance floor (default: 0.01) */
  minRelevance?: number
  /** Salience boost factor (default: 0.5) */
  salienceBoost?: number
}

// ─── Perception Config ──────────────────────────────────────────

export interface PerceptionConfig {
  /** Enable perception bus (default: true) */
  enabled?: boolean
  /** Max buffer size for event history (default: 256) */
  bufferSize?: number
  /** Emit to tracer for debugger visibility (default: true) */
  emitToTracer?: boolean
  /** Which perception categories to subscribe to */
  categories?: Array<
    'see.face' | 'see.object' | 'hear.word' | 'hear.sound'
    | 'near' | 'tilt' | 'bump' | 'custom'
  >
  /** Per-category sensitivity overrides */
  sensitivity?: Record<string, number>
}
