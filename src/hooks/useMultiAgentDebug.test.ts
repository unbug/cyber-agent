/**
 * useMultiAgentDebug — tests
 *
 * Verifies:
 *   - Per-agent event aggregation from tracer
 *   - Tick rate computation
 *   - Blackboard snapshot tracking
 *   - Agent lifecycle (create, update)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { TracerEvent } from '@/engine/tracer'
import { Tracer } from '@/engine/tracer'

function makeEvent(
  type: TracerEvent['type'],
  label: string,
  agentId?: string,
  payload?: Record<string, unknown>,
): TracerEvent {
  return {
    t: performance.now(),
    type,
    label,
    payload,
    agentId,
  }
}

describe('useMultiAgentDebug', () => {
  let testTracer: Tracer

  beforeEach(() => {
    // Create a fresh tracer instance for each test
    testTracer = new Tracer() as unknown as Tracer
    testTracer.reset()
  })

  it('returns empty state initially', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))
    expect(result.current.agents).toHaveLength(0)
    expect(result.current.totalEvents).toBe(0)
    expect(result.current.agentIds).toHaveLength(0)
    unmount()
  })

  it('tracks events from a single agent', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))

    act(() => {
      testTracer.emit(makeEvent('tick.start', 'tick.start', 'agent-1'))
      testTracer.emit(makeEvent('node.enter', 'sequence', 'agent-1'))
      testTracer.emit(makeEvent('action.dispatch', 'move', 'agent-1'))
    })

    expect(result.current.agents).toHaveLength(1)
    expect(result.current.agentIds).toContain('agent-1')
    expect(result.current.totalEvents).toBe(3)

    const agent = result.current.agents[0]!
    expect(agent.agentId).toBe('agent-1')
    expect(agent.eventCount).toBe(3)
    expect(agent.btEvents).toHaveLength(2)
    expect(agent.tickTimes).toHaveLength(1)
    unmount()
  })

  it('tracks events from multiple agents', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))

    act(() => {
      testTracer.emit(makeEvent('tick.start', 'tick.start', 'agent-1'))
      testTracer.emit(makeEvent('tick.start', 'tick.start', 'agent-2'))
      testTracer.emit(makeEvent('node.enter', 'selector', 'agent-1'))
      testTracer.emit(makeEvent('node.enter', 'sequence', 'agent-2'))
    })

    expect(result.current.agents).toHaveLength(2)
    expect(result.current.agentIds).toContain('agent-1')
    expect(result.current.agentIds).toContain('agent-2')
    expect(result.current.totalEvents).toBe(4)
    unmount()
  })

  it('tracks blackboard snapshots', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))

    act(() => {
      testTracer.emit(makeEvent('bb.set', 'x', 'agent-1', { value: 100 }))
      testTracer.emit(makeEvent('bb.set', 'y', 'agent-1', { value: 200 }))
    })

    const agent = result.current.agents.find(a => a.agentId === 'agent-1')
    expect(agent).toBeDefined()
    expect(agent!.currentBlackboard).toBeDefined()
    expect(agent!.blackboardSnapshots.length).toBe(2)
    unmount()
  })

  it('tracks adapter events per agent', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))

    act(() => {
      testTracer.emit(makeEvent('adapter.tx', 'move', 'agent-1', { command: 'forward' }))
      testTracer.emit(makeEvent('adapter.rx', 'telemetry', 'agent-1', { battery: 80 }))
      testTracer.emit(makeEvent('adapter.tx', 'rotate', 'agent-2', { angle: 90 }))
    })

    const agent1 = result.current.agents.find(a => a.agentId === 'agent-1')
    expect(agent1!.txEvents).toHaveLength(1)
    expect(agent1!.rxEvents).toHaveLength(1)

    const agent2 = result.current.agents.find(a => a.agentId === 'agent-2')
    expect(agent2!.txEvents).toHaveLength(1)
    expect(agent2!.rxEvents).toHaveLength(0)
    unmount()
  })

  it('computes tick rate from tick events', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))

    act(() => {
      for (let i = 0; i < 10; i++) {
        testTracer.emit(makeEvent('tick.start', 'tick.start', 'agent-1'))
      }
    })

    const agent = result.current.agents.find(a => a.agentId === 'agent-1')
    expect(agent!.tickTimes.length).toBe(10)
    expect(agent!.tickRate).toBeGreaterThan(0)
    unmount()
  })

  it('does not create agent entries for events without agentId', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))

    act(() => {
      testTracer.emit(makeEvent('error', 'error', undefined, { message: 'test' }))
      testTracer.emit(makeEvent('tick.start', 'tick.start'))
    })

    expect(result.current.agents).toHaveLength(0)
    expect(result.current.totalEvents).toBe(2)
    unmount()
  })

  it('caps btEvents at MAX_AGENT_EVENTS', async () => {
    const { useMultiAgentDebug } = await import('./useMultiAgentDebug')
    const { result, unmount } = renderHook(() => useMultiAgentDebug({ tracer: testTracer }))
    const MAX = 200

    act(() => {
      for (let i = 0; i < MAX + 100; i++) {
        testTracer.emit(makeEvent('node.enter', `node-${i}`, 'agent-1'))
      }
    })

    const agent = result.current.agents.find(a => a.agentId === 'agent-1')
    expect(agent!.btEvents.length).toBeLessThanOrEqual(MAX)
    unmount()
  })
})
