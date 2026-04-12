import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ArrowRight } from 'lucide-react'
import { characters, type Character } from '@/agents'
import styles from './Gallery.module.css'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'companion', label: 'Companions' },
  { key: 'guard', label: 'Guards' },
  { key: 'performer', label: 'Performers' },
  { key: 'explorer', label: 'Explorers' },
] as const

export function GalleryPage() {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = characters.filter((c) => {
    const matchCategory = filter === 'all' || c.category === filter
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.includes(search.toLowerCase()))
    return matchCategory && matchSearch
  })

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Character Gallery</h1>
          <p className={styles.subtitle}>
            Choose an AI personality for your robot. Each character has unique
            behavior trees that define how your robot acts, reacts, and feels.
          </p>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filters}>
            {CATEGORIES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <motion.div
          className={styles.grid}
          layout
        >
          {filtered.map((char) => (
            <CharacterCard key={char.id} character={char} />
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>
              No characters match your search.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function CharacterCard({ character }: { character: Character }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <Link to={`/agent/${character.id}`} className={styles.card}>
        <div className={styles.cardEmoji}>{character.emoji}</div>
        <div className={styles.cardBody}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{character.name}</h3>
            <span className={styles.cardDifficulty} data-level={character.difficulty}>
              {character.difficulty}
            </span>
          </div>
          <p className={styles.cardDesc}>{character.description}</p>
          <div className={styles.cardFooter}>
            <div className={styles.cardTags}>
              {character.tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
