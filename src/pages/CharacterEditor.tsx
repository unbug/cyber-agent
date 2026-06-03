import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { characters, getBehavior, saveCharacterAsJSON } from '@/agents'
import type { BTEditionNode } from '@/agents'
import type { Character, ValConfig, MemoryConfig, PerceptionConfig } from '@/agents/types'
import type { BehaviorNodeDef } from '@/engine/types'
import BTGraphEditor from './BTGraphEditor'
import styles from './CharacterEditor.module.css'
import { emotionPresets } from '@/affect/emotions'

function createDefaultTree(): BTEditionNode {
  return {
    type: 'selector',
    id: 'root',
    children: [
      {
        type: 'sequence',
        id: 'node_idle',
        children: [
          { type: 'condition', id: 'cond_energy', condition: 'isNear', args: { distance: 50 } },
          { type: 'action', id: 'act_idle', name: 'idle' },
        ],
      },
      {
        type: 'sequence',
        id: 'node_move',
        children: [
          { type: 'condition', id: 'cond_near', condition: 'isNear', args: { distance: 100 } },
          { type: 'action', id: 'act_move', name: 'moveToPointer' },
        ],
      },
    ],
  }
}

const CATEGORIES = ['companion', 'guard', 'performer', 'explorer'] as const

function convertToEdition(def: BehaviorNodeDef): BTEditionNode {
  const base: BTEditionNode = {
    type: def.type,
    id: `node_${Math.random().toString(36).substr(2, 9)}`,
    children: [],
  }
  if ('name' in def && typeof def.name === 'string') base.name = def.name
  if ('condition' in def && typeof def.condition === 'string') base.condition = def.condition
  if ('durationMs' in def) base.durationMs = def.durationMs
  if ('count' in def) base.count = def.count
  if ('successThreshold' in def) base.successThreshold = def.successThreshold
  if ('args' in def && def.args) base.args = def.args
  if ('child' in def && def.child) {
    base.child = convertToEdition(def.child as BehaviorNodeDef)
  }
  if ('children' in def && Array.isArray(def.children)) {
    base.children = (def.children as BehaviorNodeDef[]).map(convertToEdition).filter(Boolean) as BTEditionNode[]
  }
  return base
}

// ─── VAL Affect Panel ─────────────────────────────────────────────

function ValAffectPanel({
  emotionPreset,
  valConfig,
  onPresetChange,
  onValChange,
}: {
  emotionPreset: string
  valConfig: ValConfig | undefined
  onPresetChange: (name: string) => void
  onValChange: (cfg: ValConfig) => void
}) {
  const [selectedPreset, setSelectedPreset] = useState(emotionPreset || 'playful')
  const [valence, setValence] = useState(valConfig?.initial?.valence ?? 0)
  const [arousal, setArousal] = useState(valConfig?.initial?.arousal ?? 0.3)
  const [dominance, setDominance] = useState(valConfig?.initial?.dominance ?? 0.5)
  const [decayMult, setDecayMult] = useState(valConfig?.decayMultiplier ?? 1)

  useEffect(() => {
    setSelectedPreset(emotionPreset || 'playful')
  }, [emotionPreset])

  useEffect(() => {
    const preset = emotionPresets[selectedPreset]
    if (preset && !valConfig?.initial) {
      setValence(preset.initial.valence)
      setArousal(preset.initial.arousal)
      setDominance(preset.initial.dominance)
    }
  }, [selectedPreset, valConfig?.initial])

  const handleApply = () => {
    onPresetChange(selectedPreset)
    onValChange({
      initial: { valence, arousal, dominance },
      decayMultiplier: decayMult,
    })
  }

  const resetToPreset = () => {
    const preset = emotionPresets[selectedPreset]
    if (preset) {
      setValence(preset.initial.valence)
      setArousal(preset.initial.arousal)
      setDominance(preset.initial.dominance)
      onPresetChange(selectedPreset)
      onValChange({})
    }
  }

  // Derive emotion label from current VAL
  const valLabel = valence > 0.3 ? 'positive' : valence < -0.3 ? 'negative' : 'neutral'
  const arousalLabel = arousal > 0.6 ? 'high' : arousal > 0.3 ? 'medium' : 'low'
  const domLabel = dominance > 0.6 ? 'dominant' : dominance > 0.3 ? 'neutral' : 'submissive'

  return (
    <div className={styles.configPanel}>
      <div className={styles.configPanelTitle}>
        <span className={styles.configPanelIcon}>🧠</span>
        <span>VAL Affect</span>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Emotion Preset</label>
        <select
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
          className={styles.select}
        >
          {Object.keys(emotionPresets).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className={styles.valPreview}>
        <span className={styles.valLabel}>{valLabel}</span>
        <span className={styles.valLabel}>{arousalLabel}</span>
        <span className={styles.valLabel}>{domLabel}</span>
      </div>

      <div className={styles.valSliders}>
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel}>Valence</label>
          <input
            type="range" min="-1" max="1" step="0.05"
            value={valence}
            onChange={e => setValence(parseFloat(e.target.value))}
            className={styles.slider}
          />
          <span className={styles.sliderValue}>{valence.toFixed(2)}</span>
        </div>
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel}>Arousal</label>
          <input
            type="range" min="0" max="1" step="0.05"
            value={arousal}
            onChange={e => setArousal(parseFloat(e.target.value))}
            className={styles.slider}
          />
          <span className={styles.sliderValue}>{arousal.toFixed(2)}</span>
        </div>
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel}>Dominance</label>
          <input
            type="range" min="0" max="1" step="0.05"
            value={dominance}
            onChange={e => setDominance(parseFloat(e.target.value))}
            className={styles.slider}
          />
          <span className={styles.sliderValue}>{dominance.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Decay Multiplier</label>
        <input
          type="number" min="0.01" max="5" step="0.01"
          value={decayMult}
          onChange={e => setDecayMult(parseFloat(e.target.value) || 1)}
          className={styles.input}
        />
      </div>

      <div className={styles.panelActions}>
        <button onClick={resetToPreset} className={styles.btnGhost}>Reset</button>
        <button onClick={handleApply} className={styles.btnPrimary}>Apply</button>
      </div>
    </div>
  )
}

