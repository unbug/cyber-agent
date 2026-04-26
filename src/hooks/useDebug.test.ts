/**
 * useDebug hook tests
 *
 * Verifies:
 * - Tracer subscription emits state updates
 * - Blackboard capture works
 * - Tree update works
 * - reset clears state
 * - tick rate computation
 * - blackboard diff
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { tracer } from '@/engine/tracer'
import { useDebug, diffBlackboards } from '@/hooks/useDebug'
import type { Blackboard } from '@/engine/types'

describe('useDebug', () => {
  beforeEach(() => {
    tracer.clear()
    tracer.setEnabled(true)
  })

  afterEach(() => {
    tracer.clear()
  })

  it('returns initial empty state', () => {
    const { result } = renderHook(() => useDebug())
    const state = result.current

    expect(state.tree).toBeNull()
    expect(state.breadcrumb).toHaveLength(0)
    expect(state.blackboard).toBeNull()
    expect(state.adapterEvents).toHaveLength(0)
    expect(state.tickTimes).toHaveLength(0)
    expect(state.errors).toHaveLength(0)
    expect(state.totalEvents).toBe(0)
    expect(state.tickRate).toBe(0)
    expect(state.avgLatency).toBe(0)
  })

  it('captures blackboard snapshot', () => {
    const { result } = renderHook(() => useDebug())

    const mockBB: Blackboard = {
      pointerX: 0, pointerY: 0, pointerActive: false,
      canvasWidth: 400, canvasHeight: 300,
      x: 100, y: 200, rotation: 45, speed: 2,
      emotion: 'happy', energy: 0.8, excitement: 0.3,
      tick: 10, deltaMs: 16, totalMs: 1600,
    }

    act(() => {
      result.current.captureBlackboard(mockBB)
    })

    expect(result.current.blackboard).not.toBeNull()
    expect(result.current.blackboard!.emotion).toBe('happy')
    expect(result.current.blackboard!.x).toBe(100)
  })

  it('tracks previous blackboard for diff', () => {
    const { result } = renderHook(() => useDebug())

    const bb1: Blackboard = {
      ...mockBlackboard(),
      emotion: 'happy',
      energy: 0.8,
    }

    act(() => {
      result.current.captureBlackboard(bb1)
    })

    const bb2: Blackboard = {
      ...mockBlackboard(),
      emotion: 'angry',  // changed
      energy: 0.8,       // unchanged
    }

    act(() => {
      result.current.captureBlackboard(bb2)
    })

    expect(result.current.prevBlackboard).not.toBeNull()
    expect(result.current.prevBlackboard!.emotion).toBe('happy')
    expect(result.current.blackboard!.emotion).toBe('angry')
  })

  it('updates tree state', () => {
    const { result } = renderHook(() => useDebug())

    const mockTree = {
      def: { type: 'action' as const, action: 'test', name: 'test' },
      status: 'running' as const,
      state: {},
      children: [],
    }

    act(() => {
      result.current.updateTree(mockTree)
    })

    expect(result.current.tree).toBe(mockTree)
    expect(result.current.isRunning).toBe(true)
  })

  it('reset clears all state', () => {
    const { result } = renderHook(() => useDebug())

    // Set some state
    act(() => {
      result.current.updateTree({
        def: { type: 'action' as const, action: 'root', name: 'root' },
        status: 'running' as const,
        state: {},
        children: [],
      })
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.tree).toBeNull()
    expect(result.current.breadcrumb).toHaveLength(0)
    expect(result.current.isRunning).toBe(false)
  })

  it('tickRate computes from tick events', () => {
    const { result } = renderHook(() => useDebug())

    // Simulate 10 ticks at ~100ms intervals
    for (let i = 0; i < 10; i++) {
      act(() => {
        tracer.emit({
          t: i * 100,
          type: 'tick.start',
          label: 'tick.start',
          payload: {},
        })
      })
    }

    expect(result.current.tickRate).toBeGreaterThan(0)
    // Should be approximately 10 fps (1000ms / 100ms)
    expect(result.current.tickRate).toBeCloseTo(10, -1)
  })

  it('avgLatency computes from breadcrumb events', () => {
    const { result } = renderHook(() => useDebug())

    // Simulate events with known intervals
    for (let i = 0; i < 10; i++) {
      act(() => {
        tracer.emit({
          t: i * 50,
          type: 'node.enter',
          label: `node-${i}`,
          payload: {},
        })
      })
    }

    expect(result.current.avgLatency).toBeGreaterThan(0)
    // Should be approximately 50ms
    expect(result.current.avgLatency).toBeCloseTo(50, 0)
  })
})

describe('diffBlackboards', () => {
  it('returns empty diffs when boards are equal', () => {
    const bb = mockBlackboard()
    const diffs = diffBlackboards(bb, bb)
    expect(diffs).toHaveLength(0)
  })

  it('detects changed fields', () => {
    const bb1: Blackboard = { ...mockBlackboard(), emotion: 'happy', energy: 0.8 }
    const bb2: Blackboard = { ...mockBlackboard(), emotion: 'angry', energy: 0.5 }

    const diffs = diffBlackboards(bb1, bb2)

    expect(diffs).toHaveLength(2)
    expect(diffs.map(d => d.field)).toContain('emotion')
    expect(diffs.map(d => d.field)).toContain('energy')

    const emotionDiff = diffs.find(d => d.field === 'emotion')!
    expect(emotionDiff.oldValue).toBe('happy')
    expect(emotionDiff.newValue).toBe('angry')
  })

  it('ignores internal pointer fields', () => {
    const bb1: Blackboard = { ...mockBlackboard(), emotion: 'happy' }
    const bb2: Blackboard = {
      ...mockBlackboard(),
      emotion: 'angry',
      pointerX: 100,
      pointerY: 200,
    }

    const diffs = diffBlackboards(bb1, bb2)
    const fields = diffs.map(d => d.field)

    expect(fields).not.toContain('pointerX')
    expect(fields).not.toContain('pointerY')
    expect(fields).not.toContain('pointerActive')
    expect(fields).not.toContain('canvasWidth')
    expect(fields).not.toContain('canvasHeight')
    expect(fields).toContain('emotion')
  })

  it('returns empty when prev is null', () => {
    const bb = mockBlackboard()
    expect(diffBlackboards(null, bb)).toHaveLength(0)
  })

  it('returns empty when curr is null', () => {
    const bb = mockBlackboard()
    expect(diffBlackboards(bb, null)).toHaveLength(0)
  })
})

// ─── Helpers ────────────────────────────────────────────────────

function mockBlackboard(): Blackboard {
  return {
    pointerX: 0,
    pointerY: 0,
    pointerActive: false,
    canvasWidth: 400,
    canvasHeight: 300,
    x: 200,
    y: 150,
    rotation: 0,
    speed: 2,
    emotion: 'idle',
    energy: 1,
    excitement: 0,
    tick: 0,
    deltaMs: 0,
    totalMs: 0,
  }
}
