/**
 * Character Editor
 *
 * A unified editor for:
 * - Creating new characters from scratch
 * - Editing existing characters' metadata and behavior trees
 * - Visual behavior tree editing with the BTGraphEditor
 * - Export/import of character and behavior tree definitions
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { characters, getBehavior, saveCharacterAsJSON, getAllBehaviors } from '@/agents'
import type { BTEditionNode } from '@/agents'
import type { BehaviorNodeDef } from '@/engine/types'
import BTGraphEditor from './BTGraphEditor'
import styles from './CharacterEditor.module.css'

// ─── Default tree for new characters ──────────────────────────

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

// ─── Constants ────────────────────────────────────────────────

const DEFAULT_CHAR = {
  name: 'New Character',
  emoji: '🤖',
  description: 'A custom character created in the CyberAgent editor.',
  tags: ['custom'],
  difficulty: 'medium',
} as const

const CATEGORIES = ['companion', 'guard', 'performer', 'explorer'] as const

// ─── Main Component ──────────────────────────────────────────

export default function CharacterEditor() {
  const navigate = useNavigate()
  const { id: agentId } = useParams<{ id: string }>()

  // Mode: 'existing' (editing a character) | 'create' (making a new one)
  const [mode, setMode] = useState<'existing' | 'create'>('existing')

  // Character metadata
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🤖')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>(['custom'])
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [category, setCategory] = useState<string>('companion')

  // Behavior tree
  const [btRoot, setBtRoot] = useState<BTEditionNode | null>(null)

  // UI state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedJson, setImportedJson] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  // ─── Load character from URL or create mode ───────────────

  useEffect(() => {
    if (agentId) {
      const char = characters.find(c => c.id === agentId)
      if (char) {
        setMode('existing')
        setName(char.name)
        setEmoji(char.emoji)
        setDescription(char.description)
        setTags([...char.tags])
        setDifficulty(char.difficulty)
        setCategory(char.category)
        const behavior = getBehavior(agentId)
        if (behavior && behavior.tree) {
          setBtRoot(convertToEdition(behavior.tree))
        } else {
          setBtRoot(createDefaultTree())
        }
      } else {
        setMode('create')
        resetForm()
      }
    } else {
      setMode('create')
      resetForm()
    }
  }, [agentId])

  const resetForm = () => {
    setName(DEFAULT_CHAR.name)
    setEmoji(DEFAULT_CHAR.emoji)
    setDescription(DEFAULT_CHAR.description)
    setTags(['custom'])
    setDifficulty('medium')
    setCategory('companion')
    setBtRoot(createDefaultTree())
  }

  // ─── Helpers ──────────────────────────────────────────────

  const convertToEdition = (def: BehaviorNodeDef): BTEditionNode => {
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

  const showNotify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // ─── Export ───────────────────────────────────────────────

  const handleExportCharacter = () => {
    saveCharacterAsJSON(name, description, tags, difficulty, emoji, btRoot)
    showNotify('Character JSON exported!')
  }

  const handleExportBT = () => {
    if (!btRoot) return
    const blob = new Blob([JSON.stringify(btRoot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-behavior-tree.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showNotify('Behavior tree JSON exported!')
  }

  const handleExportAll = () => {
    handleExportCharacter()
    handleExportBT()
    showNotify('Character and behavior tree exported!')
  }

  // ─── Import ───────────────────────────────────────────────

  const handleImportJson = () => {
    try {
      const node = JSON.parse(importedJson) as BTEditionNode
      setBtRoot(node)
      setShowImportDialog(false)
      setImportedJson('')
      showNotify('Behavior tree imported successfully!')
    } catch {
      showNotify('Failed to parse JSON. Please check the format.')
    }
  }

  // ─── Create New from Gallery ──────────────────────────────

  const handleCreateNew = () => {
    setMode('create')
    navigate('/editor/create')
    resetForm()
  }

  // ─── Render ───────────────────────────────────────────────

  const isNew = mode === 'create'
  const displayName = name || 'New Character'
  const displayEmoji = emoji || '🤖'

  return (
    <div className={styles['editor-page']}>
      {/* Top bar */}
      <header className={styles['editor-header']}>
        <div className={styles['editor-header-left']}>
          <Link to="/gallery" className={styles['editor-back-btn']}>
            ← Back to Gallery
          </Link>
          <div className={styles['editor-title']}>
            <span className={styles['editor-emoji']}>{displayEmoji}</span>
            <h1>
              {isNew ? 'Create Character' : 'Character Editor'}
            </h1>
          </div>
          {!isNew && (
            <button onClick={handleCreateNew} className={styles['editor-new-btn']}>
              + New
            </button>
          )}
        </div>

        <div className={styles['editor-header-right']}>
          {!isNew && (
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={styles['editor-select']}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          )}

          <button onClick={() => setShowImportDialog(true)} className={`${styles['editor-btn']} ${styles['editor-btn--import']}`}>
            📂 Import
          </button>

          <button onClick={handleExportAll} className={`${styles['editor-btn']} ${styles['editor-btn--export']}`}>
            💾 Export All
          </button>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={styles['editor-notification']}>
          {notification}
        </div>
      )}

      {/* Two-panel layout */}
      <div className={styles['editor-body']}>
        {/* LEFT: Character metadata */}
        <aside className={styles['editor-sidebar']}>
          <h2 className={styles['editor-sidebar-title']}>Character Info</h2>

          <div className={styles['editor-field']}>
            <label>Emoji</label>
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className={`${styles['editor-input']} ${styles['editor-input--emoji']}`}
              placeholder="🤖"
            />
          </div>

          <div className={styles['editor-field']}>
            <label>Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles['editor-input']}
              placeholder="Character name"
            />
          </div>

          <div className={styles['editor-field']}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={styles['editor-textarea']}
              placeholder="What does this character do?"
              rows={4}
            />
          </div>

          <div className={styles['editor-field']}>
            <label>Tags</label>
            <input
              value={tags.join(', ')}
              onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              className={styles['editor-input']}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className={styles['editor-field']}>
            <label>Difficulty</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className={styles['editor-select']}
            >
              <option value="easy">Easy ★</option>
              <option value="medium">Medium ★★</option>
              <option value="hard">Hard ★★★</option>
            </select>
          </div>

          {/* Summary */}
          <div className={styles['editor-summary']}>
            <h3>Summary</h3>
            <div className={styles['editor-summary-row']}>
              <span>📦 ID:</span>
              <code>{name.toLowerCase().replace(/\s+/g, '-') || 'new-character'}</code>
            </div>
            <div className={styles['editor-summary-row']}>
              <span>🏷️ Category:</span>
              <code>{category}</code>
            </div>
            <div className={styles['editor-summary-row']}>
              <span>📊 Difficulty:</span>
              <code>{difficulty}</code>
            </div>
            <div className={styles['editor-summary-row']}>
              <span>🌳 BT Nodes:</span>
              <code>{countTreeNodes(btRoot)}</code>
            </div>
          </div>
        </aside>

        {/* RIGHT: Behavior Tree Editor */}
        <main className={styles['editor-main']}>
          <h2 className={styles['editor-main-title']}>
            Behavior Tree — {displayName}
          </h2>

          <div className={styles['editor-editor-wrapper']}>
            <BTGraphEditor
              root={btRoot}
              onChange={setBtRoot}
              onSave={setBtRoot}
            />
          </div>

          {/* Quick actions */}
          <div className={styles['editor-actions']}>
            <button onClick={handleExportBT} disabled={!btRoot} className={`${styles['editor-btn']} ${styles['editor-btn--secondary']}`}>
              📄 Export BT as JSON
            </button>
            <button
              onClick={() => {
                if (btRoot) {
                  prompt('Copy this JSON:', JSON.stringify(btRoot, null, 2))
                }
              }}
              disabled={!btRoot}
              className={`${styles['editor-btn']} ${styles['editor-btn--secondary']}`}
            >
              📋 Copy to Clipboard
            </button>
            <Link to="/docs" className={`${styles['editor-btn']} ${styles['editor-btn--outline']}`}>
              📖 Docs
            </Link>
          </div>

          {/* Reference: all characters */}
          <div className={styles['editor-reference']}>
            <h3>Reference — All Characters</h3>
            <div className={styles['editor-ref-grid']}>
              {getAllBehaviors().map((b, i) => {
                const ch = characters.find(c => c.id === b.characterId)
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setMode('existing')
                      navigate(`/agent/${b.characterId}/editor`)
                      setName(ch?.name || b.characterId)
                      setEmoji(ch?.emoji || '🤖')
                      setDescription(ch?.description || '')
                      setTags([...ch?.tags || []])
                      setDifficulty(ch?.difficulty || 'medium')
                      setCategory(ch?.category || 'companion')
                      const behavior = getBehavior(b.characterId)
                      if (behavior && behavior.tree) {
                        setBtRoot(convertToEdition(behavior.tree))
                      }
                    }}
                    className={styles['editor-ref-btn']}
                  >
                    {ch?.emoji ?? '🤖'} {b.characterId}
                  </button>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Import JSON modal */}
      {showImportDialog && (
        <div className={styles['editor-modal-overlay']} onClick={() => setShowImportDialog(false)}>
          <div className={styles['editor-modal']} onClick={e => e.stopPropagation()}>
            <h2>Import Behavior Tree JSON</h2>
            <textarea
              value={importedJson}
              onChange={e => setImportedJson(e.target.value)}
              placeholder='{"type":"selector","children":[...]}'
              className={styles['editor-modal-textarea']}
              rows={8}
            />
            <div className={styles['editor-modal-actions']}>
              <button onClick={() => setShowImportDialog(false)} className={`${styles['editor-btn']} ${styles['editor-btn--outline']}`}>
                Cancel
              </button>
              <button onClick={handleImportJson} className={`${styles['editor-btn']} ${styles['editor-btn--export']}`}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Utility ──────────────────────────────────────────────────

function countTreeNodes(node: BTEditionNode | null | undefined): number {
  if (!node) return 0
  let count = 1
  if (node.children) count += countChildren(node.children)
  if (node.child) count += countTreeNodes(node.child)
  return count
}

function countChildren(children: BTEditionNode[]): number {
  let total = 0
  for (const child of children) {
    total += countTreeNodes(child)
  }
  return total
}
