/**
 * CharacterConfigPanel — v3.0 debug panel showing VAL / memory / perception
 * configs for the currently-running character.
 *
 * Displays:
 * - VAL affect config (preset, initial vals, decay, perception sensitivity)
 * - Episodic memory config (enabled, half-life, relevance)
 * - Perception bus config (enabled, categories, buffer size)
 */


import { emotionPresets } from '@/affect/emotions'
import type { MemoryConfig, PerceptionConfig, ValConfig } from '@/agents/types'
import styles from './DebugPage.module.css'

// ─── VAL Config Display ────────────────────────────────────────────

function ValConfigDisplay({
  emotionPreset,
  valConfig,
}: {
  emotionPreset?: string
  valConfig?: ValConfig
}) {
  if (!emotionPreset && !valConfig) return null

  const preset = emotionPreset ? emotionPresets[emotionPreset] : null
  const initial = valConfig?.initial as { valence?: number; arousal?: number; dominance?: number } | undefined
  const baseline = valConfig?.baseline as { valence?: number; arousal?: number; dominance?: number } | undefined
  const decayMult = valConfig?.decayMultiplier as number | undefined
  const percSens = valConfig?.perceptionSensitivity as number | undefined

  return (
    <div className={styles.configSection}>
      <div className={styles.configSectionTitle}>
        <span className={styles.configSectionIcon}>🧠</span>
        <span>VAL Affect</span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Preset</span>
        <span className={styles.configValue}>
          {emotionPreset || '—'}
          {preset && (
            <span className={styles.configHint}>
              ({valToString(preset.initial)})
            </span>
          )}
        </span>
      </div>
      {initial && (
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Initial VAL</span>
          <span className={styles.configValue}>{valToString(initial)}</span>
        </div>
      )}
      {baseline && (
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Baseline</span>
          <span className={styles.configValue}>{valToString(baseline)}</span>
        </div>
      )}
      {decayMult !== undefined && decayMult !== 1 && (
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Decay Multiplier</span>
          <span className={styles.configValue}>{decayMult.toFixed(3)}</span>
        </div>
      )}
      {percSens !== undefined && (
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Perception Sensitivity</span>
          <span className={styles.configValue}>{percSens.toFixed(3)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Memory Config Display ─────────────────────────────────────────

function MemoryConfigDisplay({ config }: { config?: MemoryConfig }) {
  if (!config) return null

  return (
    <div className={styles.configSection}>
      <div className={styles.configSectionTitle}>
        <span className={styles.configSectionIcon}>🧩</span>
        <span>Episodic Memory</span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Enabled</span>
        <span className={styles.configValue}>
          <span className={config.enabled === false ? styles.configOff : styles.configOn}>
            {config.enabled === false ? 'Disabled' : 'Enabled'}
          </span>
        </span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Half-life</span>
        <span className={styles.configValue}>
          {config.halfLifeMs
            ? `${(config.halfLifeMs / 3_600_000).toFixed(1)}h`
            : '—'}
        </span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Initial Relevance</span>
        <span className={styles.configValue}>{config.initialRelevance?.toFixed(2) ?? '—'}</span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Min Relevance</span>
        <span className={styles.configValue}>{config.minRelevance?.toFixed(3) ?? '—'}</span>
      </div>
    </div>
  )
}

// ─── Perception Config Display ─────────────────────────────────────

const PERCEPTION_EMOJI: Record<string, string> = {
  'see.face': '👤',
  'see.object': '📦',
  'hear.word': '💬',
  'hear.sound': '🔊',
  'near': '📏',
  'tilt': '📐',
  'bump': '💥',
  'custom': '⚙️',
}

function PerceptionConfigDisplay({ config }: { config?: PerceptionConfig }) {
  if (!config) return null

  const categories = (config.categories as string[] | undefined) ?? ['see.face', 'see.object', 'hear.word', 'hear.sound', 'near', 'tilt', 'bump']

  return (
    <div className={styles.configSection}>
      <div className={styles.configSectionTitle}>
        <span className={styles.configSectionIcon}>👁️</span>
        <span>Perception Bus</span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Enabled</span>
        <span className={styles.configValue}>
          <span className={config.enabled === false ? styles.configOff : styles.configOn}>
            {config.enabled === false ? 'Disabled' : 'Enabled'}
          </span>
        </span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Buffer Size</span>
        <span className={styles.configValue}>{config.bufferSize ?? 256}</span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Emit to Tracer</span>
        <span className={styles.configValue}>
          <span className={config.emitToTracer === false ? styles.configOff : styles.configOn}>
            {config.emitToTracer === false ? 'No' : 'Yes'}
          </span>
        </span>
      </div>
      <div className={styles.configRow}>
        <span className={styles.configLabel}>Categories</span>
        <span className={styles.configValue}>
          <div className={styles.configCategoryGrid}>
            {categories.map(cat => (
              <span key={cat} className={styles.configCategoryBadge}>
                {PERCEPTION_EMOJI[cat] ?? '·'} {cat}
              </span>
            ))}
          </div>
        </span>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────

function valToString(val: { valence?: number; arousal?: number; dominance?: number }): string {
  const v = (val.valence ?? 0).toFixed(2)
  const a = (val.arousal ?? 0).toFixed(2)
  const d = (val.dominance ?? 0).toFixed(2)
  return `${v}/${a}/${d}`
}

// ─── Main Panel ────────────────────────────────────────────────────

export function CharacterConfigPanel({
  emotionPreset,
  valConfig,
  memoryConfig,
  perceptionConfig,
}: {
  emotionPreset?: string
  valConfig?: ValConfig
  memoryConfig?: MemoryConfig
  perceptionConfig?: PerceptionConfig
}) {
  const hasConfig = !!(emotionPreset || valConfig || memoryConfig || perceptionConfig)

  if (!hasConfig) return null

  return (
    <div className={styles.configPanel}>
      <div className={styles.configPanelTitle}>
        <span className={styles.configPanelIcon}>⚙️</span>
        <span>Character Config (v3.0)</span>
      </div>
      <ValConfigDisplay emotionPreset={emotionPreset} valConfig={valConfig} />
      <MemoryConfigDisplay config={memoryConfig} />
      <PerceptionConfigDisplay config={perceptionConfig} />
    </div>
  )
}
