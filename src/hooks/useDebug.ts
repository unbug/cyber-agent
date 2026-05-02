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
 * - Safety supervisor events
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { tracer, type TracerEvent } from '@/engine/tracer'
import type { RuntimeNode, Blackboard } from '@/engine/types'
import type { SafetyEvent, SafetyState } from '@/engine/safety-supervisor'
import type { EpisodicMemory } from '@/memory/types'
import { InMemoryEpisodicStore } from '@/memory/episodic-store'

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
  /** Perception events */
  perceptionEvents: TracerEvent[]
  /** Tick timestamps for rate calculation */
  tickTimes: number[]
  /** Error events */
  errors: TracerEvent[]
  /** Total event count */
  totalEvents: number
  /** Is the BT currently running */
  isRunning: boolean
  /** Safety supervisor state */
  safetyState: SafetyState | null
  /** E-stop active flag */
  eStopActive: boolean
  /** Safety events */
  safetyEvents: SafetyEvent[]
  /** Episodic memories */
  memories: EpisodicMemory[]
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
  /** Update safety state */
  updateSafety: (state: SafetyState, eStop: boolean) => void
  /** Add safety event */
  addSafetyEvent: (event: SafetyEvent) => void
  /** Encode a perception event as an episodic memory */
  encodeMemory: (event: TracerEvent) => void
  /** Purge all forgotten (pruned) memories */
  purgeMemories: () => void
  /** Simulate forgetting: decay all memories by elapsedMs */
  simulateForgetting: (elapsedMs: number) => void
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
    perceptionEvents: [],
    tickTimes: [],
    errors: [],
    totalEvents: 0,
    isRunning: false,
    safetyState: null,
    eStopActive: false,
    safetyEvents: [],
    memories: [],
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
      perceptionEvents: [],
      tickTimes: [],
      errors: [],
      totalEvents: 0,
      isRunning: false,
      safetyState: null,
      eStopActive: false,
      safetyEvents: [],
      memories: [],
    })
  }, [])

  const updateSafety = useCallback((safetyState: SafetyState, eStop: boolean) => {
    setState(prev => ({ ...prev, safetyState, eStopActive: eStop }))
  }, [])

  const addSafetyEvent = useCallback((event: SafetyEvent) => {
    setState(prev => ({ ...prev, safetyEvents: [...prev.safetyEvents, event] }))
  }, [])

  /** Encode a perception event as an episodic memory */
  const encodeMemory = useCallback((event: TracerEvent) => {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) return

    const category = payload.category as string
    const source = (payload.source as string) ?? 'unknown'
    const confidence = (payload.confidence as number) ?? 0.5

    // Infer emotion from perception event
    let valence = 0
    let arousal = 0
    let dominance = 0.5

    if (category === 'see.face') {
      valence = 0.3
      arousal = 0.4
      dominance = 0.3
    } else if (category === 'hear.word') {
      valence = 0.5
      arousal = 0.6
    } else if (category === 'hear.sound') {
      valence = 0.2
      arousal = 0.7
    } else if (category === 'see.object') {
      valence = 0.4
      arousal = 0.5
    } else if (category === 'near') {
      valence = -0.2
      arousal = 0.5
      dominance = 0.2
    } else if (category === 'bump') {
      valence = -0.5
      arousal = 0.8
      dominance = 0.3
    }

    const label = `${category} from ${source}`
    const salience = confidence
    const tags = [category]
    if (category === 'see.object' && payload.class) {
      tags.push(`object:${String(payload.class)}`)
    }
    if (category === 'hear.word' && payload.text) {
      tags.push(`word:${String(payload.text).toLowerCase()}`)
    }

    const memory = new InMemoryEpisodicStore().encode({
      timestamp: event.t,
      event: { category, payload: payload as Record<string, unknown>, source },
      emotion: { valence, arousal, dominance },
      label,
      salience,
      tags,
    })

    setState(prev => ({
      ...prev,
      memories: [...prev.memories, memory].slice(-500), // cap at 500
    }))
  }, [])

  /** Purge all forgotten (pruned) memories */
  const purgeMemories = useCallback(() => {
    setState(prev => ({
      ...prev,
      memories: prev.memories.filter((m) => !m.pruned),
    }))
  }, [])

  /** Simulate forgetting: decay all memories by elapsedMs */
  const simulateForgetting = useCallback((elapsedMs: number) => {
    setState(prev => {
      const decayed = prev.memories.map((m) => {
        if (m.pruned) return m
        const age = Date.now() - m.timestamp
        const newRelevance = computeRelevanceDebug(age + elapsedMs, m.salience, m.recallCount)
        return { ...m, relevance: newRelevance }
      })
      return { ...prev, memories: decayed }
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
        case 'perception': {
          const perceptionEvents = [...s.perceptionEvents, event].slice(-200)
          setState(prev => ({ ...prev, perceptionEvents }))
          // Also encode as episodic memory
          encodeMemory(event)
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
    perceptionEvents: state.perceptionEvents,
    tickRate,
    avgLatency,
    captureBlackboard,
    updateTree,
    reset,
    updateSafety,
    addSafetyEvent,
    encodeMemory,
    purgeMemories,
    simulateForgetting,
  } as DebugState & {
    captureBlackboard: (bb: Blackboard) => void
    updateTree: (tree: RuntimeNode) => void
    reset: () => void
    updateSafety: (state: SafetyState, eStop: boolean) => void
    addSafetyEvent: (event: SafetyEvent) => void
    encodeMemory: (event: TracerEvent) => void
    purgeMemories: () => void
    simulateForgetting: (elapsedMs: number) => void
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

// ─── Forgetting curve helper (for debug simulation) ───────────────

function computeRelevanceDebug(
  ageMs: number,
  salience: number,
  recallCount: number,
): number {
  const initialRelevance = 1.0
  const halfLifeMs = 3_600_000 // 1 hour
  const minRelevance = 0.01
  const salienceBoost = 0.5

  const decayFactor = Math.pow(2, -ageMs / halfLifeMs)
  const baseRelevance = initialRelevance * decayFactor
  const recallBoost = 1 + recallCount * salienceBoost * 0.1
  const salienceFactor = 1 + salience * salienceBoost

  return Math.max(minRelevance, baseRelevance * recallBoost * salienceFactor)
}
