/**
 * useMultiAgentDebug — aggregates per-agent debug state from the tracer event stream.
 *
 * For multi-agent scenarios, the tracer emits events with an `agentId` field.
 * This hook groups events by agent and exposes structured state for the
 * N-track timeline and agent diff panels.
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { tracer, type TracerEvent } from '@/engine/tracer'
import type { Blackboard } from '@/engine/types'

export interface AgentDebugState {
  agentId: string
  characterId?: string
  btEvents: TracerEvent[]
  blackboardSnapshots: Array<{ t: number; bb: Blackboard }>
  txEvents: TracerEvent[]
  rxEvents: TracerEvent[]
  tickTimes: number[]
  eventCount: number
  currentBlackboard: Blackboard | null
  tickRate: number
  isRunning: boolean
}

interface MultiAgentDebugState {
  agents: AgentDebugState[]
  totalEvents: number
  allEvents: TracerEvent[]
  agentIds: string[]
}

const MAX_AGENT_EVENTS = 200
const MAX_AGENT_BLACKBOARDS = 50
const MAX_TICK_TIMES = 120

function makeEmptyAgent(agentId: string): AgentDebugState {
  return {
    agentId,
    btEvents: [],
    blackboardSnapshots: [],
    txEvents: [],
    rxEvents: [],
    tickTimes: [],
    eventCount: 0,
    currentBlackboard: null,
    tickRate: 0,
    isRunning: false,
  }
}

export function useMultiAgentDebug(opts?: { tracer?: typeof tracer }): MultiAgentDebugState {
  const [state, setState] = useState<MultiAgentDebugState>({
    agents: [],
    totalEvents: 0,
    allEvents: [],
    agentIds: [],
  })

  // Mutable ref holding the latest state — used by subscriber to avoid stale closures.
  // Reset on mount so tests get a clean slate regardless of React instance reuse.
  const stateRef = useRef<MultiAgentDebugState>({
    agents: [],
    totalEvents: 0,
    allEvents: [],
    agentIds: [],
  })

  useEffect(() => {
    // Reset ref on mount — critical for test isolation when component instances are reused.
    stateRef.current = {
      agents: [],
      totalEvents: 0,
      allEvents: [],
      agentIds: [],
    }
  }, [])

  const processEvent = useCallback((event: TracerEvent) => {
    setState(prev => {
      // Always read from the mutable ref for consistency
      const s = stateRef.current

      if (!event.agentId) {
        return {
          ...prev,
          totalEvents: prev.totalEvents + 1,
          allEvents: [...s.allEvents, event].slice(-2000),
        }
      }

      // Find or create agent in the current state
      const existingAgents = prev.agents.map(a => ({ ...a }))
      let idx = existingAgents.findIndex(a => a.agentId === event.agentId)
      if (idx < 0) {
        const newAgent = makeEmptyAgent(event.agentId)
        existingAgents.push(newAgent)
        idx = existingAgents.length - 1
      }

      const agent = { ...existingAgents[idx]! }
      let updated: AgentDebugState = { ...agent, eventCount: agent.eventCount + 1 }

      switch (event.type) {
        case 'tick.start': {
          const tickTimes = [...agent.tickTimes, event.t].slice(-MAX_TICK_TIMES)
          updated = { ...updated, tickTimes, isRunning: true }
          break
        }
        case 'node.enter':
        case 'node.exit':
        case 'action.dispatch': {
          const btEvents = [...agent.btEvents, event].slice(-MAX_AGENT_EVENTS)
          updated = { ...updated, btEvents }
          break
        }
        case 'bb.set': {
          const payload = event.payload as Record<string, unknown> | undefined
          if (payload?.value !== undefined) {
            const currentBB = agent.currentBlackboard ?? {} as Blackboard
            const newBB = { ...currentBB, [event.label]: payload.value }
            const snapshots = [...agent.blackboardSnapshots, { t: event.t, bb: newBB as Blackboard }].slice(-MAX_AGENT_BLACKBOARDS)
            updated = { ...updated, currentBlackboard: newBB, blackboardSnapshots: snapshots }
          }
          break
        }
        case 'adapter.tx': {
          const txEvents = [...agent.txEvents, event].slice(-MAX_AGENT_EVENTS)
          updated = { ...updated, txEvents }
          break
        }
        case 'adapter.rx': {
          const rxEvents = [...agent.rxEvents, event].slice(-MAX_AGENT_EVENTS)
          updated = { ...updated, rxEvents }
          break
        }
      }

      existingAgents[idx] = updated

      // Sync ref for subsequent events in the same tick
      stateRef.current = {
        agents: existingAgents,
        totalEvents: prev.totalEvents + 1,
        allEvents: [...s.allEvents, event].slice(-2000),
        agentIds: prev.agentIds.includes(event.agentId!) ? prev.agentIds : [...prev.agentIds, event.agentId!],
      }

      return stateRef.current
    })
  }, [])

  useEffect(() => {
    const t = opts?.tracer ?? tracer
    const unsubscribe = t.subscribe(processEvent)
    return unsubscribe
  }, [processEvent, opts?.tracer])

  // Compute derived stats
  const agents = useMemo(() => {
    return state.agents.map(agent => {
      const tickRate = computeTickRate(agent.tickTimes)
      return { ...agent, tickRate }
    })
  }, [state.agents])

  return {
    agents,
    totalEvents: state.totalEvents,
    allEvents: state.allEvents,
    agentIds: state.agentIds,
  }
}

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
