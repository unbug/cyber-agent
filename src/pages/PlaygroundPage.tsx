/**
 * PlaygroundPage — drag agents from Gallery into a scene, simulate, freeze, replay, share.
 *
 * Layout:
 *   Top bar: scene picker, pause, reset, share
 *   Left: agent palette (draggable cards)
 *   Center: canvas rendering scene + agents
 *   Bottom: agent list with remove buttons
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { usePlayground } from '@/hooks/usePlayground'
import { PlaygroundCanvas } from '@/pages/PlaygroundCanvas'
import { PlaygroundPalette } from '@/pages/PlaygroundPalette'
import { PlaygroundControls } from '@/pages/PlaygroundControls'
import { getScene } from '@/engine/scenes'
import { X } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import styles from './PlaygroundPage.module.css'

export function PlaygroundPage() {
  const {
    state,
    addAgent,
    removeAgent,
    togglePause,
    reset,
    setScene,
    share,
    handleDragStart,
    handleCanvasMove,
    handleCanvasLeave,
    placedIds,
  } = usePlayground()

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [demoToast, setDemoToast] = useState<string | null>(null)

  // ── Demo handler ──
  const handleLoadDemo = useCallback(async () => {
    // Reset first
    reset()

    // Spawn cat and dog
    const scene = getScene(state.sceneId)
    if (!scene) return
    const { width, height } = scene.bounds

    // Use addAgent which handles all lifecycle
    const catAgent = addAgent('demo-cat', width * 0.2, height * 0.7)
    const dogAgent = addAgent('demo-dog', width * 0.8, height * 0.3)

    if (catAgent && dogAgent) {
      setDemoToast('🐱🐶 Cat-Dog demo loaded!')
      setTimeout(() => setDemoToast(null), 3000)
    }
  }, [reset, addAgent, state.sceneId])

  // ── Canvas drop handler ──
  const handleCanvasDropInternal = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const charId = e.dataTransfer.getData('application/character-id')
      if (!charId) return

      const rect = canvasContainerRef.current?.getBoundingClientRect()
      if (!rect) return

      const scene = getScene(state.sceneId)
      if (!scene) return

      // Convert screen coords to scene coords
      const scale = Math.min(
        rect.width / scene.bounds.width,
        rect.height / scene.bounds.height,
      )
      const offsetX = (rect.width - scene.bounds.width * scale) / 2
      const offsetY = (rect.height - scene.bounds.height * scale) / 2

      const sceneX = (e.clientX - rect.left - offsetX) / scale
      const sceneY = (e.clientY - rect.top - offsetY) / scale

      // Clamp to scene bounds
      const clampedX = Math.max(0, Math.min(scene.bounds.width, sceneX))
      const clampedY = Math.max(0, Math.min(scene.bounds.height, sceneY))

      addAgent(charId, clampedX, clampedY)
    },
    [state.sceneId, addAgent],
  )

  // ── Canvas mouse move (ghost positioning) ──
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasContainerRef.current?.getBoundingClientRect()
      if (!rect) return

      const scene = getScene(state.sceneId)
      if (!scene) return

      const scale = Math.min(
        rect.width / scene.bounds.width,
        rect.height / scene.bounds.height,
      )
      const offsetX = (rect.width - scene.bounds.width * scale) / 2
      const offsetY = (rect.height - scene.bounds.height * scale) / 2

      const sceneX = (e.clientX - rect.left - offsetX) / scale
      const sceneY = (e.clientY - rect.top - offsetY) / scale

      handleCanvasMove(sceneX, sceneY)
    },
    [state.sceneId, handleCanvasMove],
  )

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        togglePause()
      }
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePause, reset])

  return (
    <div className={styles.page}>
      {/* Top toolbar */}
      <PlaygroundControls
        sceneId={state.sceneId}
        onSceneChange={setScene}
        paused={state.paused}
        onTogglePause={togglePause}
        onReset={reset}
        agentCount={state.agents.length}
        onShare={share}
        onLoadDemo={handleLoadDemo}
      />

      <div className={styles.body}>
        {/* Left: agent palette */}
        <div className={styles.palette}>
          <PlaygroundPalette
            onDragStart={handleDragStart}
            placedIds={placedIds}
          />
        </div>

        {/* Center: canvas */}
        <div className={styles.canvasWrap}>
          <div ref={canvasContainerRef} className={styles.canvasContainer}>
            <PlaygroundCanvas
              scene={getScene(state.sceneId)!}
              agents={state.agents.map((a) => ({
                agent: a.worldAgent,
                characterId: a.characterId,
                emoji: a.emoji,
              }))}
              ghostPos={state.ghostPos}
              showProximity={state.showProximity}
            />

            {/* Drop overlay */}
            <div
              className={styles.dropZone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDropInternal}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasLeave}
            />

            {/* Empty state */}
            {state.agents.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyEmoji}>🎪</div>
                <h3 className={styles.emptyTitle}>Drag agents here</h3>
                <p className={styles.emptyDesc}>
                  Pick characters from the palette and drop them onto the scene
                </p>
              </div>
            )}
          </div>

          {/* Bottom: agent list */}
          {state.agents.length > 0 && (
            <div className={styles.agentList}>
              {state.agents.map((a) => (
                <HoverBeam
                  key={a.agentId}
                  size="sm"
                  colorVariant="mono"
                  strength={0.25}
                >
                  <div className={styles.agentChip}>
                    <span className={styles.agentChipEmoji}>{a.emoji}</span>
                    <span className={styles.agentChipName}>{a.characterId}</span>
                    <span className={styles.agentChipPos}>
                      ({Math.round(a.worldAgent.x)}, {Math.round(a.worldAgent.y)})
                    </span>
                    <HoverBeam size="sm" colorVariant="sunset" strength={0.6}>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeAgent(a.agentId)}
                        title="Remove agent"
                      >
                        <X size={12} />
                      </button>
                    </HoverBeam>
                  </div>
                </HoverBeam>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demo toast */}
      {demoToast && (
        <div className={styles.demoToast}>
          {demoToast}
        </div>
      )}
    </div>
  )
}
