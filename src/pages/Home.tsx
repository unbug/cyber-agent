import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, Cpu, Wifi, Sparkles, ArrowUpRight } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { characters } from '@/agents'
import styles from './Home.module.css'

const FEATURES = [
  {
    icon: Bot,
    title: 'Character Gallery',
    desc: 'Unique AI personalities — dogs, cats, dinosaurs, and more. Each with its own behavior tree that defines how it acts and reacts.',
  },
  {
    icon: Cpu,
    title: 'Live Behavior Trees',
    desc: 'Real decision-making in your browser. Watch characters wander, follow your cursor, rest, and react — all driven by a behavior tree engine.',
  },
  {
    icon: Wifi,
    title: 'Extensible Adapters',
    desc: 'Open adapter architecture. Built-in Canvas renderer, with a plugin interface ready for WebSocket, BLE, and serial robot connections.',
  },
  {
    icon: Sparkles,
    title: 'Open Source',
    desc: 'MIT licensed. Fork characters, create your own behavior trees, build custom robot adapters. The platform grows with the community.',
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
            Give your robot {' '}
            <span className={styles.heroAccent}>a soul</span>
          </h1>

          <p className={styles.heroDesc}>
            Pick a virtual AI character. Connect your robot.
            Watch it come alive at home — with personality,
            emotions, and intelligence.
          </p>

          <div className={styles.heroCTA}>
            <Link to="/gallery" className={styles.btnPrimary}>
              <span>Explore Characters</span>
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
              <motion.div key={f.title} variants={item}>
                <HoverBeam size="md" colorVariant="ocean" strength={0.5}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>
                      <f.icon size={22} />
                    </div>
                    <h3 className={styles.featureTitle}>{f.title}</h3>
                    <p className={styles.featureDesc}>{f.desc}</p>
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
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.steps}>
            {[
              { num: '01', title: 'Pick a character', desc: 'Browse the gallery and choose an AI personality for your robot.' },
              { num: '02', title: 'Connect your robot', desc: 'Pair via Wi-Fi, BLE, or USB. Auto-detects supported hardware.' },
              { num: '03', title: 'Watch it come alive', desc: 'The behavior tree takes over — your robot acts, reacts, and feels.' },
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
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDesc}>{step.desc}</p>
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
          <h2 className={styles.sectionTitle}>Meet {characters.length} Characters</h2>
          <p className={styles.sectionSub}>
            From loyal companions to fierce guards — each with unique behavior trees.
          </p>
          <div className={styles.featuredGrid}>
            {characters.slice(0, 8).map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <HoverBeam size="sm" colorVariant="colorful" strength={0.55}>
                  <Link to={`/agent/${char.id}`} className={styles.featuredCard}>
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
              <span>View All Characters</span>
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
                <h2 className={styles.ctaTitle}>Ready to bring your robot to life?</h2>
                <p className={styles.ctaDesc}>
                  Start with our free character gallery. No account needed.
                </p>
                <Link to="/gallery" className={styles.btnPrimary}>
                  <span>Get Started</span>
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
