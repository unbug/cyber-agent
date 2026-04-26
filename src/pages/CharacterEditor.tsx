import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { characters, getBehavior, saveCharacterAsJSON } from '@/agents'
import type { BTEditionNode } from '@/agents'
import type { BehaviorNodeDef } from '@/engine/types'
import BTGraphEditor from './BTGraphEditor'
import styles from './CharacterEditor.module.css'

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
    setBtRoot(createDefaultTree())
  }, [agentId])

  const handleExport = () => {
    saveCharacterAsJSON(name, description, tags, difficulty, emoji, btRoot)
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
