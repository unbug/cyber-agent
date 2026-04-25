import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ArrowRight, FileCode, Plus, Shuffle } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { characters, type Character } from '@/agents'
import { useI18n } from '@/i18n'
import styles from './Gallery.module.css'

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
  'cicada': '🪲',
  'gecko': '🦎',
  'lion': '🦁',
  'mandrill': '🐵',
  'seahorse': '🐴',
  'spider': '🕷️',
  'whale': '🐋',
  'rhino': '🦏',
  'heron': '🦢',
  'otter': '🦦',
}

const CATEGORIES = [
  { key: 'all', labelKey: 'gallery.all' },
  { key: 'companion', labelKey: 'gallery.companions' },
  { key: 'guard', labelKey: 'gallery.guards' },
  { key: 'performer', labelKey: 'gallery.performers' },
  { key: 'explorer', labelKey: 'gallery.explorers' },
] as const

export function GalleryPage() {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [shuffled, setShuffled] = useState(false)
  const { t } = useI18n()

  const toggleShuffle = () => {
    setShuffled((s) => !s)
  }

  const getFiltered = () => {
    let list = characters.filter((c) => {
      const matchCategory = filter === 'all' || c.category === filter
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.includes(search.toLowerCase()))
      return matchCategory && matchSearch
    })
    if (shuffled) {
      list = [...list].sort(() => Math.random() - 0.5)
    }
    return list
  }

  const filtered = getFiltered()

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>
              {t('gallery.title')}
              <span className={styles.count}>{characters.length}</span>
            </h1>
            <Link to="/editor/new" className={styles.createBtn}>
              <Plus size={16} />
              <span>{t('gallery.create_new')}</span>
            </Link>
          </div>
          <p className={styles.subtitle}>
            {t('gallery.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.searchShell}>
            <HoverBeam size="line" colorVariant="ocean" strength={0.55}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={t('gallery.search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </HoverBeam>
          </div>
          <div className={styles.filters}>
            {CATEGORIES.map(({ key, labelKey }) => (
              <HoverBeam
                key={key}
                size="line"
                colorVariant={filter === key ? 'sunset' : 'mono'}
                strength={filter === key ? 0.75 : 0.35}
              >
                <button
                  onClick={() => setFilter(key)}
                  className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ''}`}
                >
                  {t(labelKey)}
                </button>
              </HoverBeam>
            ))}
            <HoverBeam
              size="line"
              colorVariant={shuffled ? 'sunset' : 'mono'}
              strength={shuffled ? 0.75 : 0.35}
            >
              <button
                onClick={toggleShuffle}
                className={`${styles.filterBtn} ${shuffled ? styles.filterActive : ''}`}
                title="Shuffle characters"
              >
                <Shuffle size={14} />
              </button>
            </HoverBeam>
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
              {t('gallery.no_results')}
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
      <div className={styles.cardRow}>
        <div className={styles.cardMain}>
          <HoverBeam size="md" colorVariant="colorful" strength={0.62}>
            <Link to={`/agent/${character.id}`} className={styles.card} data-category={character.category}>
              <div className={styles.cardEmoji}>{EMOJI_MAP[character.id] || character.emoji}</div>
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
          </HoverBeam>
        </div>
        <HoverBeam size="sm" colorVariant="sunset" strength={0.8}>
          <Link to={`/agent/${character.id}/editor`} className={styles.editorButton} title="Edit in BT Editor">
            <FileCode size={16} />
          </Link>
        </HoverBeam>
      </div>
    </motion.div>
  )
}
