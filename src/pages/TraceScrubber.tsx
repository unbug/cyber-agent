/**
 * TraceScrubber — Time-travel scrubber for the /debug page.
 *
 * Allows rewinding, stepping, and fast-forwarding through a trace
 * (in-memory session or uploaded .cybertrace file).
 */

import { useState, useCallback, useRef, useEffect, type ChangeEvent } from 'react'
import type { TracerEvent } from '@/engine/tracer'
import { lintTrace, type ParsedTrace } from '@cyber-agent/sdk/trace'
import styles from './DebugPage.module.css'

// ─── State ───────────────────────────────────────────────────────

interface ScrubberState {
  events: TracerEvent[]
  currentIndex: number
  isScrubbing: boolean
  speed: number
  isPlaying: boolean
  currentBlackboard: Record<string, unknown> | null
  currentActiveNodes: Set<string>
  meta: Record<string, unknown> | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMsg: string
}

// ─── Helpers ─────────────────────────────────────────────────────

function reconstructBlackboard(events: TracerEvent[]): Record<string, unknown> {
  const bb: Record<string, unknown> = {}
  for (let i = 0; i < events.length; i++) {
    const evt = events[i]
    if (evt && evt.type === 'bb.set' && evt.payload) {
      const payload = evt.payload as Record<string, unknown>
      const field = (payload.field as string) ?? evt.label
      bb[field] = payload.value
    }
  }
  return bb
}

function getActiveNodes(events: TracerEvent[], upToIndex: number): Set<string> {
  const stack: string[] = []
  for (let i = 0; i <= upToIndex && i < events.length; i++) {
    const evt = events[i]
    if (!evt) continue
    if (evt.type === 'node.enter') {
      stack.push(evt.label)
    } else if (evt.type === 'node.exit') {
      stack.pop()
    }
  }
  return new Set<string>(stack)
}

// ─── Upload Handler ──────────────────────────────────────────────

async function loadTraceFile(file: File): Promise<ParsedTrace> {
  let content: string

  if (file.name.endsWith('.gz')) {
    content = await file.text()
    if (!content.includes('$schema')) {
      throw new Error('Gzipped traces require server-side decompression. Please unzip first.')
    }
  } else {
    content = await file.text()
  }

  const lintResult = lintTrace(content)
  if (!lintResult.valid) {
    throw new Error(`Invalid trace: ${lintResult.errors[0]?.message ?? 'unknown error'}`)
  }

  const lines = content.split('\n').filter(l => l.trim().length > 0)
  const header = JSON.parse(lines[0]!) as ParsedTrace['header']
  const events: TracerEvent[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    try {
      const obj = JSON.parse(line)
      events.push({
        t: obj.t,
        type: obj.type,
        label: obj.label,
        payload: obj.payload,
      })
    } catch {
      // Skip unparseable lines
    }
  }

  return { header, events }
}

// ─── Scrubber Component ──────────────────────────────────────────

interface TraceScrubberProps {
  liveEvents: TracerEvent[]
  liveBlackboard: Record<string, unknown> | null
}

