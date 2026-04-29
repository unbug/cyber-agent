import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Github, Package, Star, Search, ArrowRight, ExternalLink } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { characters, getCompatibleAdapters } from '@/agents'
import { downloadCharacter } from '@/utils/downloadCharacter'
import { useI18n } from '@/i18n'
import styles from './MarketplacePage.module.css'

// ── Hand-picked featured characters ──────────────────────────────
const FEATURED_IDS = ['lion', 'dragon', 'octopus', 'phoenix', 'owl']

// ── Category packs ────────────────────────────────────────────────
const CATEGORY_PACKS = [
  { key: 'companion', emoji: '🐾', robots: ['mBot', 'RoboMaster'] },
  { key: 'guard',     emoji: '🛡️', robots: ['RoboMaster EP'] },
  { key: 'performer', emoji: '🎭', robots: ['mBot', 'RoboMaster'] },
  { key: 'explorer',  emoji: '🧭', robots: ['RoboMaster EP', 'Any'] },
] as const

const PACK_NAMES: Record<string, string> = {
  companion: 'Companion Pack',
  guard: 'Guard Pack',
  performer: 'Performer Pack',
  explorer: 'Explorer Pack',
}

const CATEGORY_LABELS: Record<string, string> = {
  companion: 'Companion',
  guard: 'Guard',
  performer: 'Performer',
  explorer: 'Explorer',
}

const EMOJI_MAP: Record<string, string> = {
  'loyal-dog': '🐕', 'curious-cat': '🐈', 'guard-dino': '🦖', 'dance-bot': '🤖',
  'zen-turtle': '🐢', 'scout-eagle': '🦅', 'robot-helper': '🤖', 'ws-demo': '🤖',
  'unitree-loyal-dog': '🤖', 'unitree-scout': '🦅', 'unitree-guardian': '🛡️',
  'puppy': '🐶', 'old-dog': '🐕', 'squirrel-hunter': '🦫', 'beach-cruiser': '🏄',
  'courier-bot': '📦', 'gardener-bot': '🌱', 'security-drone': '🚁',
  'playground-buddy': '🎠', 'fox': '🦊', 'parrot': '🦜', 'panda': '🐼',
  'tiger': '🐯', 'jellyfish': '🪼', 'dragon': '🐉', 'rabbit': '🐰', 'wolf': '🐺',
  'butterfly': '🦋', 'koala': '🐨', 'owl': '🦉', 'cobra': '🐍', 'shark': '🦈',
  'hummingbird': '🐦', 'scorpion': '🦂', 'peacock': '🦚', 'firefly': '✨',
  'elephant': '🐘', 'phoenix': '🔥', 'penguin': '🐧', 'bee': '🐝',
  'hedgehog': '🦔', 'flamingo': '🦩', 'octopus': '🐙', 'tapir': '🦓',
  'crab': '🦀', 'chameleon': '🦎', 'jaguar': '🐆', 'dolphin': '🐬',
  'mantis': '🦗', 'cicada': '🪲', 'gecko': '🦎', 'lion': '🦁',
  'mandrill': '🐵', 'seahorse': '🐴', 'spider': '🕷️', 'whale': '🐋',
  'rhino': '🦏', 'heron': '🦢', 'otter': '🦦', 'crane': '🦢', 'gorilla': '🦍',
  'manta': '🪼', 'eagle': '🦅', 'sloth': '🦥', 'narwhal': '🦄', 'cricket': '🦗',
  'bat': '🦇', 'night-watch': '🦉',
}

