import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Download, Heart, Github, ArrowRight } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { characters } from '@/agents'
import { downloadCharacter } from '@/utils/downloadCharacter'
import { useI18n } from '@/i18n'
import styles from './MarketplacePage.module.css'

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
}

const CATEGORY_LABELS: Record<string, string> = {
  companion: 'Companion',
  guard: 'Guard',
  performer: 'Performer',
  explorer: 'Explorer',
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'companion', label: 'Companions' },
  { key: 'guard', label: 'Guards' },
  { key: 'performer', label: 'Performers' },
  { key: 'explorer', label: 'Explorers' },
] as const

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
] as const

export function MarketplacePage() {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string>('default')
  const { t } = useI18n()

  const filtered = useMemo(() => {
    let list = characters.filter((c) => {
      const matchCategory = filter === 'all' || c.category === filter
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
      return matchCategory && matchSearch
    })

    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'category') {
      list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    }

    return list
  }, [filter, search, sortBy])

  const handleDownload = (character: (typeof characters)[0]) => {
    downloadCharacter(character)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBadge}>
            <Heart size={14} />
            <span>Marketplace</span>
          </div>
          <h1 className={styles.heroTitle}>{t('marketplace.title')}</h1>
          <p className={styles.heroSubtitle}>
            {t('marketplace.subtitle')}
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{characters.length}</div>
              <div className={styles.statLabel}>{t('marketplace.total_chars')}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{new Set(characters.map((c) => c.category)).size}</div>
              <div className={styles.statLabel}>{t('marketplace.categories')}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>∞</div>
              <div className={styles.statLabel}>{t('marketplace.possibilities')}</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchShell}>
            <HoverBeam size="line" colorVariant="ocean" strength={0.55}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={t('marketplace.search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </HoverBeam>
          </div>

          <div className={styles.filters}>
            {CATEGORIES.map(({ key, label }) => (
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
                  {label}
                </button>
              </HoverBeam>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.sortSelect}
            aria-label="Sort characters"
          >
            {SORT_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <motion.div className={styles.grid} layout>
          {filtered.map((char) => (
            <MarketplaceCard key={char.id} character={char} onDownload={handleDownload} />
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>
              {t('marketplace.no_results')}
            </div>
          )}
        </motion.div>

        {/* Submit Section */}
        <div className={styles.submitSection}>
          <h2 className={styles.submitTitle}>{t('marketplace.submit_title')}</h2>
          <p className={styles.submitDesc}>
            {t('marketplace.submit_desc')}
          </p>
          <div className={styles.submitSteps}>
            <div className={styles.submitStep}>
              <div className={styles.stepNumber}>1</div>
              <span className={styles.stepLabel}>{t('marketplace.submit_step1')}</span>
            </div>
            <div className={styles.submitStep}>
              <div className={styles.stepNumber}>2</div>
              <span className={styles.stepLabel}>{t('marketplace.submit_step2')}</span>
            </div>
            <div className={styles.submitStep}>
              <div className={styles.stepNumber}>3</div>
              <span className={styles.stepLabel}>{t('marketplace.submit_step3')}</span>
            </div>
          </div>
          <a
            href="https://github.com/unbug/cyber-agent/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.submitCTA}
          >
            <Github size={18} />
            <span>{t('marketplace.submit_cta')}</span>
          </a>
        </div>
      </div>
    </div>
  )
}

function MarketplaceCard({
  character,
  onDownload,
}: {
  character: (typeof characters)[0]
  onDownload: (char: (typeof characters)[0]) => void
}) {
  const emoji = EMOJI_MAP[character.id] || character.emoji

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className={styles.card}
        data-category={character.category}
      >
        <div className={styles.cardEmoji}>{emoji}</div>
        <div className={styles.cardBody}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{character.name}</h3>
            <span className={styles.cardCategory} data-cat={character.category}>
              {CATEGORY_LABELS[character.category]}
            </span>
          </div>
          <p className={styles.cardDesc}>{character.description}</p>
          <div className={styles.cardTags}>
            {character.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
            <span className={styles.tag}>{character.difficulty}</span>
          </div>
          <div className={styles.cardActions}>
            <button
              className={styles.downloadBtn}
              onClick={() => onDownload(character)}
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <Link to={`/agent/${character.id}`} className={styles.viewBtn}>
              <span>View</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
