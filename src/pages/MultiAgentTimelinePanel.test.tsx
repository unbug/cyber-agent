/**
 * MultiAgentTimelinePanel — tests
 *
 * Verifies:
 *   - Renders correctly with agents
 *   - Shows empty state with no agents
 *   - Renders at least 2 agents for AgentDiffPanel
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiAgentTimelinePanel } from './MultiAgentTimelinePanel'
import { AgentDiffPanel } from './AgentDiffPanel'
import type { AgentDebugState } from '@/hooks/useMultiAgentDebug'
import type { Blackboard } from '@/engine/types'

function makeAgent(
  id: string,
  eventCount = 10,
  tickRate = 60,
  blackboard?: Record<string, unknown>,
): AgentDebugState {
  return {
    agentId: id,
    eventCount,
    tickRate,
    isRunning: true,
    btEvents: [],
    blackboardSnapshots: [],
    txEvents: [],
    rxEvents: [],
    tickTimes: [],
    currentBlackboard: blackboard as unknown as Blackboard | null,
  }
}

describe('MultiAgentTimelinePanel', () => {
  it('shows empty state with no agents', () => {
    render(
      <MultiAgentTimelinePanel agents={[]} />,
    )

    expect(screen.getByText(/No agents yet/i)).toBeTruthy()
  })

  it('renders timeline with one agent', () => {
    render(
      <MultiAgentTimelinePanel agents={[makeAgent('agent-1', 5, 60)]} />,
    )

    // Should show the agent label
    expect(screen.getByText(/Multi-Agent Timeline/i)).toBeTruthy()
  })

  it('shows agent info in the footer', () => {
    render(
      <MultiAgentTimelinePanel agents={[makeAgent('agent-1', 42, 60)]} />,
    )

    expect(screen.getByText(/1 agent/i)).toBeTruthy()
  })
})

describe('AgentDiffPanel', () => {
  it('shows no agents message when empty', () => {
    render(
      <AgentDiffPanel agents={[]} />,
    )

    expect(screen.getByText(/No agents to compare/i)).toBeTruthy()
  })

  it('shows identical blackboard message when no diffs', () => {
    const bb = { x: 100, y: 200, emotion: 'happy' }
    render(
      <AgentDiffPanel agents={[
        makeAgent('agent-1', 10, 60, bb),
        makeAgent('agent-2', 10, 60, bb),
      ]} />,
    )

    expect(screen.getByText(/identical/i)).toBeTruthy()
  })

  it('shows diff count when agents differ', () => {
    render(
      <AgentDiffPanel agents={[
        makeAgent('agent-1', 10, 60, { x: 100, y: 200 }),
        makeAgent('agent-2', 10, 60, { x: 300, y: 200 }),
      ]} />,
    )

    expect(screen.getByText(/differing field/i)).toBeTruthy()
    expect(screen.getByText(/Agent Blackboard Diff/i)).toBeTruthy()
  })

  it('shows agent legend with colors', () => {
    render(
      <AgentDiffPanel agents={[
        makeAgent('agent-1', 10, 60, { x: 100 }),
        makeAgent('agent-2', 10, 60, { x: 300 }),
        makeAgent('agent-3', 10, 60, { x: 500 }),
      ]} />,
    )

    // AgentDiffPanel shows last 4 chars of agentId (agent-{id.slice(-4)})
    expect(screen.getByText(/nt-1/i)).toBeTruthy()
    expect(screen.getByText(/nt-2/i)).toBeTruthy()
    expect(screen.getByText(/nt-3/i)).toBeTruthy()
  })
})
