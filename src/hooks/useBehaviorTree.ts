/**
 * useBehaviorTree — React hook that runs a character's behavior tree
 * on a <canvas> element.
 *
 * Usage:
 *   const { canvasRef, snapshot, isRunning, start, stop } = useBehaviorTree('loyal-dog')
 *   <canvas ref={canvasRef} />
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { BehaviorTreeRunner, CanvasAdapter, getBehavior } from '../engine'
import type { RunnerSnapshot, RunnerState } from '../engine'

export interface UseBehaviorTreeResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  snapshot: RunnerSnapshot | null
  state: RunnerState
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
}

export function useBehaviorTree(characterId: string): UseBehaviorTreeResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const runnerRef = useRef<BehaviorTreeRunner | null>(null)
  const [snapshot, setSnapshot] = useState<RunnerSnapshot | null>(null)
  const [state, setState] = useState<RunnerState>('stopped')

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runnerRef.current?.stop()
      runnerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const behavior = getBehavior(characterId)
    if (!behavior) {
      console.warn(`[useBehaviorTree] No behavior for: ${characterId}`)
      return
    }

    // Stop previous if exists
    runnerRef.current?.stop()

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)

    // Create adapter and runner
    const adapter = new CanvasAdapter(canvas, getEmoji(characterId))
    const runner = new BehaviorTreeRunner(behavior, adapter)
    runner.setCanvasSize(rect.width, rect.height)

    // Track pointer
    const handlePointerMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      runner.setPointer(e.clientX - r.left, e.clientY - r.top, true)
    }
    const handlePointerLeave = () => {
      runner.setPointer(0, 0, false)
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)

    // Throttled snapshot updates (10 FPS for React state)
    let snapshotCounter = 0
    runner.onTick = (snap) => {
      snapshotCounter++
      if (snapshotCounter % 5 === 0) {
        setSnapshot({ ...snap })
      }
    }

    runner.start()
    runnerRef.current = runner
    setState('running')

    // Resize handler
    const handleResize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width = r.width * dpr
      canvas.height = r.height * dpr
      const ctx2 = canvas.getContext('2d')
      if (ctx2) ctx2.scale(dpr, dpr)
      runner.setCanvasSize(r.width, r.height)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas)

    // Store cleanup references
    ;(canvas as unknown as Record<string, unknown>).__btCleanup = () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      resizeObserver.disconnect()
    }
  }, [characterId])

  const stop = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const cleanup = (canvas as unknown as Record<string, unknown>).__btCleanup as (() => void) | undefined
      cleanup?.()
    }
    runnerRef.current?.stop()
    runnerRef.current = null
    setState('stopped')
    setSnapshot(null)
  }, [])

  const pause = useCallback(() => {
    runnerRef.current?.pause()
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    runnerRef.current?.resume()
    setState('running')
  }, [])

  return { canvasRef, snapshot, state, start, stop, pause, resume }
}

// Quick emoji lookup
const emojiMap: Record<string, string> = {
  'loyal-dog': '🐕',
  'curious-cat': '🐈',
  'guard-dino': '🦖',
  'dance-bot': '🤖',
  'zen-turtle': '🐢',
  'scout-eagle': '🦅',
}

function getEmoji(id: string): string {
  return emojiMap[id] ?? '🤖'
}