export function TraceScrubber({ liveEvents: _liveEvents, liveBlackboard }: TraceScrubberProps) {
  const [state, setState] = useState<ScrubberState>({
    events: [],
    currentIndex: -1,
    isScrubbing: false,
    speed: 1,
    isPlaying: false,
    currentBlackboard: null,
    currentActiveNodes: new Set<string>(),
    meta: null,
    status: 'idle',
    errorMsg: '',
  })

  const playRef = useRef<number | null>(null)

  const handleUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState(prev => ({ ...prev, status: 'loading', errorMsg: '' }))

    try {
      const trace = await loadTraceFile(file)
      setState({
        events: trace.events,
        currentIndex: -1,
        isScrubbing: false,
        speed: 1,
        isPlaying: false,
        currentBlackboard: null,
        currentActiveNodes: new Set<string>(),
        meta: (trace.header.meta ?? {}) as Record<string, unknown>,
        status: 'ready',
        errorMsg: '',
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMsg: (err as Error).message,
      }))
    }
  }, [])

  const handleSeek = useCallback((index: number) => {
    setState(prev => {
      if (index < -1 || index >= prev.events.length) return prev
      const bb = index >= 0 ? reconstructBlackboard(prev.events.slice(0, index + 1)) : null
      const nodes = index >= 0 ? getActiveNodes(prev.events, index) : new Set<string>()
      return {
        ...prev,
        currentIndex: index,
        isScrubbing: true,
        isPlaying: false,
        currentBlackboard: bb,
        currentActiveNodes: nodes,
      }
    })
  }, [])

  const handleStepForward = useCallback(() => {
    setState(prev => {
      const next = prev.currentIndex + 1
      if (next >= prev.events.length) return prev
      const bb = reconstructBlackboard(prev.events.slice(0, next + 1))
      const nodes = getActiveNodes(prev.events, next)
      return { ...prev, currentIndex: next, isScrubbing: true, isPlaying: false, currentBlackboard: bb, currentActiveNodes: nodes }
    })
  }, [])

  const handleStepBackward = useCallback(() => {
    setState(prev => {
      const next = prev.currentIndex - 1
      if (next < -1) return prev
      const bb = next >= 0 ? reconstructBlackboard(prev.events.slice(0, next + 1)) : null
      const nodes = next >= 0 ? getActiveNodes(prev.events, next) : new Set<string>()
      return { ...prev, currentIndex: next, isScrubbing: true, isPlaying: false, currentBlackboard: bb, currentActiveNodes: nodes }
    })
  }, [])

  const handlePlay = useCallback(() => {
    setState(prev => {
      if (prev.events.length === 0) return prev
      if (prev.currentIndex >= prev.events.length - 1) {
        const bb = reconstructBlackboard(prev.events.slice(0, 1))
        const nodes = getActiveNodes(prev.events, 0)
        return { ...prev, currentIndex: 0, isPlaying: true, isScrubbing: true, currentBlackboard: bb, currentActiveNodes: nodes }
      }
      return { ...prev, isPlaying: true }
    })
  }, [])

  const handlePause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }))
  }, [])

  const handleBackToLive = useCallback(() => {
    setState({
      events: [],
      currentIndex: -1,
      isScrubbing: false,
      speed: 1,
      isPlaying: false,
      currentBlackboard: null,
      currentActiveNodes: new Set<string>(),
      meta: null,
      status: 'idle',
      errorMsg: '',
    })
  }, [])

  // ─── Playback Loop ───────────────────────────────────────────

  useEffect(() => {
    if (!state.isPlaying || state.events.length === 0) return

    const tick = () => {
      setState(prev => {
        if (!prev.isPlaying) return prev
        const next = prev.currentIndex + 1
        if (next >= prev.events.length) {
          return { ...prev, isPlaying: false }
        }
        const bb = reconstructBlackboard(prev.events.slice(0, next + 1))
        const nodes = getActiveNodes(prev.events, next)
        return { ...prev, currentIndex: next, currentBlackboard: bb, currentActiveNodes: nodes }
      })
      playRef.current = window.setTimeout(tick, 50 / state.speed)
    }

    playRef.current = window.setTimeout(tick, 50 / state.speed)
    return () => {
      if (playRef.current) clearTimeout(playRef.current)
    }
  }, [state.isPlaying, state.events.length, state.speed, state.currentIndex])

  // ─── Render ──────────────────────────────────────────────────

  const isLive = !state.isScrubbing || state.status === 'idle'
  const displayBlackboard = isLive ? liveBlackboard : state.currentBlackboard

  if (state.status === 'error') {
    return (
      <div className={styles.errorLog}>
        <div className={styles.errorLogHeader}>
          <span className={styles.errorLogTitle}>⚠️ Scrubber Error</span>
        </div>
        <div className={styles.errorItem}>
          <span className={styles.errorMsg}>{state.errorMsg}</span>
        </div>
        <button className={styles.btn} onClick={handleBackToLive}>
          Back to Live
        </button>
      </div>
    )
  }

  return (
    <div className={styles.scrubber}>
      {/* Upload bar */}
      <div className={styles.scrubberBar}>
        <label className={styles.btn}>
          📂 Upload Trace
          <input
            type="file"
            accept=".cybertrace,.cybertrace.gz,.jsonl,.json"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </label>

        {state.status === 'ready' && (
          <>
            <button
              className={`${styles.btn} ${state.isScrubbing ? styles.btnActive : ''}`}
              onClick={handleBackToLive}
            >
              ⏮ Live
            </button>
            <button className={styles.btn} onClick={handleStepBackward}>
              ⏪
            </button>
            {state.isPlaying ? (
              <button className={styles.btn} onClick={handlePause}>
                ⏸
              </button>
            ) : (
              <button className={styles.btn} onClick={handlePlay}>
                ▶
              </button>
            )}
            <button className={styles.btn} onClick={handleStepForward}>
              ⏩
            </button>

            <select
              className={styles.scrubberSpeed}
              value={state.speed}
              onChange={e => setState(prev => ({ ...prev, speed: Number(e.target.value) }))}
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>

            <input
              type="range"
              className={styles.scrubberSlider}
              min={-1}
              max={state.events.length > 0 ? state.events.length - 1 : 0}
              value={state.currentIndex}
              onChange={e => handleSeek(Number(e.target.value))}
            />
            <span className={styles.scrubberLabel}>
              {state.currentIndex + 1} / {state.events.length} events
              {(state.meta?.platform as string | undefined) && ` · ${state.meta!.platform as string}`}
            </span>
          </>
        )}
      </div>

      {/* Scrubber blackboard preview */}
      {state.isScrubbing && displayBlackboard && (
        <div className={styles.scrubberPreview}>
          <div className={styles.scrubberPreviewTitle}>Blackboard at Event #{state.currentIndex + 1}</div>
          <div className={styles.scrubberPreviewFields}>
            {Object.entries(displayBlackboard)
              .filter(([k]) => !k.startsWith('_'))
              .slice(0, 20)
              .map(([key, value]) => (
                <div key={key} className={styles.scrubberField}>
                  <span className={styles.scrubberFieldName}>{key}</span>
                  <span className={styles.scrubberFieldValue}>
                    {typeof value === 'object' ? JSON.stringify(value).slice(0, 40) : String(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Active nodes */}
      {state.currentActiveNodes.size > 0 && (
        <div className={styles.scrubberNodes}>
          {Array.from(state.currentActiveNodes).map(node => (
            <span key={node} className={styles.scrubberNodeTag}>
              🌳 {node}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
