import { useParams, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Square, Pause, Zap, Activity, Layers, Box } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import { TelemetryDashboard } from '@/components/TelemetryDashboard'
import { getCharacter, getCompatibleAdapters } from '@/agents'
import { useBehaviorTree } from '@/hooks/useBehaviorTree'
import { useTelemetry } from '@/hooks/useTelemetry'
import { useI18n } from '@/i18n'
import { SimulatorPanel } from './SimulatorPanel'
import { useSimMode } from '@/sim'
import styles from './Agent.module.css'

export function AgentPage() {
  const { id } = useParams<{ id: string }>()
  const character = id ? getCharacter(id) : undefined
  const { canvasRef, snapshot, state, start, stop, pause, resume } = useBehaviorTree(id ?? '')
  const { data: telemetryData, addSnapshot } = useTelemetry()
  const { t } = useI18n()

  // ── v2.0: Sim Mode ────────────────────────────────────
  const simCanvasRef = useRef<HTMLCanvasElement>(null)
  const [simMode, setSimMode] = useState(false)
  const sim = useSimMode({
    canvasRef: simCanvasRef as React.RefObject<HTMLCanvasElement>,
    characterId: id ?? 'unknown',
  })

  // Feed randomization to SimulatorPanel
  const simPanelRandomization = sim.randomization
  const simPanelOnRandomizationChange = sim.setRandomization
  const simPanelOnRandomizationReset = sim.resetRandomization

  // Feed snapshots to telemetry hook
  useEffect(() => {
    addSnapshot(snapshot)
  }, [snapshot, addSnapshot])

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
        <h2>{t('agent.not_found')}</h2>
        <Link to="/gallery">← {t('agent.back_link')}</Link>
      </div>
    )
  }

  const isRunning = state === 'running'
  const isPaused = state === 'paused'

  return (
    <div className={styles.page}>
      <div className="container">
        <Link to="/gallery" className={styles.back}>
          <ArrowLeft size={16} />
          <span>{t('agent.back')}</span>
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
                  <h3 className={styles.traitsTitle}>{t('agent.personality')}</h3>
                  <div className={styles.traitList}>
                    {character.personality.map((p) => (
                      <span key={p} className={styles.trait}>{p}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.traits}>
                  <h3 className={styles.traitsTitle}>{t('agent.adapters')}</h3>
                  <div className={styles.traitList}>
                    {getCompatibleAdapters(character).map((a) => (
                      <span key={a.id} className={styles.adapterChip}>
                        {a.emoji} {a.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.traits}>
                  <h3 className={styles.traitsTitle}>{t('agent.tags')}</h3>
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
            {/* Canvas scene or Simulator */}
            <HoverBeam size="md" colorVariant="colorful" strength={0.68}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  {simMode ? (
                    <>
                      <Box size={18} />
                      {t('agent.sim_mode')}
                    </>
                  ) : (
                    <>
                      <Activity size={18} />
                      {t('agent.live_preview')}
                    </>
                  )}
                  <button
                    className={styles.simToggle}
                    onClick={() => setSimMode(!simMode)}
                    title={simMode ? 'Switch to live preview' : 'Switch to simulator'}
                  >
                    <Layers size={14} />
                    {simMode ? 'Live' : 'Sim'}
                  </button>
                </div>
                {simMode ? (
                  <SimulatorPanel
                    simActive={sim.simActive}
                    isRecording={sim.isRecording}
                    isReplaying={sim.isReplaying}
                    simTime={sim.simTime}
                    stepCount={sim.stepCount}
                    fps={sim.fps}
                    onStartSim={sim.startSim}
                    onStopSim={sim.stopSim}
                    onStartRecord={sim.startRecording}
                    onStopRecord={sim.stopRecording}
                    onStartReplay={sim.startReplay}
                    onPauseReplay={sim.pauseReplay}
                    onStepReplay={sim.stepReplay}
                    onScrubReplay={sim.scrubReplay}
                    onSetSpeed={sim.setReplaySpeed}
                    onExport={sim.exportRecording}
                    onImport={sim.importRun}
                    canvasRef={simCanvasRef}
                    randomization={simPanelRandomization}
                    onRandomizationChange={simPanelOnRandomizationChange}
                    onRandomizationReset={simPanelOnRandomizationReset}
                  />
                ) : (
                  <>
                    <div className={styles.canvasWrap}>
                      <canvas
                        ref={canvasRef as React.Ref<HTMLCanvasElement>}
                        className={styles.canvas}
                      />
                      {!isRunning && !isPaused && (
                        <div className={styles.canvasOverlay}>
                          <button className={styles.playOverlay} onClick={start}>
                            <Play size={32} />
                            <span>{t('agent.start_bt')}</span>
                          </button>
                        </div>
                      )}
                      <div className={styles.canvasHint}>
                        {t('agent.canvas_hint')}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </HoverBeam>

            {/* Controls */}
            <HoverBeam size="line" colorVariant="sunset" strength={0.65}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Zap size={18} />
                  {t('agent.controls')}
                </h2>
                <div className={styles.controls}>
                  {!isRunning && !isPaused && (
                    <button className={styles.connectBtn} onClick={start}>
                      <Play size={16} />
                      <span>{t('agent.start')}</span>
                    </button>
                  )}
                  {isRunning && (
                    <button className={styles.controlBtn} onClick={pause}>
                      <Pause size={16} />
                      <span>{t('agent.pause')}</span>
                    </button>
                  )}
                  {isPaused && (
                    <button className={styles.connectBtn} onClick={resume}>
                      <Play size={16} />
                      <span>{t('agent.resume')}</span>
                    </button>
                  )}
                  {(isRunning || isPaused) && (
                    <button className={styles.controlBtn} onClick={stop}>
                      <Square size={16} />
                      <span>{t('agent.stop')}</span>
                    </button>
                  )}
                </div>
                <div className={styles.treeStatus}>
                  <div className={styles.statusDot} data-status={isRunning ? 'running' : 'idle'} />
                  <span>
                    {isRunning ? t('agent.running') : isPaused ? t('agent.paused') : t('agent.stopped')}
                    {snapshot ? ` — ${snapshot.ticksPerSecond} tps` : ''}
                  </span>
                </div>
              </div>
            </HoverBeam>

            {/* Telemetry dashboard — real-time visualizations */}
            <HoverBeam size="md" colorVariant="mono" strength={0.45}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Activity size={18} />
                  {t('agent.telemetry')}
                </h2>
                <TelemetryDashboard data={telemetryData} />
              </div>
            </HoverBeam>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