// ── Page ──────────────────────────────────────────────────────────
export function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const { t } = useI18n()

  const featured = FEATURED_IDS.map(id => characters.find(c => c.id === id)).filter(Boolean) as typeof characters

  const filtered = useMemo(() => {
    return characters.filter((c) => {
      const matchCat = activeCategory === 'all' || c.category === activeCategory
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [search, activeCategory])

  const handleDownload = (char: (typeof characters)[0]) => downloadCharacter(char)

  const handleDownloadPack = (category: string) => {
    const pack = characters.filter(c => c.category === category)
    pack.forEach(c => downloadCharacter(c))
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Header ─────────────────────────────────── */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className={styles.title}>{t('marketplace.title')}</h1>
          <p className={styles.subtitle}>{t('marketplace.subtitle')}</p>
        </motion.div>

        {/* ── Featured Picks ──────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <Star size={14} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>{t('marketplace.featured')}</h2>
          </div>
          <div className={styles.featuredGrid}>
            {featured.map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <HoverBeam size="md" colorVariant="colorful" strength={0.55}>
                  <div className={styles.featuredCard} data-category={char.category}>
                    <span className={styles.featuredEmoji}>{EMOJI_MAP[char.id] || char.emoji}</span>
                    <div className={styles.featuredInfo}>
                      <h3 className={styles.featuredName}>{char.name}</h3>
                      <p className={styles.featuredDesc}>{char.description}</p>
                      <div className={styles.featuredRobots}>
                        {getCompatibleAdapters(char).map(a => (
                          <span key={a.id} className={styles.robotChip} title={a.label}>
                            {a.emoji} {a.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.featuredActions}>
                      <button className={styles.btnDownload} onClick={() => handleDownload(char)}>
                        <Download size={13} />
                        <span>{t('marketplace.download')}</span>
                      </button>
                      <Link to={`/agent/${char.id}`} className={styles.btnView}>
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                </HoverBeam>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Category Packs ───────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <Package size={14} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>{t('marketplace.packs')}</h2>
            <span className={styles.sectionHint}>{t('marketplace.packs_hint')}</span>
          </div>
          <div className={styles.packsGrid}>
            {CATEGORY_PACKS.map(({ key, emoji, robots }) => {
              const count = characters.filter(c => c.category === key).length
              return (
                <motion.div
                  key={key}
                  className={styles.pack}
                  data-cat={key}
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                >
                  <span className={styles.packEmoji}>{emoji}</span>
                  <div className={styles.packInfo}>
                    <h3 className={styles.packName}>{PACK_NAMES[key]}</h3>
                    <div className={styles.packMeta}>
                      <span className={styles.packCount}>{count} characters</span>
                      <span className={styles.packDot}>·</span>
                      <span className={styles.packRobots}>{robots.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    className={styles.packDownload}
                    onClick={() => handleDownloadPack(key)}
                    title={`Download all ${PACK_NAMES[key]} JSON files`}
                  >
                    <Download size={14} />
                    <span>{t('marketplace.download_pack')}</span>
                  </button>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ── All Characters ────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {t('marketplace.all_characters')}
              <span className={styles.count}>{filtered.length}</span>
            </h2>
          </div>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={t('marketplace.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.catFilters}>
              {(['all', 'companion', 'guard', 'performer', 'explorer'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterActive : ''}`}
                >
                  {cat === 'all' ? t('marketplace.all') : CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className={styles.list}>
            {filtered.map((char) => (
              <CharRow key={char.id} character={char} onDownload={handleDownload} />
            ))}
            {filtered.length === 0 && (
              <div className={styles.empty}>{t('marketplace.no_results')}</div>
            )}
          </div>
        </section>

        {/* ── Submit / Contribute ───────────────────────── */}
        <div className={styles.submitSection}>
          <h2 className={styles.submitTitle}>{t('marketplace.submit_title')}</h2>
          <p className={styles.submitDesc}>{t('marketplace.submit_desc')}</p>
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
          <div className={styles.submitActions}>
            <a
              href="https://github.com/unbug/cyber-agent/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.submitCTA}
            >
              <Github size={16} />
              <span>{t('marketplace.submit_cta')}</span>
            </a>
            <Link to="/editor/create" className={styles.submitEditor}>
              {t('marketplace.create_in_editor')}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Character row (compact list) ──────────────────────────────────
function CharRow({
  character,
  onDownload,
}: {
  character: (typeof characters)[0]
  onDownload: (char: (typeof characters)[0]) => void
}) {
  const emoji = EMOJI_MAP[character.id] || character.emoji
  const adapters = getCompatibleAdapters(character)

  return (
    <div className={styles.row} data-category={character.category}>
      <span className={styles.rowEmoji}>{emoji}</span>
      <div className={styles.rowMain}>
        <span className={styles.rowName}>{character.name}</span>
        <span className={styles.rowCat} data-cat={character.category}>
          {CATEGORY_LABELS[character.category]}
        </span>
      </div>
      <div className={styles.rowRobots}>
        {adapters.map(a => (
          <span key={a.id} className={styles.robotChip} title={a.label}>
            {a.emoji} {a.label}
          </span>
        ))}
      </div>
      <span className={styles.rowDiff} data-level={character.difficulty}>{character.difficulty}</span>
      <div className={styles.rowActions}>
        <button className={styles.rowDownload} onClick={() => onDownload(character)} title="Download JSON">
          <Download size={13} />
        </button>
        <Link to={`/agent/${character.id}`} className={styles.rowView} title="View character">
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
