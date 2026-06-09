/**
 * useDebugReport — unit tests for the debug report serialization hook.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { RuntimeNode, Blackboard } from '@/engine/types'
import type { TracerEvent, TracerEventType } from '@/engine/tracer'
import type { PolicyResult } from '@/engine/policy'
import type { ValConfig, MemoryConfig, PerceptionConfig } from '@/agents/types'
import { useDebugReport } from './useDebugReport'

// ─── Helpers ──────────────────────────────────────────────

function makeTree(name = 'root', type = 'root'): RuntimeNode {
  return {
    def: { name, type },
    status: 'success',
    children: [
      {
        def: { name: 'seq1', type: 'sequence' },
        status: 'running',
        children: [],
      } as unknown as RuntimeNode,
    ],
  } as unknown as RuntimeNode
}

function makeEvent(t: number, type: TracerEventType, label = 'test'): TracerEvent {
  return { t, type, label, payload: undefined } as TracerEvent
}

const defaultOptions = {
  tree: null,
  blackboard: {} as Blackboard | null,
  errors: [] as TracerEvent[],
  totalEvents: 0,
  tickRate: 12.5,
  avgLatency: 3.2,
  perceptionEvents: [],
  policyResults: [],
  policyEvents: [],
  adapterEvents: [],
}

// ─── Tests ────────────────────────────────────────────────

describe('useDebugReport', () => {
  it('generates a report with minimal options', () => {
    const { result } = renderHook(() => useDebugReport(defaultOptions))

    act(() => {
      const report = result.current.generate()
      expect(report.$schema).toBe('cyberagent/debug-report/v1')
      expect(typeof report.generatedAt).toBe('string')
      expect(report.sessionStartMs).toBe(0)
      expect(report.btTree).toBeNull()
      expect(report.blackboard).toEqual({})
      expect(report.errors).toEqual([])
      expect(report.performance.tickRateFps).toBe(12.5)
      expect(report.performance.avgLatencyMs).toBe(3.2)
      expect(report.performance.totalEvents).toBe(0)
    })
  })

  it('serializes BT tree structure', () => {
    const options = { ...defaultOptions, tree: makeTree() }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      const tree = report.btTree as NonNullable<typeof report.btTree>
      expect(tree.name ?? '').toBe('root')
      expect(tree.type).toBe('root')
      expect(tree.status).toBe('success')
      expect(tree.children.length).toBe(1)
      expect(tree.children[0]!.name).toBe('seq1')
    })
  })

  it('filters blackboard internal fields', () => {
    const bb = {
      _internal: 'skip',
      positionX: 42,
      emotion: 'happy',
      pointerX: 100, // canvas-specific → skip
      pointerY: 200, // canvas-specific → skip
      energy: 0.8,
    } as unknown as Blackboard

    const options = { ...defaultOptions, blackboard: bb }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      const b = report.blackboard as Record<string, unknown>
      expect(b).not.toHaveProperty('_internal')
      expect(b).not.toHaveProperty('pointerX')
      expect(b).not.toHaveProperty('pointerY')
      expect((b.positionX ?? 0)).toBe(42)
      expect((b.emotion ?? '')).toBe('happy')
    })
  })

  it('builds error entries with preceding context', () => {
    const adapterEvts: TracerEvent[] = [
      makeEvent(100, 'adapter.tx' as TracerEventType, 'tick'),
      makeEvent(200, 'adapter.rx' as TracerEventType, 'node-enter-seq1'),
      makeEvent(400, 'adapter.tx' as TracerEventType, 'move'),
    ]

    const options = {
      ...defaultOptions,
      errors: [makeEvent(300, 'error' as TracerEventType, 'motor timeout')],
      adapterEvents: adapterEvts,
    }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      expect(report.errors.length).toBe(1)
      const err = report.errors[0]!
      expect(err.t).toBe(300)
      expect(err.message).toBe('motor timeout')
      // Should have preceding events within 2s window (adapter.tx at 100, adapter.rx at 200)
      expect(err.precedingEvents.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('includes character config when provided', () => {
    const valConfig: ValConfig = { initial: { valence: 0.5, arousal: 0.3, dominance: 0.4 }, baseline: { valence: 0.5, arousal: 0.5, dominance: 0.5 } }
    const memoryConfig: MemoryConfig = { enabled: true, halfLifeMs: 3600000 }
    const perceptionConfig: PerceptionConfig = { enabled: true, categories: ['see.face'] }

    const options = {
      ...defaultOptions,
      emotionPreset: 'playful-dog',
      valConfig,
      memoryConfig,
      perceptionConfig,
    }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      expect(report.character).toBe('playful-dog')
      const cfg = report.characterConfig
      expect(cfg).toBeDefined()
      expect(cfg!.emotionPreset).toBe('playful-dog')
      expect(cfg!.valConfig).toEqual(valConfig)
    })
  })

  it('truncates policy results to last 20', () => {
    const policies: PolicyResult[] = Array.from({ length: 30 }, (_, i) => ({
      modelId: `model-${i}`,
      actionVector: [0.1, 0.2],
      confidence: 0.9,
      latencyMs: 50 + i,
      timestamp: 1000 + i * 100,
    }))

    const options = { ...defaultOptions, policyResults: policies }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      const results = report.recentPolicyResults
      expect(results.length).toBe(20)
      // Should be the last 20 (indices 10-29)
      expect(results[0]!.modelId).toBe('model-10')
    })
  })

  it('truncates perception events to last 50', () => {
    const perceptions: TracerEvent[] = Array.from({ length: 80 }, (_, i) =>
      makeEvent(1000 + i * 100, 'perception' as TracerEventType, `see.object-${i}`),
    )

    const options = { ...defaultOptions, perceptionEvents: perceptions }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      expect(report.recentPerceptionEvents.length).toBe(50)
    })
  })

  it('truncates adapter events to last 100', () => {
    const adapters: TracerEvent[] = Array.from({ length: 150 }, (_, i) => ({
      ...makeEvent(1000 + i * 100, (i % 2 === 0 ? 'adapter.tx' : 'adapter.rx') as TracerEventType),
    }))

    const options = { ...defaultOptions, adapterEvents: adapters }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      expect(report.recentAdapterEvents.length).toBe(100)
    })
  })

  it('copyToClipboard returns true on success', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
    })

    const { result } = renderHook(() => useDebugReport(defaultOptions))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.copyToClipboard()
    })

    expect(success).toBe(true)
  })

  it('copyToClipboard returns false on failure', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
    })

    const { result } = renderHook(() => useDebugReport(defaultOptions))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.copyToClipboard()
    })

    expect(success).toBe(false)
  })

  it('sessionStartMs is set from earliest event timestamp', () => {
    const events: TracerEvent[] = [
      makeEvent(500, 'tick.start' as TracerEventType),
      makeEvent(1000, 'node.enter' as TracerEventType, 'seq1'),
      makeEvent(2000, 'adapter.tx' as TracerEventType, 'move'),
    ]

    const options = { ...defaultOptions, policyEvents: events }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      expect(report.sessionStartMs).toBe(500)
    })
  })

  it('performance includes perception and policy counts', () => {
    const perceptions: TracerEvent[] = [makeEvent(1, 'perception' as TracerEventType), makeEvent(2, 'perception' as TracerEventType)]
    const policies: PolicyResult[] = [{ modelId: 'm', actionVector: [], confidence: 0.9, latencyMs: 50, timestamp: 1 }]

    const options = { ...defaultOptions, perceptionEvents: perceptions, policyResults: policies }
    const { result } = renderHook(() => useDebugReport(options))

    act(() => {
      const report = result.current.generate()
      expect(report.performance.perceptionEventCount).toBe(2)
      expect(report.performance.policyInvocationCount).toBe(1)
    })
  })
})
