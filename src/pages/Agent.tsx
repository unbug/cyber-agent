import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Wifi, WifiOff, Play, Square, Cpu } from 'lucide-react'
import { getCharacter } from '@/data/characters'
import styles from './Agent.module.css'

export function AgentPage() {
  const { id } = useParams<{ id: string }>()
  const character = id ? getCharacter(id) : undefined

  if (!character) {
    return (
      <div className={styles.notFound}>
        <h2>Character not found</h2>
        <Link to="/gallery">← Back to Gallery</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Back nav */}
        <Link to="/gallery" className={styles.back}>
          <ArrowLeft size={16} />
          <span>Gallery</span>
        </Link>

        <div className={styles.layout}>
          {/* Left: Character info */}
          <motion.div
            className={styles.info}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.avatar}>{character.emoji}</div>
            <h1 className={styles.name}>{character.name}</h1>
            <span className={styles.category}>{character.category}</span>
            <p className={styles.desc}>{character.description}</p>

            <div className={styles.traits}>
              <h3 className={styles.traitsTitle}>Personality</h3>
              <div className={styles.traitList}>
                {character.personality.map((p) => (
                  <span key={p} className={styles.trait}>{p}</span>
                ))}
              </div>
            </div>

            <div className={styles.traits}>
              <h3 className={styles.traitsTitle}>Tags</h3>
              <div className={styles.traitList}>
                {character.tags.map((t) => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Control panel */}
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Connection */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Cpu size={18} />
                Robot Connection
              </h2>
              <div className={styles.connectionStatus}>
                <WifiOff size={16} />
                <span>No robot connected</span>
              </div>
              <button className={styles.connectBtn}>
                <Wifi size={16} />
                <span>Connect Robot</span>
              </button>
              <p className={styles.hint}>
                Supported: DJI RoboMaster, Arduino, Raspberry Pi
              </p>
            </div>

            {/* Controls */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Behavior Tree</h2>
              <div className={styles.treeStatus}>
                <div className={styles.statusDot} data-status="idle" />
                <span>Idle — Connect a robot to start</span>
              </div>
              <div className={styles.controls}>
                <button className={styles.controlBtn} disabled>
                  <Play size={16} />
                  <span>Start</span>
                </button>
                <button className={styles.controlBtn} disabled>
                  <Square size={16} />
                  <span>Stop</span>
                </button>
              </div>
            </div>

            {/* Telemetry placeholder */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Telemetry</h2>
              <div className={styles.telemetryGrid}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Battery</span>
                  <span className={styles.metricValue}>—</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Position</span>
                  <span className={styles.metricValue}>—</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Status</span>
                  <span className={styles.metricValue}>Offline</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Uptime</span>
                  <span className={styles.metricValue}>—</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
