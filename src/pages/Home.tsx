import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Github } from 'lucide-react'
import { characters } from '@/agents'
import { useI18n } from '@/i18n'
import styles from './Home.module.css'

const half = Math.ceil(characters.length / 2)
const row1 = characters.slice(0, half)
const row2 = characters.slice(half)

const BT_CODE = `// lion/behavior.ts
export const behavior = {
  characterId: 'lion',
  tree: sel('Root',
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    seq('Charge at pointer',
      cond('pointerNearby', { radius: 150 }),
      act('setEmotion', { emotion: 'alert' }),
      act('erraticMove', { target: 'pointer' }),
    ),
    act('patrol', { speed: 2.5 }),
  ),
}`

export function HomePage() {
  const { t } = useI18n()

  return (
    <div className={styles.page}>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className={styles.eyebrow}>Open source · MIT License</p>
          <h1 className={styles.heroTitle}>{t('home.hero_title')}</h1>
          <p className={styles.heroDesc}>{t('home.hero_subtitle')}</p>

          <div className={styles.heroCTA}>
            <Link to="/gallery" className={styles.btnPrimary}>
              {t('home.hero_cta')} <ArrowRight size={15} />
            </Link>
            <a
              href="https://github.com/unbug/cyber-agent"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnGhost}
            >
              <Github size={15} />
              <span>GitHub</span>
            </a>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{characters.length}</span>
              <span className={styles.statLabel}>{t('home.stat_agents')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>4</span>
              <span className={styles.statLabel}>{t('home.stat_adapters')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>BT</span>
              <span className={styles.statLabel}>{t('home.stat_bt')}</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Character Ticker ────────────────────────────── */}
      <div className={styles.ticker}>
        <div className={styles.tickerFadeL} />
        <div className={styles.tickerRow}>
          <div className={styles.track} style={{ '--dur': '55s' } as React.CSSProperties}>
            {[...row1, ...row1].map((c, i) => (
              <Link key={i} to={`/agent/${c.id}`} className={styles.chip}>
                <span className={styles.chipEmoji}>{c.emoji}</span>
                <span className={styles.chipName}>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.tickerRow}>
          <div className={`${styles.track} ${styles.trackR}`} style={{ '--dur': '65s' } as React.CSSProperties}>
            {[...row2, ...row2].map((c, i) => (
              <Link key={i} to={`/agent/${c.id}`} className={styles.chip}>
                <span className={styles.chipEmoji}>{c.emoji}</span>
                <span className={styles.chipName}>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.tickerFadeR} />
      </div>

      {/* ── Architecture: Character → BT → Robot ─────── */}
      <section className={styles.arch}>
        <div className="container">
          <div className={styles.archFlow}>
            <motion.div
              className={styles.archBlock}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.archEmoji}>🎭</div>
              <h3 className={styles.archTitle}>{t('home.arch_char_title')}</h3>
              <p className={styles.archDesc}>{t('home.arch_char_desc')}</p>
            </motion.div>

            <div className={styles.archArrow} aria-hidden>→</div>

            <motion.div
              className={styles.archBlock}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className={styles.archEmoji}>🌳</div>
              <h3 className={styles.archTitle}>{t('home.arch_bt_title')}</h3>
              <p className={styles.archDesc}>{t('home.arch_bt_desc')}</p>
            </motion.div>

            <div className={styles.archArrow} aria-hidden>→</div>

            <motion.div
              className={styles.archBlock}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className={styles.archEmoji}>🤖</div>
              <h3 className={styles.archTitle}>{t('home.arch_robot_title')}</h3>
              <p className={styles.archDesc}>{t('home.arch_robot_desc')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Code Snippet ────────────────────────────────── */}
      <section className={styles.codeSection}>
        <div className="container">
          <div className={styles.codeSplit}>
            <div className={styles.codeText}>
              <h2 className={styles.codeTitle}>{t('home.code_title')}</h2>
              <p className={styles.codeDesc}>{t('home.code_desc')}</p>
              <div className={styles.codeActions}>
                <Link to="/editor/create" className={styles.btnPrimary}>
                  {t('home.open_editor')} <ArrowRight size={15} />
                </Link>
                <Link to="/docs" className={styles.btnGhost}>{t('home.read_docs')}</Link>
              </div>
            </div>
            <pre className={styles.codeBlock}><code>{BT_CODE}</code></pre>
          </div>
        </div>
      </section>

    </div>
  )
}

