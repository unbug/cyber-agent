import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, Cpu, Wifi, Sparkles, ArrowUpRight } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { characters } from '@/agents'
import { useI18n } from '@/i18n'
import styles from './Home.module.css'

const FEATURES = [
  {
    icon: Bot,
    labelKey: 'home.feature_agents_title',
    descKey: 'home.feature_agents_desc',
  },
  {
    icon: Cpu,
    labelKey: 'home.feature_robot_title',
    descKey: 'home.feature_robot_desc',
  },
  {
    icon: Wifi,
    labelKey: 'home.feature_evolve_title',
    descKey: 'home.feature_evolve_desc',
  },
  {
    icon: Sparkles,
    labelKey: 'nav.docs',
    descKey: 'home.feature_evolve_desc',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function HomePage() {
  const { t } = useI18n()

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className={styles.badge}>
            <Sparkles size={14} />
            <span>Open Source — MIT License</span>
          </div>

          <h1 className={styles.heroTitle}>
            {t('home.hero_title')}
          </h1>

          <p className={styles.heroDesc}>
            {t('home.hero_subtitle')}
          </p>

          <div className={styles.heroCTA}>
            <Link to="/gallery" className={styles.btnPrimary}>
              <span>{t('home.hero_cta')}</span>
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com/unbug/cyber-agent"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              View on GitHub
            </a>
          </div>
        </motion.div>

        {/* Animated glow background */}
        <div className={styles.heroGlow} />
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <motion.div
            className={styles.featuresGrid}
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {FEATURES.map((f) => (
              <motion.div key={f.labelKey} variants={item}>
                <HoverBeam size="md" colorVariant="ocean" strength={0.5}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>
                      <f.icon size={22} />
                    </div>
                    <h3 className={styles.featureTitle}>{t(f.labelKey)}</h3>
                    <p className={styles.featureDesc}>{t(f.descKey)}</p>
                  </div>
                </HoverBeam>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('home.how_it_works_title')}</h2>
          <div className={styles.steps}>
            {[
              { num: '01', titleKey: 'home.step_1_title', descKey: 'home.step_1_desc' },
              { num: '02', titleKey: 'home.step_2_title', descKey: 'home.step_2_desc' },
              { num: '03', titleKey: 'home.step_3_title', descKey: 'home.step_3_desc' },
            ].map((step) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: parseInt(step.num) * 0.1 }}
              >
                <HoverBeam size="sm" colorVariant="mono" strength={0.3}>
                  <div className={styles.step}>
                    <span className={styles.stepNum}>{step.num}</span>
                    <h3 className={styles.stepTitle}>{t(step.titleKey)}</h3>
                    <p className={styles.stepDesc}>{t(step.descKey)}</p>
                  </div>
                </HoverBeam>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Characters */}
      <section className={styles.featuredSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('home.agents_title')}</h2>
          <p className={styles.sectionSub}>
            {t('home.agents_subtitle')}
          </p>
          <div className={styles.featuredGrid}>
            {characters.slice(0, 12).map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <HoverBeam size="sm" colorVariant="colorful" strength={0.55}>
                  <Link to={`/agent/${char.id}`} className={styles.featuredCard} data-category={char.category}>
                    <span className={styles.featuredEmoji}>{char.emoji}</span>
                    <div>
                      <span className={styles.featuredName}>{char.name}</span>
                      <span className={styles.featuredCat}>{char.category}</span>
                    </div>
                    <ArrowUpRight size={14} className={styles.featuredArrow} />
                  </Link>
                </HoverBeam>
              </motion.div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <Link to="/gallery" className={styles.btnSecondary}>
              <span>{t('home.all_agents')}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <HoverBeam size="md" colorVariant="colorful" strength={0.7}>
              <div className={styles.ctaCard}>
                <h2 className={styles.ctaTitle}>{t('home.cta_title')}</h2>
                <p className={styles.ctaDesc}>
                  {t('home.cta_desc')}
                </p>
                <Link to="/gallery" className={styles.btnPrimary}>
                  <span>{t('home.cta_button')}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </HoverBeam>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
