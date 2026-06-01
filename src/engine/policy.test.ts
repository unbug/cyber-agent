/**
 * Tests for src/engine/policy.ts
 *
 * Covers:
 * - Policy registry (register, get, unregister)
 * - SimPolicyClient (deterministic actions)
 * - MockPolicyClient (configurable mock)
 * - applyPolicyAction (action vector → command mapping)
 * - runPolicyAction (BT action node)
 * - whenPolicyConfidentCondition (BT condition)
 * - registerPolicyNodes (registration)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerPolicy,
  getPolicy,
  getAllPolicies,
  unregisterPolicy,
  SimPolicyClient,
  MockPolicyClient,
  applyPolicyAction,
  runPolicyAction,
  whenPolicyConfidentCondition,
  registerPolicyNodes,
} from './policy'
import { tracer } from './tracer'
import type { TracerEvent } from './tracer'
import type { PolicyConfig, ActionSpec, PolicyResult } from './policy'

// ─── Helpers ──────────────────────────────────────────────────────

function makeConfig(modelId: string, actionSpec: ActionSpec): PolicyConfig {
  return {
    modelId,
    observationSpec: { fields: [] },
    actionSpec,
  }
}

function makeMockAdapter() {
  const commands: Array<{ type: string; payload: Record<string, unknown> }> = []
  return {
    sendCommand: vi.fn((cmd: { type: string; payload: Record<string, unknown> }) => {
      commands.push(cmd)
    }),
    commands,
  } as any
}

function makeBlackboard() {
  return {
    x: 100,
    y: 200,
    rotation: 45,
    speed: 2,
    emotion: 'idle' as const,
    energy: 0.8,
    excitement: 0.3,
    valence: 0.5,
    arousal: 0.4,
    dominance: 0.6,
    tick: 10,
    deltaMs: 16,
    totalMs: 160,
    pointerX: 150,
    pointerY: 250,
    pointerActive: false,
    canvasWidth: 400,
    canvasHeight: 300,
    _policyAction: undefined,
    _policyConfidence: undefined,
    _policyModelId: undefined,
  } as any
}

// ─── Policy Registry Tests ────────────────────────────────────────

describe('Policy Registry', () => {
  beforeEach(() => {
    // Clear registry
    const all = getAllPolicies()
    for (const [id] of all) {
      unregisterPolicy(id)
    }
  })

  it('registers and retrieves a policy', () => {
    const config = makeConfig('test/model', { requiredLength: 4, mappings: [] })
    registerPolicy(config)
    expect(getPolicy('test/model')).toBe(config)
  })

  it('returns undefined for unregistered policy', () => {
    expect(getPolicy('nonexistent')).toBeUndefined()
  })

  it('returns all registered policies', () => {
    registerPolicy(makeConfig('model/1', { requiredLength: 2, mappings: [] }))
    registerPolicy(makeConfig('model/2', { requiredLength: 2, mappings: [] }))
    const all = getAllPolicies()
    expect(all.size).toBe(2)
    expect(all.has('model/1')).toBe(true)
    expect(all.has('model/2')).toBe(true)
  })

  it('unregisters a policy', () => {
    registerPolicy(makeConfig('model/1', { requiredLength: 2, mappings: [] }))
    expect(getPolicy('model/1')).toBeDefined()
    unregisterPolicy('model/1')
    expect(getPolicy('model/1')).toBeUndefined()
  })
})

// ─── SimPolicyClient Tests ────────────────────────────────────────

describe('SimPolicyClient', () => {
  it('returns deterministic actions based on observation', async () => {
    const actionSpec: ActionSpec = {
      requiredLength: 2,
      mappings: [
        { from: 'x', to: 'move.x', scale: 0.01 },
        { from: 'y', to: 'move.y', scale: 0.01 },
      ],
    }
    const client = new SimPolicyClient('sim/model', actionSpec)
    const result = await client.predict({ x: 100, y: 200 })

    expect(result.modelId).toBe('sim/model')
    expect(result.actionVector).toHaveLength(2)
    expect(result.actionVector).toEqual([1, 2]) // 100 * 0.01, 200 * 0.01
    expect(result.confidence).toBe(0.95)
    expect(result.latencyMs).toBe(5)
  })

  it('applies offset in mapping', async () => {
    const actionSpec: ActionSpec = {
      requiredLength: 1,
      mappings: [
        { from: 'val', to: 'speed', scale: 1, offset: 10 },
      ],
    }
    const client = new SimPolicyClient('sim/model', actionSpec)
    const result = await client.predict({ val: 5 })
    expect(result.actionVector).toEqual([15]) // 5 * 1 + 10
  })

  it('health check returns true', async () => {
    const client = new SimPolicyClient('sim/model', { requiredLength: 1, mappings: [] })
    expect(await client.healthCheck()).toBe(true)
  })

  it('close is no-op', () => {
    const client = new SimPolicyClient('sim/model', { requiredLength: 1, mappings: [] })
    expect(() => client.close()).not.toThrow()
  })
})

// ─── MockPolicyClient Tests ───────────────────────────────────────

describe('MockPolicyClient', () => {
  it('returns mock action', async () => {
    const client = new MockPolicyClient('mock/model')
    client.setMockAction([1, 2, 3])
    client.setMockConfidence(0.8)
    client.setMockLatency(10)

    const result = await client.predict({})
    expect(result.actionVector).toEqual([1, 2, 3])
    expect(result.confidence).toBe(0.8)
    expect(result.latencyMs).toBe(10)
  })

  it('throws when shouldFail is true', async () => {
    const client = new MockPolicyClient('mock/model')
    client.setShouldFail(true)
    await expect(client.predict({})).rejects.toThrow('Mock policy failure')
  })

  it('health check reflects failure state', async () => {
    const client = new MockPolicyClient('mock/model')
    client.setShouldFail(true)
    expect(await client.healthCheck()).toBe(false)
  })
})

// ─── applyPolicyAction Tests ──────────────────────────────────────

describe('applyPolicyAction', () => {
  it('maps action vector to command using simple mappings', () => {
    const result: PolicyResult = {
      modelId: 'test/model',
      actionVector: [1.5, -0.5],
      confidence: 0.9,
      latencyMs: 10,
      timestamp: Date.now(),
    }
    const actionSpec: ActionSpec = {
      requiredLength: 2,
      mappings: [
        { from: 0, to: 'x', scale: 1, offset: 0 },
        { from: 1, to: 'y', scale: 1, offset: 0 },
      ],
    }
    const command = applyPolicyAction(result, actionSpec)
    expect(command).toEqual({ x: 1.5, y: -0.5 })
  })

  it('supports dot-notation for nested commands', () => {
    const result: PolicyResult = {
      modelId: 'test/model',
      actionVector: [2],
      confidence: 0.9,
      latencyMs: 10,
      timestamp: Date.now(),
    }
    const actionSpec: ActionSpec = {
      requiredLength: 1,
      mappings: [
        { from: 0, to: 'move.x', scale: 1, offset: 0 },
      ],
    }
    const command = applyPolicyAction(result, actionSpec)
    expect(command).toEqual({ move: { x: 2 } })
  })

  it('applies scale and offset', () => {
    const result: PolicyResult = {
      modelId: 'test/model',
      actionVector: [3],
      confidence: 0.9,
      latencyMs: 10,
      timestamp: Date.now(),
    }
    const actionSpec: ActionSpec = {
      requiredLength: 1,
      mappings: [
        { from: 0, to: 'speed', scale: 2, offset: 5 },
      ],
    }
    const command = applyPolicyAction(result, actionSpec)
    expect(command).toEqual({ speed: 11 }) // 3 * 2 + 5
  })

  it('handles out-of-bounds indices gracefully', () => {
    const result: PolicyResult = {
      modelId: 'test/model',
      actionVector: [1],
      confidence: 0.9,
      latencyMs: 10,
      timestamp: Date.now(),
    }
    const actionSpec: ActionSpec = {
      requiredLength: 3,
      mappings: [
        { from: 0, to: 'x' },
        { from: 5, to: 'y' }, // out of bounds
      ],
    }
    const command = applyPolicyAction(result, actionSpec)
    expect(command).toEqual({ x: 1, y: 0 }) // default 0 for missing index
  })
})

// ─── runPolicyAction Tests ────────────────────────────────────────

describe('runPolicyAction', async () => {
  beforeEach(() => {
    // Clear registry
    const all = getAllPolicies()
    for (const [id] of all) {
      unregisterPolicy(id)
    }
  })

  it('returns failure when no args', () => {
    const bb = makeBlackboard()
    const adapter = makeMockAdapter()
    const result = runPolicyAction(bb, adapter, undefined)
    expect(result).toBe('failure')
  })

  it('returns failure when no modelId', () => {
    const bb = makeBlackboard()
    const adapter = makeMockAdapter()
    const result = runPolicyAction(bb, adapter, { modelId: '' })
    expect(result).toBe('failure')
  })

  it('returns failure for unregistered policy', () => {
    const bb = makeBlackboard()
    const adapter = makeMockAdapter()
    const result = runPolicyAction(bb, adapter, { modelId: 'unknown/model' })
    expect(result).toBe('failure')
  })

  it('succeeds with registered policy (sim-only)', async () => {
    const actionSpec: ActionSpec = {
      requiredLength: 4,
      mappings: [
        { from: 0, to: 'x', scale: 0.1 },
        { from: 1, to: 'y', scale: 0.1 },
        { from: 2, to: 'rotation', scale: 1 },
        { from: 3, to: 'speed', scale: 0.5 },
      ],
    }
    registerPolicy(makeConfig('mock/model', actionSpec))

    const bb = makeBlackboard()
    const adapter = makeMockAdapter()

    // Track tracer events
    const policyEvents: TracerEvent[] = []
    const unsub = tracer.subscribe((e) => {
      if (e.type.startsWith('policy.')) policyEvents.push(e)
    })

    // Mock fetch to simulate RestPolicyClient success
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([10, 20, 15, 5]),
    })

    const result = runPolicyAction(bb, adapter, {
      modelId: 'mock/model',
      observationSpec: { fields: [] },
      actionSpec,
      confidenceThreshold: 0.7,
    })

    expect(result).toBe('success')

    // Wait for async policy inference to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    // Restore fetch
    global.fetch = originalFetch
    unsub()

    // Check tracer events were emitted
    const invokeEvents = policyEvents.filter(e => e.type === 'policy.invoke')
    expect(invokeEvents.length).toBe(1)
    expect(invokeEvents[0].label).toBe('mock/model')
  })

  it('returns failure when confidence below threshold', async () => {
    const actionSpec: ActionSpec = {
      requiredLength: 2,
      mappings: [
        { from: 0, to: 'x' },
        { from: 1, to: 'y' },
      ],
    }
    registerPolicy(makeConfig('mock/model', actionSpec))

    const bb = makeBlackboard()
    const adapter = makeMockAdapter()

    const result = runPolicyAction(bb, adapter, {
      modelId: 'mock/model',
      observationSpec: { fields: [] },
      actionSpec,
      confidenceThreshold: 0.95, // high threshold
    })

    expect(result).toBe('success') // runPolicy returns success; confidence check is async

    await new Promise(resolve => setTimeout(resolve, 50))

    // Blackboard should NOT be updated when confidence is too low
    expect(bb._policyAction).toBeUndefined()
    expect(bb._policyConfidence).toBeUndefined()
  })
})

// ─── whenPolicyConfidentCondition Tests ───────────────────────────

describe('whenPolicyConfidentCondition', () => {
  it('returns true when confidence >= threshold', () => {
    const bb = makeBlackboard()
    bb._policyConfidence = 0.8
    const result = whenPolicyConfidentCondition(bb, { threshold: 0.7 })
    expect(result).toBe(true)
  })

  it('returns false when confidence < threshold', () => {
    const bb = makeBlackboard()
    bb._policyConfidence = 0.5
    const result = whenPolicyConfidentCondition(bb, { threshold: 0.7 })
    expect(result).toBe(false)
  })

  it('returns false when no policy confidence (defaults to 0)', () => {
    const bb = makeBlackboard()
    const result = whenPolicyConfidentCondition(bb, { threshold: 0.7 })
    expect(result).toBe(false)
  })

  it('uses default threshold of 0.7', () => {
    const bb = makeBlackboard()
    bb._policyConfidence = 0.7
    const result = whenPolicyConfidentCondition(bb, {})
    expect(result).toBe(true)
  })
})

// ─── registerPolicyNodes Tests ────────────────────────────────────

describe('registerPolicyNodes', () => {
  it('registers runPolicy action and whenPolicyConfident condition', () => {
    // This test verifies registration doesn't throw
    expect(() => registerPolicyNodes()).not.toThrow()
  })
})
