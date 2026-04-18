import { useParams, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Square, Pause, Zap, Activity } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { getCharacter } from '@/agents'
import { useBehaviorTree } from '@/hooks/useBehaviorTree'
import styles from './Agent.module.css'

export function AgentPage() {
  const { id } = useParams<{ id: string }>()
  const character = id ? getCharacter(id) : undefined
  const { canvasRef, snapshot, state, start, stop, pause, resume } = useBehaviorTree(id ?? '')

  // Auto-start the behavior tree when the page mounts
  useEffect(() => {
    if (character) {
      // Small delay to let canvas mount and get dimensions
      const timer = setTimeout(() => start(), 100)
      return () => { clearTimeout(timer); stop() }
    }
  }, [character, start, stop])

  if (!character) {
    return (
      <div className={styles.notFound}>
        <h2>Character not found</h2>
        <Link to="/gallery">← Back to Gallery</Link>
      </div>
    )
  }

  const bb = snapshot?.blackboard
  const isRunning = state === 'running'
  const isPaused = state === 'paused'

  return (
    <div className={styles.page}>
      <div className="container">
        <Link to="/gallery" className={styles.back}>
          <ArrowLeft size={16} />
          <span>Gallery</span>
        </Link>

        <div className={styles.layout}>
          {/* Left: Character info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HoverBeam size="md" colorVariant="ocean" strength={0.6}>
              <div className={styles.info}>
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
              </div>
            </HoverBeam>
          </motion.div>

          {/* Right: Live behavior tree */}
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Canvas scene */}
            <HoverBeam size="md" colorVariant="colorful" strength={0.68}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Activity size={18} />
                  Live Preview
                </h2>
                <div className={styles.canvasWrap}>
                  <canvas
                    ref={canvasRef as React.Ref<HTMLCanvasElement>}
                    className={styles.canvas}
                  />
                  {!isRunning && !isPaused && (
                    <div className={styles.canvasOverlay}>
                      <button className={styles.playOverlay} onClick={start}>
                        <Play size={32} />
                        <span>Start Behavior Tree</span>
                      </button>
                    </div>
                  )}
                  <div className={styles.canvasHint}>
                    Move your mouse over the canvas to interact
                  </div>
                </div>
              </div>
            </HoverBeam>

            {/* Controls */}
            <HoverBeam size="line" colorVariant="sunset" strength={0.65}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Zap size={18} />
                  Controls
                </h2>
                <div className={styles.controls}>
                  {!isRunning && !isPaused && (
                    <button className={styles.connectBtn} onClick={start}>
                      <Play size={16} />
                      <span>Start</span>
                    </button>
                  )}
                  {isRunning && (
                    <button className={styles.controlBtn} onClick={pause}>
                      <Pause size={16} />
                      <span>Pause</span>
                    </button>
                  )}
                  {isPaused && (
                    <button className={styles.connectBtn} onClick={resume}>
                      <Play size={16} />
                      <span>Resume</span>
                    </button>
                  )}
                  {(isRunning || isPaused) && (
                    <button className={styles.controlBtn} onClick={stop}>
                      <Square size={16} />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
                <div className={styles.treeStatus}>
                  <div className={styles.statusDot} data-status={isRunning ? 'running' : 'idle'} />
                  <span>
                    {isRunning ? 'Running' : isPaused ? 'Paused' : 'Stopped'}
                    {snapshot ? ` — ${snapshot.ticksPerSecond} tps` : ''}
                  </span>
                </div>
              </div>
            </HoverBeam>

            {/* Telemetry — real data from blackboard */}
            <HoverBeam size="md" colorVariant="mono" strength={0.45}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Telemetry</h2>
                <div className={styles.telemetryGrid}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Emotion</span>
                    <span className={styles.metricValue}>
                      {bb?.emotion?.toUpperCase() ?? '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Energy</span>
                    <span className={styles.metricValue}>
                      {bb ? `${Math.round(bb.energy * 100)}%` : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Position</span>
                    <span className={styles.metricValue}>
                      {bb ? `${Math.round(bb.x)}, ${Math.round(bb.y)}` : '—'}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Excitement</span>
                    <span className={styles.metricValue}>
                      {bb ? `${Math.round(bb.excitement * 100)}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </HoverBeam>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
