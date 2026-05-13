/**
 * PlaygroundPalette — sidebar showing available characters to drag into the playground.
 *
 * Each character card is draggable; dropping onto the canvas creates an agent.
 */

import { useState } from 'react'
import { characters, type Character } from '@/agents'
import { HoverBeam } from '@/components/HoverBeam'
import styles from './PlaygroundPalette.module.css'

// ─── Emoji map for palette ─────────────────────────────────────

const EMOJI_MAP: Record<string, string> = {
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
  'fox': '🦊',
  'parrot': '🦜',
  'panda': '🐼',
  'tiger': '🐯',
  'jellyfish': '🪼',
  'dragon': '🐉',
  'rabbit': '🐰',
  'wolf': '🐺',
  'butterfly': '🦋',
  'koala': '🐨',
  'owl': '🦉',
  'cobra': '🐍',
  'shark': '🦈',
  'hummingbird': '🐦',
  'scorpion': '🦂',
  'peacock': '🦚',
  'firefly': '✨',
  'elephant': '🐘',
  'phoenix': '🔥',
  'penguin': '🐧',
  'bee': '🐝',
  'hedgehog': '🦔',
  'flamingo': '🦩',
  'octopus': '🐙',
  'tapir': '🦓',
  'crab': '🦀',
  'chameleon': '🦎',
  'jaguar': '🐆',
  'dolphin': '🐬',
  'mantis': '🦗',
  'lion': '🦁',
  'cicada': '🪲',
  'seahorse': '🐴',
  'gecko': '🦎',
  'mandrill': '🐵',
  'spider': '🕷️',
  'whale': '🐋',
  'rhino': '🦏',
  'heron': '🦢',
  'otter': '🦦',
  'crane': '🦢',
  'gorilla': '🦍',
  'manta': '🪼',
  'eagle': '🦅',
  'sloth': '🦥',
  'narwhal': '🦄',
  'cricket': '🦗',
  'bat': '🦇',
  'shy-cat': '🙀',
  'playful-dog': '🐕',
  'guardian-bot': '🛡️',
  'musician-bot': '🎵',
  'curious-bird': '🐦',
}

interface PlaygroundPaletteProps {
  /** Called when a character is dragged from the palette */
  onDragStart: (character: Character) => void
  /** Currently placed characters (to prevent duplicates) */
  placedIds: Set<string>
}

export function PlaygroundPalette({ onDragStart, placedIds }: PlaygroundPaletteProps) {
  const [filter, setFilter] = useState<string>('all')

  const categories = ['all', 'companion', 'guard', 'performer', 'explorer'] as const
  const categoryLabels: Record<string, string> = {
    all: 'All',
    companion: 'Companions',
    guard: 'Guards',
    performer: 'Performers',
    explorer: 'Explorers',
  }

  const filtered = filter === 'all'
    ? characters
    : characters.filter((c) => c.category === filter)

  return (
    <div className={styles.palette}>
      {/* Category filter */}
      <div className={styles.filterRow}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
            onClick={() => setFilter(cat)}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Character cards */}
      <div className={styles.grid}>
        {filtered.map((char) => {
          const placed = placedIds.has(char.id)
          return (
            <HoverBeam
              key={char.id}
              size="sm"
              colorVariant={placed ? 'mono' : 'colorful'}
              strength={placed ? 0.15 : 0.45}
            >
              <div
                className={`${styles.card} ${placed ? styles.placed : ''}`}
                draggable={!placed}
                onDragStart={(e) => {
                  if (placed) {
                    e.preventDefault()
                    return
                  }
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData(
                    'application/character-id',
                    char.id,
                  )
                  onDragStart(char)
                }}
                title={placed ? 'Already placed' : `Drag "${char.name}" to playground`}
              >
                <span className={styles.cardEmoji}>{EMOJI_MAP[char.id] ?? char.emoji}</span>
                <span className={styles.cardName}>{char.name}</span>
                {placed && <span className={styles.placedBadge}>✓</span>}
              </div>
            </HoverBeam>
          )
        })}
      </div>
    </div>
  )
}