// ─── Memory Config Panel ──────────────────────────────────────────

function MemoryConfigPanel({
  memoryConfig,
  onChange,
}: {
  memoryConfig: MemoryConfig | undefined
  onChange: (cfg: MemoryConfig) => void
}) {
  const [enabled, setEnabled] = useState(memoryConfig?.enabled ?? true)
  const [halfLife, setHalfLife] = useState(memoryConfig?.halfLifeMs ?? 3_600_000)
  const [initialRelevance, setInitialRelevance] = useState(memoryConfig?.initialRelevance ?? 1.0)
  const [minRelevance, setMinRelevance] = useState(memoryConfig?.minRelevance ?? 0.01)

  const halfLifeHours = halfLife / 3_600_000

  const handleApply = () => {
    onChange({ enabled, halfLifeMs: halfLife, initialRelevance, minRelevance })
  }

  const resetToDefaults = () => {
    setEnabled(true)
    setHalfLife(3_600_000)
    setInitialRelevance(1.0)
    setMinRelevance(0.01)
    onChange({})
  }

  return (
    <div className={styles.configPanel}>
      <div className={styles.configPanelTitle}>
        <span className={styles.configPanelIcon}>🧩</span>
        <span>Episodic Memory</span>
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <span className={styles.toggleText}>Enable memory</span>
        </label>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Half-life (hours)</label>
        <input
          type="number" min="0.1" max="720" step="0.1"
          value={halfLifeHours}
          onChange={e => setHalfLife(parseFloat(e.target.value) * 3_600_000)}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Initial Relevance</label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={initialRelevance}
          onChange={e => setInitialRelevance(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.sliderValue}>{initialRelevance.toFixed(2)}</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Min Relevance Floor</label>
        <input
          type="range" min="0" max="0.1" step="0.005"
          value={minRelevance}
          onChange={e => setMinRelevance(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.sliderValue}>{minRelevance.toFixed(3)}</span>
      </div>

      <div className={styles.panelActions}>
        <button onClick={resetToDefaults} className={styles.btnGhost}>Reset</button>
        <button onClick={handleApply} className={styles.btnPrimary}>Apply</button>
      </div>
    </div>
  )
}

// ─── Perception Config Panel ──────────────────────────────────────

const PERCEPTION_CATEGORIES: Array<{
  value: 'see.face' | 'see.object' | 'hear.word' | 'hear.sound' | 'near' | 'tilt' | 'bump' | 'custom'
  label: string
  emoji: string
}> = [
  { value: 'see.face', label: 'Face', emoji: '👤' },
  { value: 'see.object', label: 'Object', emoji: '📦' },
  { value: 'hear.word', label: 'Word', emoji: '💬' },
  { value: 'hear.sound', label: 'Sound', emoji: '🔊' },
  { value: 'near', label: 'Proximity', emoji: '📏' },
  { value: 'tilt', label: 'Tilt', emoji: '📐' },
  { value: 'bump', label: 'Bump', emoji: '💥' },
  { value: 'custom', label: 'Custom', emoji: '⚙️' },
]

function PerceptionConfigPanel({
  perceptionConfig,
  onChange,
}: {
  perceptionConfig: PerceptionConfig | undefined
  onChange: (cfg: PerceptionConfig) => void
}) {
  const [enabled, setEnabled] = useState(perceptionConfig?.enabled ?? true)
  const [bufferSize, setBufferSize] = useState(perceptionConfig?.bufferSize ?? 256)
  const [emitToTracer, setEmitToTracer] = useState(perceptionConfig?.emitToTracer ?? true)
  const [categories, setCategories] = useState<Set<string>>(
    new Set(perceptionConfig?.categories ?? PERCEPTION_CATEGORIES.map(c => c.value))
  )

  const toggleCategory = (value: string) => {
    const next = new Set(categories)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setCategories(next)
  }

  const selectAll = () => setCategories(new Set(PERCEPTION_CATEGORIES.map(c => c.value)))
  const deselectAll = () => setCategories(new Set())

  const handleApply = () => {
    onChange({
      enabled,
      bufferSize,
      emitToTracer,
      categories: Array.from(categories) as PerceptionConfig['categories'],
    })
  }

  const resetToDefaults = () => {
    setEnabled(true)
    setBufferSize(256)
    setEmitToTracer(true)
    setCategories(new Set(PERCEPTION_CATEGORIES.map(c => c.value)))
    onChange({})
  }

  return (
    <div className={styles.configPanel}>
      <div className={styles.configPanelTitle}>
        <span className={styles.configPanelIcon}>👁️</span>
        <span>Perception Bus</span>
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <span className={styles.toggleText}>Enable perception</span>
        </label>
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={emitToTracer}
            onChange={e => setEmitToTracer(e.target.checked)}
          />
          <span className={styles.toggleText}>Emit to tracer</span>
        </label>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Buffer Size</label>
        <input
          type="number" min="16" max="2048" step="16"
          value={bufferSize}
          onChange={e => setBufferSize(parseInt(e.target.value) || 256)}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Categories</label>
        <div className={styles.categoryGrid}>
          {PERCEPTION_CATEGORIES.map(cat => (
            <label key={cat.value} className={styles.categoryItem}>
              <input
                type="checkbox"
                checked={categories.has(cat.value)}
                onChange={() => toggleCategory(cat.value)}
              />
              <span className={styles.categoryEmoji}>{cat.emoji}</span>
              <span className={styles.categoryName}>{cat.label}</span>
            </label>
          ))}
        </div>
        <div className={styles.categoryActions}>
          <button onClick={selectAll} className={styles.btnTiny}>All</button>
          <button onClick={deselectAll} className={styles.btnTiny}>None</button>
        </div>
      </div>

      <div className={styles.panelActions}>
        <button onClick={resetToDefaults} className={styles.btnGhost}>Reset</button>
        <button onClick={handleApply} className={styles.btnPrimary}>Apply</button>
      </div>
    </div>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────

export default function CharacterEditor() {
  const { id: agentId } = useParams<{ id: string }>()

  const [name, setName] = useState('New Character')
  const [emoji, setEmoji] = useState('🤖')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>(['custom'])
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [category, setCategory] = useState<string>('companion')
  const [btRoot, setBtRoot] = useState<BTEditionNode | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // v3.0: config state
  const [emotionPreset, setEmotionPreset] = useState('playful')
  const [valConfig, setValConfig] = useState<ValConfig | undefined>()
  const [memoryConfig, setMemoryConfig] = useState<MemoryConfig | undefined>()
  const [perceptionConfig, setPerceptionConfig] = useState<PerceptionConfig | undefined>()

  const isNew = !agentId || !characters.find(c => c.id === agentId)

  const notify = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    if (agentId) {
      const char = characters.find(c => c.id === agentId)
      if (char) {
        setName(char.name)
        setEmoji(char.emoji)
        setDescription(char.description)
        setTags([...char.tags])
        setDifficulty(char.difficulty)
        setCategory(char.category)
        setEmotionPreset(char.emotionPreset || 'playful')
        setValConfig(char.valConfig)
        setMemoryConfig(char.memoryConfig)
        setPerceptionConfig(char.perceptionConfig)
        const behavior = getBehavior(agentId)
        if (behavior?.tree) {
          setBtRoot(convertToEdition(behavior.tree))
        } else {
          setBtRoot(createDefaultTree())
        }
        return
      }
    }
    setName('New Character')
    setEmoji('🤖')
    setDescription('')
    setTags(['custom'])
    setDifficulty('medium')
    setCategory('companion')
    setEmotionPreset('playful')
    setValConfig(undefined)
    setMemoryConfig(undefined)
    setPerceptionConfig(undefined)
    setBtRoot(createDefaultTree())
  }, [agentId])

  const handleExport = () => {
    const config: Pick<Character, 'valConfig' | 'memoryConfig' | 'perceptionConfig'> = {}
    if (valConfig) config.valConfig = valConfig
    if (memoryConfig) config.memoryConfig = memoryConfig
    if (perceptionConfig) config.perceptionConfig = perceptionConfig

    saveCharacterAsJSON(
      name, description, tags, difficulty, emoji, btRoot,
      emotionPreset, config.valConfig, config.memoryConfig, config.perceptionConfig,
    )
    notify('Exported!')
  }

  const handleImport = () => {
    try {
      const node = JSON.parse(importJson) as BTEditionNode
      setBtRoot(node)
      setShowImport(false)
      setImportJson('')
      notify('Behavior tree imported.')
    } catch {
      notify('Invalid JSON.')
    }
  }

  const handleCopyBT = async () => {
    if (!btRoot) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(btRoot, null, 2))
      notify('Copied to clipboard!')
    } catch {
      notify('Copy failed.')
    }
  }

  const nodeCount = countNodes(btRoot)
  const displayId = name.toLowerCase().replace(/\s+/g, '-') || 'new-character'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/gallery" className={styles.backBtn}>← Gallery</Link>
          <span className={styles.emojiDisplay}>{emoji || '🤖'}</span>
          <h1 className={styles.title}>{isNew ? 'New Character' : name}</h1>
        </div>
        <div className={styles.headerRight}>
          <button onClick={() => setShowImport(true)} className={styles.btnGhost}>Import BT</button>
          <button onClick={handleCopyBT} disabled={!btRoot} className={styles.btnGhost}>Copy BT</button>
          <button onClick={handleExport} className={styles.btnPrimary}>Export</button>
        </div>
      </header>

      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarFields}>
            <div className={styles.field}>
              <label className={styles.label}>Emoji</label>
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className={`${styles.input} ${styles.inputEmoji}`}
                placeholder="🤖"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={styles.input}
                placeholder="Character name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={styles.textarea}
                placeholder="What does this character do?"
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <input
                value={tags.join(', ')}
                onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className={styles.input}
                placeholder="tag1, tag2"
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')} className={styles.select}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* v3.0: Configuration panels */}
          <div className={styles.configPanels}>
            <ValAffectPanel
              emotionPreset={emotionPreset}
              valConfig={valConfig}
              onPresetChange={setEmotionPreset}
              onValChange={setValConfig}
            />
            <MemoryConfigPanel
              memoryConfig={memoryConfig}
              onChange={setMemoryConfig}
            />
            <PerceptionConfigPanel
              perceptionConfig={perceptionConfig}
              onChange={setPerceptionConfig}
            />
          </div>

          <div className={styles.meta}>
            <div className={styles.metaRow}><span>ID</span><code>{displayId}</code></div>
            <div className={styles.metaRow}><span>Nodes</span><code>{nodeCount}</code></div>
            <div className={styles.metaRow}><span>Category</span><code>{category}</code></div>
          </div>
        </aside>

        <main className={styles.main}>
          <BTGraphEditor
            root={btRoot}
            onChange={setBtRoot}
            onSave={setBtRoot}
            capabilities={null}
          />
        </main>
      </div>

      {showImport && (
        <div className={styles.overlay} onClick={() => setShowImport(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Import Behavior Tree</h2>
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder='{"type":"selector","children":[...]}'
              className={styles.modalTextarea}
              rows={8}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setShowImport(false)} className={styles.btnGhost}>Cancel</button>
              <button onClick={handleImport} className={styles.btnPrimary}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function countNodes(node: BTEditionNode | null | undefined): number {
  if (!node) return 0
  let n = 1
  if (node.children) n += node.children.reduce((s, c) => s + countNodes(c), 0)
  if (node.child) n += countNodes(node.child)
  return n
}
