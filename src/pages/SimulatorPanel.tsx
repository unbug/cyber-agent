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
  FolderOpen,
  Copy,
} from 'lucide-react'
import { DomainRandomizationPanel } from './DomainRandomizationPanel'
import { DomainRandomization } from '@/sim/types'
import { DatasetPanel } from '@/dataset'
import type { EpisodeMeta, Dataset } from '@/dataset/recorder'
import styles from './Agent.module.css'

interface SimulatorPanelProps {
  simActive: boolean
  isRecording: boolean
  isReplaying: boolean
  simTime: number
  stepCount: number
  fps: number
  onStartSim: () => void
  onStopSim: () => void
  onStartRecord: () => void
  onStopRecord: () => void
  onStartReplay: () => void
  onPauseReplay: () => void
  onStepReplay: () => void
  onScrubReplay: (index: number) => void
  onSetSpeed: (speed: number) => void
  onExport: () => string
  onImport: (json: string) => void
  onCopyTrace?: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
  randomization?: DomainRandomization
  onRandomizationChange?: (r: Partial<DomainRandomization>) => void
  onRandomizationReset?: () => void
  // ── Dataset (v2.0 checkbox 4) ───────────────────────
  datasetVisible?: boolean
  onToggleDataset?: (visible: boolean) => void
  episodes?: EpisodeMeta[]
  datasets?: Map<string, Dataset>
  onExportCyberTrace?: () => string
  onExportEpisodeCyberTrace?: (episodeId: string) => string
  onExportDatasetCyberTrace?: (datasetName: string) => string
  onDeleteEpisode?: (episodeId: string) => void
  onDeleteDataset?: (datasetName: string) => void
  onCloseDataset?: () => void
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
    onCopyTrace,
    canvasRef,
    randomization,
    onRandomizationChange,
    onRandomizationReset,
    datasetVisible,
    onToggleDataset,
    episodes,
    datasets,
    onExportCyberTrace,
    onExportEpisodeCyberTrace,
    onExportDatasetCyberTrace,
    onDeleteEpisode,
    onDeleteDataset,
    onCloseDataset,
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

  const hasDataset =
    datasetVisible &&
    onToggleDataset &&
    episodes &&
    datasets &&
    onExportCyberTrace &&
    onExportEpisodeCyberTrace &&
    onExportDatasetCyberTrace &&
    onDeleteEpisode &&
    onDeleteDataset &&
    onCloseDataset

  return (
    <div>
      <div className={styles.simPanel}>
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

        <div className={styles.simControls}>
          <div className={styles.simControlGroup}>
            <span className={styles.simGroupLabel}>Sim</span>
            <button
              className={`${styles.simBtn} ${simActive ? styles.simBtnActive : ''}`}
              onClick={onStartSim}
              disabled={simActive || isReplaying}
            >
              <Play size={14} />
            </button>
            <button
              className={`${styles.simBtn} ${!simActive && !isReplaying ? styles.simBtnActive : ''}`}
              onClick={onStopSim}
              disabled={!simActive}
            >
              <Square size={14} />
            </button>
          </div>

          <div className={styles.simControlGroup}>
            <span className={styles.simGroupLabel}>Record</span>
            <button
              className={`${styles.simBtn} ${isRecording ? styles.simBtnRecording : ''}`}
              onClick={isRecording ? onStopRecord : onStartRecord}
              disabled={!simActive}
            >
              <CircleDot size={14} />
            </button>
            <button
              className={styles.simBtn}
              onClick={handleExport}
              disabled={!simActive}
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

          <div className={styles.simControlGroup}>
            <span className={styles.simGroupLabel}>Replay</span>
            <button
              className={styles.simBtn}
              onClick={isReplaying ? onPauseReplay : onStartReplay}
              disabled={!simActive}
            >
              <Play size={14} />
            </button>
            <button className={styles.simBtn} onClick={onStepReplay} disabled={!simActive}>
              <FastForward size={14} />
            </button>
            <button className={styles.simBtn} onClick={() => onScrubReplay(0)} disabled={!simActive}>
              <RotateCcw size={14} />
            </button>
          </div>

          <div className={styles.simControlGroup}>
            <span className={styles.simGroupLabel}>Compare</span>
            <button
              className={styles.simBtn}
              onClick={() => {
                const trace = onExport()
                if (onCopyTrace && trace) {
                  navigator.clipboard.writeText(trace).then(() => {
                    onCopyTrace()
                  })
                }
              }}
              disabled={!simActive}
              title="Copy trace to clipboard for Sim↔Real comparison"
            >
              <Copy size={14} />
            </button>
          </div>

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

          {onToggleDataset && (
            <div className={styles.simControlGroup}>
              <span className={styles.simGroupLabel}>Dataset</span>
              <button
                className={`${styles.simBtn} ${datasetVisible ? styles.simBtnActive : ''}`}
                onClick={() => onToggleDataset?.(!datasetVisible)}
              >
                <FolderOpen size={14} />
              </button>
            </div>
          )}
        </div>

        <div className={styles.simStats}>
          <span>t={(simTime / 1000).toFixed(1)}s</span>
          <span>steps={stepCount}</span>
          <span>fps={fps}</span>
        </div>

        {randomization && onRandomizationChange && onRandomizationReset && (
          <DomainRandomizationPanel
            randomization={randomization}
            onChange={onRandomizationChange}
            onReset={onRandomizationReset}
          />
        )}
      </div>

      {hasDataset && (
        <div className={styles.datasetPanelWrapper}>
          <DatasetPanel
            visible={datasetVisible}
            datasets={datasets}
            episodes={episodes}
            onExportCyberTrace={onExportCyberTrace}
            onExportEpisode={onExportEpisodeCyberTrace}
            onExportDataset={onExportDatasetCyberTrace}
            onDeleteEpisode={onDeleteEpisode}
            onDeleteDataset={onDeleteDataset}
            onClose={onCloseDataset}
          />
        </div>
      )}
    </div>
  )
}
