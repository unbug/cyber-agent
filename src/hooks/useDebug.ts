/**
 * useDebug — subscribes to the tracer event stream and exposes
 * structured state for the /debug page.
 *
 * Tracks:
 * - Current BT tree state (runtime nodes + status)
 * - Last 50 node-enter events (breadcrumb)
 * - Blackboard diff (current vs previous snapshot)
 * - Adapter tx/rx timeline
 * - Tick rate / latency stats
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { tracer, type TracerEvent } from '@/engine/tracer'
import type { RuntimeNode, Blackboard } from '@/engine/types'

// ─── Internal state ─────────────────────────────────────────────

interface DebugState {
  /** Current runtime tree (null when not running) */
  tree: RuntimeNode | null
  /** Last 50 node.enter events */
  breadcrumb: TracerEvent[]
  /** Current blackboard snapshot */
  blackboard: Blackboard | null
  /** Previous blackboard (for diff) */
  prevBlackboard: Blackboard | null
  /** Adapter tx/rx events */
  adapterEvents: TracerEvent[]
  /** Tick timestamps for rate calculation */
  tickTimes: number[]
  /** Error events */
  errors: TracerEvent[]
  /** Total event count */
  totalEvents: number
  /** Is the BT currently running */
  isRunning: boolean
}

const MAX_BREADCRUMB = 50
const MAX_ADAPTER_EVENTS = 200
const MAX_TICK_TIMES = 120

export function useDebug(): DebugState & {
  /** Force a blackboard snapshot */
  captureBlackboard: (bb: Blackboard) => void
  /** Update the runtime tree */
  updateTree: (tree: RuntimeNode) => void
  /** Reset all state */
  reset: () => void
  /** Computed tick rate (fps) */
  tickRate: number
  /** Computed avg latency (ms) */
  avgLatency: number
} {
  const [state, setState] = useState<DebugState>({
    tree: null,
    breadcrumb: [],
    blackboard: null,
    prevBlackboard: null,
    adapterEvents: [],
    tickTimes: [],
    errors: [],
    totalEvents: 0,
    isRunning: false,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const captureBlackboard = useCallback((bb: Blackboard) => {
    setState(prev => ({
      ...prev,
      prevBlackboard: prev.blackboard,
      blackboard: { ...bb },
    }))
  }, [])

  const updateTree = useCallback((tree: RuntimeNode) => {
    setState(prev => ({ ...prev, tree, isRunning: true }))
  }, [])

  const reset = useCallback(() => {
    setState({
      tree: null,
      breadcrumb: [],
      blackboard: null,
      prevBlackboard: null,
      adapterEvents: [],
      tickTimes: [],
      errors: [],
      totalEvents: 0,
      isRunning: false,
    })
  }, [])

  // Tracer subscription
  useEffect(() => {
    const unsubscribe = tracer.subscribe((event: TracerEvent) => {
      const s = stateRef.current

      switch (event.type) {
        case 'tick.start': {
          const tickTimes = [...s.tickTimes, event.t].slice(-MAX_TICK_TIMES)
          setState(prev => ({ ...prev, tickTimes }))
          break
        }
        case 'node.enter':
        case 'node.exit': {
          const breadcrumb = [...s.breadcrumb, event].slice(-MAX_BREADCRUMB)
          setState(prev => ({ ...prev, breadcrumb }))
          break
        }
        case 'bb.set': {
          // Will be handled by captureBlackboard
          break
        }
        case 'adapter.tx':
        case 'adapter.rx': {
          const adapterEvents = [...s.adapterEvents, event].slice(-MAX_ADAPTER_EVENTS)
          setState(prev => ({ ...prev, adapterEvents }))
          break
        }
        case 'error': {
          const errors = [...s.errors, event]
          setState(prev => ({ ...prev, errors }))
          break
        }
      }

      setState(prev => ({ ...prev, totalEvents: prev.totalEvents + 1 }))
    })

    return unsubscribe
  }, [])

  // Compute derived stats
  const tickRate = computeTickRate(state.tickTimes)
  const avgLatency = computeAvgLatency(state.breadcrumb)

  return {
    ...state,
    tickRate,
    avgLatency,
    captureBlackboard,
    updateTree,
    reset,
  } as DebugState & {
    captureBlackboard: (bb: Blackboard) => void
    updateTree: (tree: RuntimeNode) => void
    reset: () => void
    tickRate: number
    avgLatency: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function computeTickRate(tickTimes: number[]): number {
  if (tickTimes.length < 2) return 0
  const recent = tickTimes.slice(-60)
  let intervals = 0
  for (let i = 1; i < recent.length; i++) {
    const a = recent[i - 1]
    const b = recent[i]
    if (a !== undefined && b !== undefined) {
      intervals += b - a
    }
  }
  const avgInterval = intervals / (recent.length - 1)
  if (avgInterval <= 0) return 0
  return Math.round((1000 / avgInterval) * 10) / 10
}

function computeAvgLatency(breadcrumb: TracerEvent[]): number {
  if (breadcrumb.length < 2) return 0
  let total = 0
  let count = 0
  for (let i = 1; i < breadcrumb.length; i++) {
    const prev = breadcrumb[i - 1]
    const curr = breadcrumb[i]
    if (prev && curr) {
      total += curr.t - prev.t
      count++
    }
  }
  return count > 0 ? Math.round((total / count) * 100) / 100 : 0
}

// ─── Blackboard diff helpers ────────────────────────────────────

export interface BbDiff {
  field: string
  oldValue: unknown
  newValue: unknown
}

export function diffBlackboards(
  prev: Blackboard | null,
  curr: Blackboard | null,
): BbDiff[] {
  if (!prev || !curr) return []
  const diffs: BbDiff[] = []
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)])
  for (const key of allKeys) {
    if (key === 'pointerX' || key === 'pointerY' || key === 'pointerActive' ||
        key === 'canvasWidth' || key === 'canvasHeight') continue
    const a = prev[key]
    const b = curr[key]
    if (a !== b) {
      diffs.push({ field: key, oldValue: a, newValue: b })
    }
  }
  return diffs
}
