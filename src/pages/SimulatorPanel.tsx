/**
 * v2.0 — SimulatorPanel component
 *
 * Embedded panel within the Agent page that shows the simulation canvas
 * and provides controls for recording and replay.
 * Shown when "Sim Mode" is active.
 */

import {
  Play,
  Square,
  CircleDot,
  RotateCcw,
  FastForward,
  Download,
  Upload,
} from 'lucide-react'
import styles from './Agent.module.css'

interface SimulatorPanelProps {
  /** Whether simulation is active */
  simActive: boolean
  /** Whether recording */
  isRecording: boolean
  /** Whether replaying */
  isReplaying: boolean
  /** Simulation time in ms */
  simTime: number
  /** Step count */
  stepCount: number
  /** FPS */
  fps: number
  /** Start simulation */
  onStartSim: () => void
  /** Stop simulation */
  onStopSim: () => void
  /** Start recording */
  onStartRecord: () => void
  /** Stop recording */
  onStopRecord: () => void
  /** Start replay */
  onStartReplay: () => void
  /** Pause replay */
  onPauseReplay: () => void
  /** Step replay */
  onStepReplay: () => void
  /** Scrub replay */
  onScrubReplay: (index: number) => void
  /** Set replay speed */
  onSetSpeed: (speed: number) => void
  /** Export recording */
  onExport: () => string
  /** Import recording */
  onImport: (json: string) => void
  /** Canvas ref */
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export function SimulatorPanel(props: SimulatorPanelProps) {
  const {
    simActive,
    isRecording,
    isReplaying,
    simTime,
    stepCount,
    fps,
    onStartSim,
    onStopSim,
    onStartRecord,
    onStopRecord,
    onStartReplay,
    onPauseReplay,
    onStepReplay,
    onScrubReplay,
    onSetSpeed,
    onExport,
    onImport,
    canvasRef,
  } = props

  const handleExport = () => {
    const json = onExport()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sim-run-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onImport(reader.result as string)
    }
    reader.readAsText(file)
  }

  return (
    <div className={styles.simPanel}>
      {/* Simulation canvas */}
      <div className={styles.simCanvasContainer}>
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          className={styles.simCanvas}
          width={800}
          height={600}
        />
        {!simActive && !isReplaying && (
          <div className={styles.simOverlay}>
            <p>Simulation ready</p>
            <button className={styles.simStartBtn} onClick={onStartSim}>
              <Play size={16} /> Start Sim
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.simControls}>
        {/* Sim controls */}
        <div className={styles.simControlGroup}>
          <span className={styles.simGroupLabel}>Sim</span>
          <button
            className={`${styles.simBtn} ${simActive ? styles.simBtnActive : ''}`}
            onClick={onStartSim}
            disabled={simActive || isReplaying}
            title="Start simulation"
          >
            <Play size={14} />
          </button>
          <button
            className={`${styles.simBtn} ${!simActive && !isReplaying ? styles.simBtnActive : ''}`}
            onClick={onStopSim}
            disabled={!simActive}
            title="Stop simulation"
          >
            <Square size={14} />
          </button>
        </div>

        {/* Recording controls */}
        <div className={styles.simControlGroup}>
          <span className={styles.simGroupLabel}>Record</span>
          <button
            className={`${styles.simBtn} ${isRecording ? styles.simBtnRecording : ''}`}
            onClick={isRecording ? onStopRecord : onStartRecord}
            disabled={!simActive}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <CircleDot size={14} />
          </button>
          <button
            className={styles.simBtn}
            onClick={handleExport}
            disabled={!simActive}
            title="Export recording"
          >
            <Download size={14} />
          </button>
          <label className={styles.simBtn}>
            <Upload size={14} />
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
        </div>

        {/* Replay controls */}
        <div className={styles.simControlGroup}>
          <span className={styles.simGroupLabel}>Replay</span>
          <button
            className={styles.simBtn}
            onClick={isReplaying ? onPauseReplay : onStartReplay}
            disabled={!simActive}
            title={isReplaying ? 'Pause replay' : 'Start replay'}
          >
            <Play size={14} />
          </button>
          <button
            className={styles.simBtn}
            onClick={onStepReplay}
            disabled={!simActive}
            title="Step forward"
          >
            <FastForward size={14} />
          </button>
          <button
            className={styles.simBtn}
            onClick={() => onScrubReplay(0)}
            disabled={!simActive}
            title="Reset replay"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Speed control */}
        <div className={styles.simControlGroup}>
          <span className={styles.simGroupLabel}>Speed</span>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            defaultValue="1"
            onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
            className={styles.simSpeedSlider}
          />
          <span className={styles.simSpeedValue}>1x</span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.simStats}>
        <span>t={(simTime / 1000).toFixed(1)}s</span>
        <span>steps={stepCount}</span>
        <span>fps={fps}</span>
      </div>
    </div>
  )
}
