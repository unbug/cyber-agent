/**
 * Character Editor
 *
 * A two-panel editor:
 * - LEFT: character metadata (name, emoji, description, tags, difficulty)
 * - RIGHT: Behavior Tree visual editor (import/export trees)
 *
 * When a character is selected from the dropdown, its behavior tree loads
 * automatically so you can inspect and modify it.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { characters, getBehavior, saveCharacterAsJSON, getAllBehaviors } from '@/agents'
import type { BTEditionNode, CharacterBehavior, BehaviorNodeDef } from '@/engine/types'

export default function CharacterEditor() {
  const [selectedId, setSelectedId] = useState<string>(
    () => 'loyal-dog' // default
  )
  const [customName, setCustomName] = useState<string>('')
  const [customDesc, setCustomDesc] = useState<string>('')
  const [customTags, setCustomTags] = useState<string[]>([])
  const [customDifficulty, setCustomDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [customEmoji, setCustomEmoji] = useState<string>('')
  const [btRoot, setBtRoot] = useState<BTEditionNode | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedJson, setImportedJson] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()

  // Auto-load from URL if agentId is present
  useEffect(() => {
    if (agentId) {
      setSelectedId(agentId)
      const char = characters.find(c => c.id === agentId)
      if (char) {
        setCustomName(char.name)
        setCustomDesc(char.description)
        setCustomTags([...char.tags])
        setCustomEmoji(char.emoji)
      }
    }
  }, [agentId])

  // Reset form when character selection changes
  useEffect(() => {
    const char = characters.find(c => c.id === selectedId)
    if (char) {
      setCustomName(char.name)
      setCustomDesc(char.description)
      setCustomTags([...char.tags])
      setCustomDifficulty(char.difficulty)
      setCustomEmoji(char.emoji)
      // Load the character's behavior tree
      const behavior = getBehavior(selectedId)
      if (behavior) {
        loadCharacterBehaviorAsEdition(behavior)
      } else {
        setBtRoot(null)
      }
    } else {
      // Custom character — keep current values if already set
      if (!customEmoji) setCustomEmoji('🤖')
    }
  }, [selectedId])

  const loadCharacterBehaviorAsEdition = (behavior: CharacterBehavior) => {
    const convertToEdition = (def: BehaviorNodeDef): BTEditionNode | null => {
      const base: BTEditionNode = {
        type: def.type,
        id: `node_${Math.random().toString(36).substr(2, 9)}`,
        children: [],
      }
      if ('name' in def && typeof def.name === 'string') base.name = def.name
      if ('condition' in def && typeof def.condition === 'string') base.condition = def.condition
      if ('name' in def && typeof def === 'object') base.name = def.name ?? base.name
      if ('durationMs' in def) base.durationMs = def.durationMs
      if ('count' in def) base.count = def.count
      if ('successThreshold' in def) base.successThreshold = def.successThreshold
      if ('args' in def && def.args) base.args = def.args
      if ('child' in def && def.child) {
        const child = convertToEdition(def.child)
        if (child) base.child = child
      }
      if ('children' in def && Array.isArray(def.children)) {
        const children = def.children.map(convertToEdition).filter(Boolean) as BTEditionNode[]
        base.children = children
      }
      return base
    }

    setBtRoot(convertToEdition(behavior.tree))
  }

  const handleSelectCharacter = (id: string) => {
    setSelectedId(id)
  }

  const handleExport = () => {
    // Export full character data (as character editor does)
    if (customName) {
      saveCharacterAsJSON(
        customName,
        customDesc,
        customTags.length ? customTags : ['custom'],
        customDifficulty,
        customEmoji || '🤖',
        btRoot
      )
    }
  }

  const handleExportBtJson = () => {
    if (!btRoot) return
    const blob = new Blob([JSON.stringify(btRoot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(customName || selectedId).toLowerCase().replace(/\s+/g, '-')}-behavior-tree.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // handleImport is intentionally unused — import JSON via the import dialog button instead
  function UNUSED_handleImport() {}
  void UNUSED_handleImport

  const handleImportJsonText = () => {
    try {
      const node = JSON.parse(importedJson) as BTEditionNode
      setBtRoot(node)
      setShowImportDialog(false)
      setImportedJson('')
      setNotification('Behavior tree imported successfully!')
      setTimeout(() => setNotification(null), 3000)
    } catch {
      setNotification('Failed to parse JSON. Make sure it is valid.')
      setTimeout(() => setNotification(null), 3000)
    }
  }

  const handleSaveAll = () => {
    if (!btRoot) {
      setNotification('Please have a behavior tree saved before exporting.')
      setTimeout(() => setNotification(null), 3000)
      return
    }
    handleExportBtJson()
    handleExport()
    setNotification('Exported both behavior tree JSON and character JSON.')
    setTimeout(() => setNotification(null), 3000)
  }

  const handleBack = () => navigate('/gallery')

  // Derived info
  const currentChar = characters.find(c => c.id === selectedId)
  const displayName = customName || currentChar?.name || 'Custom Character'
  const displayEmoji = customEmoji || (currentChar?.emoji ?? '🤖')

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d1a 100%)', color: '#fff' }}
      className="editor-page">
      {/* Top bar */}
      <header style={{
        padding: '1rem 1.5rem',
        background: '#0f0f1aee',
        borderBottom: '1px solid #2a2a3a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleBack}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
            ← Back to Gallery
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>{displayEmoji}</span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Character Editor
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={selectedId} onChange={e => handleSelectCharacter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#1a1a2e',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}>
            {characters.map(char => (
              <option key={char.id} value={char.id}>
                {char.emoji} {char.name}
              </option>
            ))}
          </select>

          <button onClick={() => setShowImportDialog(true)}
            style={{
              padding: '0.5rem 1rem',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}>
            📂 Import JSON
          </button>

          <button onClick={handleSaveAll}
            style={{
              padding: '0.5rem 1rem',
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}>
            💾 Export All
          </button>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div style={{
          padding: '0.75rem 1.5rem',
          background: '#8b5cf622',
          border: '1px solid #8b5cf6',
          borderRadius: '0.375rem',
          margin: '1rem 1.5rem 0',
          fontSize: '0.875rem',
          color: '#c4b5fd',
        }}>
          {notification}
        </div>
      )}

      {/* Two-panel layout */}
      <div style={{
        display: 'flex',
        gap: '0',
        height: 'calc(100vh - 60px - (notification ? 48 : 0))',
        minHeight: 400,
      }}>
        {/* LEFT: Character metadata */}
        <div style={{
          width: 280,
          minWidth: 280,
          background: '#0f0f1a',
          borderRight: '1px solid #2a2a3a',
          padding: '1.5rem',
          overflowY: 'auto',
        }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Character Info
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Emoji
            </label>
            <input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '0.375rem',
                color: '#fff',
                fontSize: '1.25rem',
                textAlign: 'center',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Name
            </label>
            <input value={customName} onChange={e => setCustomName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '0.375rem',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </label>
            <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '0.375rem',
                color: '#fff',
                fontSize: '0.875rem',
                minHeight: 80,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tags (comma-separated)
            </label>
            <input value={customTags.join(', ')} onChange={e => setCustomTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              placeholder="tag1, tag2, tag3"
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '0.375rem',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Difficulty
            </label>
            <select value={customDifficulty} onChange={e => setCustomDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '0.375rem',
                color: '#fff',
                fontSize: '0.875rem',
              }}>
              <option value="easy">Easy ★</option>
              <option value="medium">Medium ★★</option>
              <option value="hard">Hard ★★★</option>
            </select>
          </div>

          {/* Summary */}
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#1a1a2e',
            borderRadius: '0.5rem',
            border: '1px solid #333',
          }}>
            <h3 style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Summary
            </h3>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#ccc' }}>
              <div>📦 ID: <span style={{ fontFamily: 'monospace' }}>{customName ? customName.toLowerCase().replace(/\s+/g, '-') : selectedId}</span></div>
              <div>🏷️ Category: <span style={{ fontFamily: 'monospace' }}>{currentChar?.category ?? 'custom'}</span></div>
              <div>📊 Difficulty: <span style={{ fontFamily: 'monospace' }}>{customDifficulty}</span></div>
              <div>🌳 BT Nodes: <span style={{ fontFamily: 'monospace' }}>{countTreeNodes(btRoot)}</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT: Behavior Tree visualization and tree editing */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#0a0a0f' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Behavior Tree — {displayName}
          </h2>

          {btRoot ? (
            <div style={{
              background: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '0.5rem',
              padding: '1rem',
              overflowX: 'auto',
            }}>
              <pre style={{
                margin: 0,
                fontSize: '0.8rem',
                lineHeight: 1.6,
                color: '#a5f3fc',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}>
                {JSON.stringify(btRoot, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#888',
              background: '#1a1a2e',
              borderRadius: '0.5rem',
              border: '1px dashed #333',
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>🎯 No behavior tree loaded</p>
              <p style={{ fontSize: '0.85rem' }}>Select a character from the dropdown to load its tree, or import a custom BT JSON.</p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button onClick={handleExportBtJson}
              disabled={!btRoot}
              style={{
                padding: '0.5rem 1rem',
                background: btRoot ? '#8b5cf6' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                cursor: btRoot ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}>
              📄 Export BT as JSON
            </button>
            <button onClick={() => {
              if (btRoot) {
                const blob = new Blob([JSON.stringify(btRoot, null, 2)], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                prompt('Copy this JSON:', JSON.stringify(btRoot, null, 2))
                URL.revokeObjectURL(url)
              }
            }}
              disabled={!btRoot}
              style={{
                padding: '0.5rem 1rem',
                background: btRoot ? '#3b82f6' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                cursor: btRoot ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}>
              📋 Copy to Clipboard
            </button>
            <Link to="/docs"
              style={{
                padding: '0.5rem 1rem',
                background: '#2a2a3a',
                color: '#ccc',
                border: '1px solid #444',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'none',
                fontWeight: 600,
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
              📖 Docs
            </Link>
          </div>

          {/* All available behaviors reference */}
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#0f0f1a', borderRadius: '0.5rem', border: '1px solid #2a2a3a' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              All Characters & Behaviors Reference
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {getAllBehaviors().map((b, i) => {
                const ch = characters.find(c => c.id === b.characterId)
                return (
                  <button key={i} onClick={() => {
                    setSelectedId(b.characterId)
                    loadCharacterBehaviorAsEdition(b)
                  }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: selectedId === b.characterId ? '#8b5cf6' : '#1a1a2e',
                      color: selectedId === b.characterId ? '#fff' : '#ccc',
                      border: '1px solid #333',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
                    {ch?.emoji ?? '🤖'} {b.characterId}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Import JSON modal */}
      {showImportDialog && (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#000000cc',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }} onClick={() => setShowImportDialog(false)}>
          <div style={{
            background: '#0f0f1a',
            border: '1px solid #333',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: 'min(500px, 90vw)',
            maxWidth: '500px',
            color: '#fff',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Import Behavior Tree JSON</h2>
            <textarea
              value={importedJson}
              onChange={e => setImportedJson(e.target.value)}
              placeholder='{"type":"selector","children":[...]}'
              style={{
                width: '100%',
                minHeight: 200,
                padding: '0.75rem',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '0.375rem',
                color: '#a5f3fc',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                resize: 'vertical',
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImportDialog(false)}
                style={{ padding: '0.5rem 1rem', background: '#666', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleImportJsonText}
                style={{ padding: '0.5rem 1rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility function to count all nodes in a tree
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
