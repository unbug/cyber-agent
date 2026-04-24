/**
 * Community Character Challenge
 *
 * Landing page for the community character creation challenge.
 * Encourages users to create and submit their own characters.
 */

import { Link } from 'react-router-dom'
import styles from './ChallengePage.module.css'

const PRIZE_TIER = [
  { rank: '🥇 Grand Prize', title: 'Grand Prize', desc: 'Your character featured on the homepage + hardware grant', amount: '$1,000' },
  { rank: '🥈 Silver', title: 'Silver Prize', desc: 'Featured in community showcase + robot kit', amount: '$500' },
  { rank: '🥉 Bronze', title: 'Bronze Prize', desc: 'Featured in community showcase + sticker pack', amount: '$200' },
]

const RULES = [
  'Create a unique character with original personality and behavior',
  'Your character must use the Behavior Tree system (no hardcoded logic)',
  'Include at least one custom condition or creative behavior pattern',
  'Submit your character as a JSON file via GitHub PR',
  'Characters must be family-friendly and follow our code of conduct',
]

const JUDGING = [
  { icon: '🎨', label: 'Creativity', desc: 'Originality of concept and personality' },
  { icon: '🧠', label: 'Behavior Depth', desc: 'Sophistication of the behavior tree design' },
  { icon: '😄', label: 'Fun Factor', desc: 'How entertaining and engaging the character is' },
  { icon: '📐', label: 'Code Quality', desc: 'Clean BT structure, efficient node usage' },
]

export function ChallengePage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>Community Challenge</div>
        <h1 className={styles.heroTitle}>
          Create a Character.
          <br />
          <span className={styles.heroAccent}>Shape the Platform.</span>
        </h1>
        <p className={styles.heroDesc}>
          Join the first CyberAgent Community Character Challenge. Design a unique virtual
          character with its own personality and behavior tree. Winners get featured
          on the platform and win hardware grants.
        </p>
        <div className={styles.heroActions}>
          <Link to="/editor/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            Start Creating →
          </Link>
          <a
            href="https://github.com/unbug/cyber-agent/issues/new?template=character-submission.md"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            Submit Character
          </a>
        </div>
      </section>

      {/* Prize Tiers */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Prizes</h2>
        <div className={styles.prizeGrid}>
          {PRIZE_TIER.map((tier) => (
            <div key={tier.rank} className={styles.prizeCard}>
              <div className={styles.prizeRank}>{tier.rank}</div>
              <div className={styles.prizeAmount}>{tier.amount}</div>
              <div className={styles.prizeDesc}>{tier.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Rules */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rules</h2>
        <ul className={styles.rulesList}>
          {RULES.map((rule, i) => (
            <li key={i} className={styles.ruleItem}>
              <span className={styles.ruleNum}>{i + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Judging Criteria */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Judging Criteria</h2>
        <div className={styles.judgingGrid}>
          {JUDGING.map((item) => (
            <div key={item.label} className={styles.judgingCard}>
              <div className={styles.judgingIcon}>{item.icon}</div>
              <div className={styles.judgingLabel}>{item.label}</div>
              <div className={styles.judgingDesc}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.steps}>
          {[
            { num: '1', title: 'Design', desc: 'Create your character in the BT Editor or from scratch' },
            { num: '2', title: 'Export', desc: 'Export your character as a JSON file' },
            { num: '3', title: 'Submit', desc: 'Open a GitHub PR with your character file' },
            { num: '4', title: 'Review', desc: 'Core team reviews and provides feedback' },
            { num: '5', title: 'Feature', desc: 'Winners get featured on the platform' },
          ].map((step) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to create?</h2>
        <p className={styles.ctaDesc}>
          Join the community and help shape the future of robot personality.
        </p>
        <Link to="/editor/new" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}>
          Start Creating Now
        </Link>
      </section>
    </div>
  )
}
