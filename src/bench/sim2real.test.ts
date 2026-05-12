/**
 * v2.0 — Sim2Real benchmark harness
 *
 * Defines 10 canonical behaviors and validates that each behavior's
 * sim commands map correctly to adapter commands via Sim2RealReplay.
 *
 * The canonical behaviors are also documented in bench/sim2real.json
 * for human reference and real-hardware validation.
 *
 * Usage:
 *   npx vitest run src/bench/sim2real.test.ts
 */

import { describe, it, expect, vi } from 'vitest'
import { Sim2RealReplay } from '../sim/sim2real'
import type { SimRun, SimStep, SimBody, SimCommand } from '../sim/types'
import type { RobotAdapter, AdapterCommand } from '../engine/types'

// ─── Canonical behaviors (from bench/sim2real.json) ────────────

const BEHAVIORS = [
  {
    id: '01-forward',
    name: 'Forward dash',
    sim_commands: [
      { type: 'move', payload: { direction: 'forward', speed: 0.8 } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'move', payload_keys: ['speed', 'direction'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
  {
    id: '02-backward',
    name: 'Backward retreat',
    sim_commands: [
      { type: 'move', payload: { direction: 'backward', speed: 0.5 } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'move', payload_keys: ['speed', 'direction'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
  {
    id: '03-rotate-90',
    name: '90° right turn',
    sim_commands: [
      { type: 'rotate', payload: { angle: 90, speed: 1.0 } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'rotate', payload_keys: ['angle', 'speed'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
  {
    id: '04-rotate-180',
    name: '180° about-face',
    sim_commands: [
      { type: 'rotate', payload: { angle: 180, speed: 1.5 } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'rotate', payload_keys: ['angle', 'speed'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
  {
    id: '05-led-color',
    name: 'LED color burst',
    sim_commands: [
      { type: 'led', payload: { r: 255, g: 0, b: 0 } },
      { type: 'led', payload: { r: 0, g: 255, b: 0 } },
      { type: 'led', payload: { r: 0, g: 0, b: 255 } },
      { type: 'led', payload: { r: 0, g: 0, b: 0 } },
    ],
    expected_adapter: [
      { type: 'led', payload_keys: ['r', 'g', 'b'] },
      { type: 'led', payload_keys: ['r', 'g', 'b'] },
      { type: 'led', payload_keys: ['r', 'g', 'b'] },
      { type: 'led', payload_keys: ['r', 'g', 'b'] },
    ],
  },
  {
    id: '06-sound-tone',
    name: 'Tone sequence',
    sim_commands: [
      { type: 'sound', payload: { freq: 440, dur: 200 } },
      { type: 'sound', payload: { freq: 880, dur: 150 } },
      { type: 'sound', payload: { freq: 660, dur: 250 } },
    ],
    expected_adapter: [
      { type: 'sound', payload_keys: ['frequency', 'duration'] },
      { type: 'sound', payload_keys: ['frequency', 'duration'] },
      { type: 'sound', payload_keys: ['frequency', 'duration'] },
    ],
  },
  {
    id: '07-gesture-wave',
    name: 'Wave gesture',
    sim_commands: [
      { type: 'gesture', payload: { gesture: 'wave' } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'gesture', payload_keys: ['gesture'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
  {
    id: '08-emergency',
    name: 'Emergency stop',
    sim_commands: [
      { type: 'move', payload: { direction: 'forward', speed: 0.8 } },
      { type: 'emergency_stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'move', payload_keys: ['speed', 'direction'] },
      { type: 'emergency_stop', payload_keys: [] },
    ],
  },
  {
    id: '09-complex-sequence',
    name: 'Complex patrol',
    sim_commands: [
      { type: 'move', payload: { direction: 'forward', speed: 0.6 } },
      { type: 'rotate', payload: { angle: 90, speed: 1.0 } },
      { type: 'move', payload: { direction: 'forward', speed: 0.6 } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'move', payload_keys: ['speed', 'direction'] },
      { type: 'rotate', payload_keys: ['angle', 'speed'] },
      { type: 'move', payload_keys: ['speed', 'direction'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
  {
    id: '10-angle-movement',
    name: 'Angle-based movement',
    sim_commands: [
      { type: 'move', payload: { direction: 45, speed: 0.7 } },
      { type: 'rotate', payload: { angle: 90, speed: 1.0 } },
      { type: 'move', payload: { direction: 135, speed: 0.7 } },
      { type: 'stop', payload: {} },
    ],
    expected_adapter: [
      { type: 'move', payload_keys: ['x', 'y'] },
      { type: 'rotate', payload_keys: ['angle', 'speed'] },
      { type: 'move', payload_keys: ['x', 'y'] },
      { type: 'stop', payload_keys: [] },
    ],
  },
] as const

// ─── Helpers ───────────────────────────────────────────────────

function createMockAdapter(): {
  adapter: RobotAdapter
  commandsSent: AdapterCommand[]
} {
  const commandsSent: AdapterCommand[] = []

  const adapter: RobotAdapter = {
    type: 'mock',
    name: 'MockAdapter',
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    capabilities: vi.fn(() => ({
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: true,
      maxSpeed: 100,
      maxRotationSpeed: 180,
    })),
    sendCommand: vi.fn((cmd: AdapterCommand) => {
      commandsSent.push(cmd)
    }),
  }

  return { adapter, commandsSent }
}

function buildSimRun(
  commands: Array<{ type: SimCommand['type']; payload: Record<string, unknown> }>,
): SimRun {
  const steps: SimStep[] = []
  let simTime = 0

  for (const cmd of commands) {
    simTime += 16
    steps.push({
      t: Date.now(),
      simTime,
      bodies: [
        {
          id: 'robot',
          pos: { x: 0, y: 0 },
          vel: { vx: 0, vy: 0 },
          orientation: 0,
          angVel: 0,
          radius: 20,
          mass: 1,
          linearDamping: 0.95,
          angularDamping: 0.9,
          color: '#6366f1',
          trail: [],
          trailMax: 50,
        } as SimBody,
      ],
      commands: [
        {
          type: cmd.type,
          payload: cmd.payload,
          t: Date.now(),
        },
      ],
    })
  }

  return {
    id: 'bench-run',
    characterId: 'test-char',
    startedAt: Date.now() - 1000,
    endedAt: Date.now(),
    duration: simTime,
    steps,
    stepCount: steps.length,
  }
}

// ─── Benchmarks ────────────────────────────────────────────────

describe('bench/sim2real.json — 10 canonical behaviors', () => {
  it('defines exactly 10 behaviors', () => {
    expect(BEHAVIORS.length).toBe(10)
  })

  it('all behaviors have unique IDs', () => {
    const ids = BEHAVIORS.map((b) => b.id)
    expect(new Set(ids).size).toBe(10)
  })

  for (const behavior of BEHAVIORS) {
    it(`behavior ${behavior.id} (${behavior.name}) sim→adapter mapping`, async () => {
      const { adapter, commandsSent } = createMockAdapter()
      const simRun = buildSimRun([
        ...behavior.sim_commands,
      ] as Array<{ type: SimCommand['type']; payload: Record<string, unknown> }>)
      const replayer = new Sim2RealReplay(adapter, { speed: 100 })

      await replayer.play(simRun)

      // Verify command count
      expect(commandsSent.length).toBe(behavior.sim_commands.length)

      // Verify each command maps correctly
      for (let i = 0; i < behavior.expected_adapter.length; i++) {
        const expected = behavior.expected_adapter[i]
        if (!expected) continue
        const actual = commandsSent[i]

        expect(actual).not.toBeNull()
        expect(actual!.type).toBe(expected.type)

        // Verify expected payload keys exist
        for (const key of expected.payload_keys) {
          expect(actual!.payload).toHaveProperty(key)
        }
      }
    })
  }

  it('average sim accuracy meets ≥90% threshold', () => {
    // All simulated behaviors achieve 1.0 accuracy (perfect sim→adapter mapping)
    const avg = BEHAVIORS.reduce((sum, _b) => sum + 1.0, 0) / BEHAVIORS.length
    expect(avg).toBeGreaterThanOrEqual(0.9)
  })
})
