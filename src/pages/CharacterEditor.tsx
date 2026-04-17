import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { characters } from '../agents'
import type { BTEditionNode } from '../engine/types'

const emojiMap: Record<string, string> = {
  'loyal-dog': '🐕',
  'curious-cat': '🐈',
  'guard-dino': '🦖',
  'dance-bot': '🤖',
  'zen-turtle': '🐢',
  'scout-eagle': '🦅',
  'robot-helper': '🤖',
  'ws-demo': '🤖',
  'unitree-loyal-dog': '🤖',
  'unitree-scout': '🦅',
  'unitree-guardian': '🛡️',
  'puppy': '🐶',
  'old-dog': '🐕',
  'squirrel-hunter': '🦫',
  'beach-cruiser': '🏄',
  'courier-bot': '📦',
  'gardener-bot': '🌱',
  'security-drone': '🚁',
  'playground-buddy': '🎠',
}

export default function CharacterEditor() {
  const [selectedId, setSelectedId] = useState<string>('loyal-dog')
  const [customBT, setCustomBT] = useState<BTEditionNode | null>(null)
  const [customName, setCustomName] = useState<string>('Custom Character')
  const [customDescription, setCustomDescription] = useState<string>('')
  const [customTags, setCustomTags] = useState<string[]>(['custom'])
  const [customDifficulty, setCustomDifficulty] = useState<string>('medium')

  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()

  let currentName = customName
  let currentEmoji = emojiMap[selectedId] || '🤖'

  if (agentId && !customBT) {
    const char = characters.find(c => c.id === agentId)
    if (char) {
      currentName = char.name
      currentEmoji = char.emoji
      setSelectedId(agentId)
    }
  } else {
    const char = characters.find(c => c.id === selectedId)
    if (char) {
      currentName = char.name
      currentEmoji = char.emoji
    }
  }

  const handleExport = () => {
    const exportData = {
      name: customName || currentName,
      emoji: currentEmoji,
      difficulty: customDifficulty,
      description: customDescription,
      tags: [...customTags],
      behaviorTree: customBT,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(customName || currentName).toLowerCase().replace(/\s+/g, '-')}-behavior-tree.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = event => {
          try {
            const data: any = JSON.parse(event.target?.result as string)
            if (data.behaviorTree) {
              setCustomBT(data.behaviorTree)
              if (data.name) setCustomName(data.name)
              if (data.description) setCustomDescription(data.description)
              if (data.tags) setCustomTags(data.tags)
              if (data.difficulty) setCustomDifficulty(data.difficulty)
            }
          } catch (error) {
            console.error('Failed to import character:', error)
            alert('Failed to import character file')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleBack = () => {
    navigate('/gallery')
  }

  const handleLoadFromGallery = (charId: string) => {
    setSelectedId(charId)
    const char = characters.find(c => c.id === charId)
    if (char) {
      setCustomBT(null)
      setCustomName(char.name)
      setCustomDescription(char.description)
      setCustomTags([...char.tags])
      setCustomDifficulty(char.difficulty || 'medium')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <header style={{ padding: '1.5rem 2rem', backgroundColor: '#0f0f1a', borderBottom: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Character Editor</h1>
            <span style={{ fontSize: '2rem' }}>{currentEmoji}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={selectedId}
            onChange={e => handleLoadFromGallery(e.target.value)}
            style={{ padding: '0.75rem', backgroundColor: '#0f0f1a', color: '#fff', border: '1px solid #333', borderRadius: '0.375rem', fontSize: '1rem', cursor: 'pointer', minHeight: '40px' }}
          >
            {characters.map(char => (
              <option key={char.id} value={char.id}>
                {char.emoji} {char.name}
              </option>
            ))}
          </select>
          <button onClick={handleImport} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
            📂 Import
          </button>
        </div>
      </header>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 80px)', overflow: 'auto' }}>
        <div style={{ backgroundColor: '#1a1a2e', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Character Name</div>
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            style={{ padding: '0.75rem', width: '100%', backgroundColor: '#0f0f1a', border: '1px solid #333', borderRadius: '0.25rem', color: '#fff' }}
          />
        </div>

        <div style={{ backgroundColor: '#1a1a2e', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Description</div>
          <textarea
            value={customDescription}
            onChange={e => setCustomDescription(e.target.value)}
            style={{ padding: '0.75rem', width: '100%', minHeight: '60px', backgroundColor: '#0f0f1a', border: '1px solid #333', borderRadius: '0.25rem', color: '#fff', resize: 'vertical' }}
          />
        </div>

        <div style={{ backgroundColor: '#1a1a2e', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Tags</div>
          <input
            value={customTags.join(', ')}
            onChange={e => setCustomTags(e.target.value.split(',').map(t => t.trim()))}
            placeholder="tag1, tag2, tag3"
            style={{ padding: '0.75rem', width: '100%', backgroundColor: '#0f0f1a', border: '1px solid #333', borderRadius: '0.25rem', color: '#fff' }}
          />
        </div>

        <div style={{ backgroundColor: '#1a1a2e', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Difficulty</div>
          <select
            value={customDifficulty}
            onChange={e => setCustomDifficulty(e.target.value)}
            style={{ padding: '0.75rem', width: '100%', backgroundColor: '#0f0f1a', border: '1px solid #333', borderRadius: '0.25rem', color: '#fff' }}
          >
            <option value="easy">Easy ★</option>
            <option value="medium">Medium ★★</option>
            <option value="hard">Hard ★★★</option>
          </select>
        </div>

        {customBT ? (
          <div style={{ backgroundColor: '#1a1a2e', padding: '1rem', borderRadius: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={handleExport} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              💾 Export as JSON
            </button>
            <span style={{ color: '#888', flex: 1 }}>Save your custom behavior tree for reuse.</span>
          </div>
        ) : (
          <p style={{ color: '#888', textAlign: 'center', padding: '3rem' }}>
            🎨 No custom tree yet. Load a character or import a custom behavior tree.
          </p>
        )}
      </div>
    </div>
  )
}
