/**
 * v2.0 — SimRealComparePanel tests
 *
 * Tests the trace alignment engine and comparison statistics.
 */

import { describe, it, expect } from 'vitest'
import { alignTraces, computeStats, type SimStep, type StepDiff } from './SimRealComparePanel'

// ─── Mock data helpers ───────────────────────────────────────────

function makeSimStep(t: number, commands: Array<{ type: string; payload: Record<string, unknown> }>): SimStep {
  return { t, simTime: t, commands, bodies: [] }
}

function makeRealEvent(t: number, type: string, label: string, payload: Record<string, unknown> = {}): any {
  return { t, type, label, payload }
}

// ─── alignTraces tests ──────────────────────────────────────────

describe('alignTraces', () => {
  it('returns empty array when no sim steps', () => {
    const result = alignTraces([], [makeRealEvent(100, 'adapter.tx', 'move', { command: 'move', speed: 1 })])
    expect(result).toEqual([])
  })

  it('returns empty array when no real events', () => {
    const simSteps = [makeSimStep(100, [{ type: 'move', payload: { speed: 1 } }])]
    const result = alignTraces(simSteps, [])
    expect(result).toHaveLength(1)
    expect(result[0]!.realStep).toBeNull()
  })

  it('aligns steps within tolerance', () => {
    const simSteps = [makeSimStep(100, [{ type: 'move', payload: { speed: 1 } }])]
    const realEvents = [makeRealEvent(105, 'adapter.tx', 'move', { command: 'move', speed: 1.05 })]
    const result = alignTraces(simSteps, realEvents, 50)
    expect(result).toHaveLength(1)
    expect(result[0]!.timeDelta).toBe(5)
    expect(result[0]!.commandsMatch).toBe(true)
  })

  it('marks mismatched commands correctly', () => {
    const simSteps = [makeSimStep(100, [{ type: 'move', payload: { speed: 1 } }])]
    const realEvents = [makeRealEvent(105, 'adapter.tx', 'rotate', { command: 'rotate', angle: 90 })]
    const result = alignTraces(simSteps, realEvents, 50)
    expect(result).toHaveLength(1)
    expect(result[0]!.commandsMatch).toBe(false)
    expect(result[0]!.diffFields).toHaveLength(1)
    expect(result[0]!.diffFields[0]!.field).toBe('command_type')
  })

  it('aligns multiple steps to closest events', () => {
    const simSteps = [
      makeSimStep(100, [{ type: 'move', payload: { speed: 0.5 } }]),
      makeSimStep(200, [{ type: 'rotate', payload: { angle: 90 } }]),
      makeSimStep(300, [{ type: 'stop', payload: {} }]),
    ]
    const realEvents = [
      makeRealEvent(102, 'adapter.tx', 'move', { command: 'move', speed: 0.48 }),
      makeRealEvent(205, 'adapter.tx', 'rotate', { command: 'rotate', angle: 88 }),
      makeRealEvent(298, 'adapter.tx', 'stop', { command: 'stop' }),
    ]
    const result = alignTraces(simSteps, realEvents, 50)
    expect(result).toHaveLength(3)
    expect(result[0]!.timeDelta).toBe(2)
    expect(result[1]!.timeDelta).toBe(5)
    expect(result[2]!.timeDelta).toBe(2)
    expect(result.every((d) => d.commandsMatch)).toBe(true)
  })

  it('respects tolerance threshold', () => {
    const simSteps = [makeSimStep(100, [{ type: 'move', payload: { speed: 1 } }])]
    const realEvents = [makeRealEvent(200, 'adapter.tx', 'move', { command: 'move', speed: 1 })]
    const result = alignTraces(simSteps, realEvents, 50)
    expect(result).toHaveLength(1)
    expect(result[0]!.realStep).toBeNull()
    expect(result[0]!.timeDelta).toBe(100)
  })
})

// ─── computeStats tests ──────────────────────────────────────────

describe('computeStats', () => {
  it('returns zero stats for empty diffs', () => {
    const stats = computeStats([])
    expect(stats.totalSteps).toBe(0)
    expect(stats.matchedSteps).toBe(0)
    expect(stats.commandMatchRate).toBe(0)
  })

  it('computes stats for fully matched traces', () => {
    const diffs: StepDiff[] = [
      {
        simStep: makeSimStep(100, [{ type: 'move', payload: { speed: 1 } }]),
        realStep: makeRealEvent(102, 'adapter.tx', 'move', { command: 'move', speed: 1 }),
        timeDelta: 2,
        commandsMatch: true,
        diffFields: [],
      },
      {
        simStep: makeSimStep(200, [{ type: 'stop', payload: {} }]),
        realStep: makeRealEvent(201, 'adapter.tx', 'stop', { command: 'stop' }),
        timeDelta: 1,
        commandsMatch: true,
        diffFields: [],
      },
    ]
    const stats = computeStats(diffs)
    expect(stats.totalSteps).toBe(2)
    expect(stats.matchedSteps).toBe(2)
    expect(stats.commandMatchRate).toBe(1)
    expect(stats.avgTimeDelta).toBeCloseTo(1.5, 1)
    expect(stats.maxTimeDelta).toBe(2)
  })

  it('computes stats for mismatched traces', () => {
    const diffs: StepDiff[] = [
      {
        simStep: makeSimStep(100, [{ type: 'move', payload: { speed: 1 } }]),
        realStep: makeRealEvent(105, 'adapter.tx', 'rotate', { command: 'rotate', angle: 90 }),
        timeDelta: 5,
        commandsMatch: false,
        diffFields: [{ field: 'command_type', simVal: 'move', realVal: 'rotate' }],
      },
      {
        simStep: makeSimStep(200, [{ type: 'move', payload: { speed: 1 } }]),
        realStep: makeRealEvent(203, 'adapter.tx', 'move', { command: 'move', speed: 0.95 }),
        timeDelta: 3,
        commandsMatch: true,
        diffFields: [{ field: 'speed', simVal: 1, realVal: 0.95 }],
      },
    ]
    const stats = computeStats(diffs)
    expect(stats.totalSteps).toBe(2)
    expect(stats.matchedSteps).toBe(1)
    expect(stats.commandMatchRate).toBe(0.5)
    expect(stats.avgTimeDelta).toBeCloseTo(4, 1)
    expect(stats.maxTimeDelta).toBe(5)
    expect(stats.avgPayloadDelta).toBeCloseTo(1, 1)
  })
})
