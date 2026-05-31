/**
 * PlaygroundControls — toolbar with scene picker, freeze, replay, and share-link.
 */

import { useState, useCallback } from 'react'
import { getSceneIds, type SceneId } from '@/engine/scenes'
import { Pause, Play, RotateCcw, Share2 } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import styles from './PlaygroundControls.module.css'

interface PlaygroundControlsProps {
  /** Current scene id */
  sceneId: SceneId
  /** Change the scene */
  onSceneChange: (id: SceneId) => void
  /** Whether simulation is paused */
  paused: boolean
  /** Toggle pause/resume */
  onTogglePause: () => void
  /** Reset simulation */
  onReset: () => void
  /** Number of agents */
  agentCount: number
  /** Share current playground state as a URL */
  onShare: () => void
  /** Load the cat-dog demo */
  onLoadDemo?: () => void
}

export function PlaygroundControls({
  sceneId,
  onSceneChange,
  paused,
  onTogglePause,
  onReset,
  agentCount,
  onShare,
  onLoadDemo,
}: PlaygroundControlsProps) {
  const [showPicker, setShowPicker] = useState(false)

  const handleShare = useCallback(() => {
    onShare()
  }, [onShare])

  return (
    <div className={styles.controls}>
      {/* Scene picker */}
      <div className={styles.scenePicker}>
        <HoverBeam size="line" colorVariant="mono" strength={0.35}>
          <button
            className={styles.sceneBtn}
            onClick={() => setShowPicker(!showPicker)}
          >
            <span className={styles.sceneIcon}>🌍</span>
            <span>{sceneId.charAt(0).toUpperCase() + sceneId.slice(1)}</span>
            <span className={styles.sceneArrow}>▾</span>
          </button>
        </HoverBeam>
        {showPicker && (
          <div className={styles.sceneDropdown}>
            {getSceneIds().map((id) => (
              <button
                key={id}
                className={`${styles.sceneOption} ${id === sceneId ? styles.sceneOptionActive : ''}`}
                onClick={() => {
                  onSceneChange(id)
                  setShowPicker(false)
                }}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Simulation controls */}
      <div className={styles.controlsRow}>
        <HoverBeam size="line" colorVariant={paused ? 'sunset' : 'mono'} strength={paused ? 0.65 : 0.35}>
          <button
            className={styles.ctrlBtn}
            onClick={onTogglePause}
            title={paused ? 'Resume simulation' : 'Pause simulation'}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
        </HoverBeam>

        <HoverBeam size="line" colorVariant="mono" strength={0.35}>
          <button
            className={styles.ctrlBtn}
            onClick={onReset}
            title="Reset simulation"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </HoverBeam>

        <HoverBeam size="line" colorVariant="mono" strength={0.35}>
          <button
            className={styles.ctrlBtn}
            onClick={handleShare}
            title="Share playground state as URL"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
        </HoverBeam>

        {onLoadDemo && (
          <HoverBeam size="line" colorVariant="mono" strength={0.35}>
            <button
              className={styles.ctrlBtn}
              onClick={onLoadDemo}
              title="Load cat-dog demo (social BT primitives)"
            >
              <span className={styles.demoIcon}>🐱🐶</span>
              <span>Demo</span>
            </button>
          </HoverBeam>
        )}
      </div>

      {/* Agent count */}
      <div className={styles.agentCount}>
        <span className={styles.agentIcon}>👥</span>
        <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
