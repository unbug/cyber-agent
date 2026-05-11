/**
 * v2.0 — Sim2Real replay tests
 *
 * Tests for the Sim2RealReplay class and the simCommandToAdapter mapping.
 */

import { describe, it, expect, vi } from 'vitest'
import { Sim2RealReplay, DEFAULT_REPLAY_CONFIG } from './sim2real'
import type { SimCommand, SimRun, SimStep, SimBody } from './types'
import type { RobotAdapter, AdapterCommand } from '../engine/types'

// Mock adapter
function createMockAdapter(): { 
  adapter: RobotAdapter
  commandsSent: AdapterCommand[]
  lastCommand: AdapterCommand | null
} {
  const commandsSent: AdapterCommand[] = []
  let lastCommand: AdapterCommand | null = null

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
      lastCommand = cmd
    }),
  }

  return { adapter, commandsSent, lastCommand }
}

function makeRun(
  commandTypes: SimCommand['type'][],
): SimRun {
  const steps: SimStep[] = []
  let simTime = 0

  for (const type of commandTypes) {
    simTime += 16
    steps.push({
      t: Date.now(),
      simTime,
      bodies: [
        {
          id: 'robot',
          pos: { x: 100, y: 100 },
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
          type,
          payload: type === 'move' ? { speed: 0.5 } : {},
          t: Date.now(),
        },
      ],
    })
  }

  return {
    id: 'test-run',
    characterId: 'test-char',
    startedAt: Date.now() - 1000,
    endedAt: Date.now(),
    duration: 1000,
    steps,
    stepCount: steps.length,
  }
}

describe('Sim2RealReplay', () => {
  it('maps move command to adapter command', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const run = makeRun(['move'])
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100, // fast for test
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('move')
    expect(commandsSent[0]!.payload).toHaveProperty('speed')
  })

  it('maps rotate command to adapter command', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const run = makeRun(['rotate'])
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('rotate')
    expect(commandsSent[0]!.payload).toHaveProperty('angle')
  })

  it('maps stop command to adapter command', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const run = makeRun(['stop'])
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('stop')
  })

  it('maps gesture command to adapter command', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const run = makeRun(['gesture'])
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('gesture')
  })

  it('maps led command to adapter command with clamped RGB', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const steps: SimStep[] = [
      {
        t: Date.now(),
        simTime: 0,
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
            type: 'led',
            payload: { r: 255, g: 128, b: 64 },
            t: Date.now(),
          },
        ],
      },
    ]
    const run: SimRun = {
      id: 'test-run',
      characterId: 'test-char',
      startedAt: Date.now() - 1000,
      endedAt: Date.now(),
      duration: 1000,
      steps,
      stepCount: 1,
    }
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('led')
    expect((commandsSent[0]!.payload as any).r).toBe(255)
    expect((commandsSent[0]!.payload as any).g).toBe(128)
    expect((commandsSent[0]!.payload as any).b).toBe(64)
  })

  it('maps sound command to adapter command', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const steps: SimStep[] = [
      {
        t: Date.now(),
        simTime: 0,
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
            type: 'sound',
            payload: { freq: 440, dur: 200 },
            t: Date.now(),
          },
        ],
      },
    ]
    const run: SimRun = {
      id: 'test-run',
      characterId: 'test-char',
      startedAt: Date.now() - 1000,
      endedAt: Date.now(),
      duration: 1000,
      steps,
      stepCount: 1,
    }
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('sound')
    expect((commandsSent[0]!.payload as any).frequency).toBe(440)
    expect((commandsSent[0]!.payload as any).duration).toBe(200)
  })

  it('maps emergency_stop command', async () => {
    const { adapter, commandsSent } = createMockAdapter()
    const run = makeRun(['emergency_stop'])
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
    })

    await replayer.play(run)

    expect(commandsSent!.length).toBe(1)
    expect(commandsSent[0]!.type).toBe('emergency_stop')
  })

  it('aborts mid-playback', async () => {
    const { adapter } = createMockAdapter()
    const steps: SimStep[] = []
    for (let i = 0; i < 100; i++) {
      steps.push({
        t: Date.now(),
        simTime: i * 16,
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
        commands: [{ type: 'move', payload: { speed: 0.5 }, t: Date.now() }],
      })
    }
    const run: SimRun = {
      id: 'test-run',
      characterId: 'test-char',
      startedAt: Date.now() - 1000,
      endedAt: Date.now(),
      duration: 1000,
      steps,
      stepCount: 100,
    }

    const replayer = new Sim2RealReplay(adapter, {
      speed: 0.1, // slow
    })

    const playPromise = replayer.play(run)
    // Abort after a short delay
    setTimeout(() => replayer.abort(), 50)
    await playPromise

    expect(replayer.isRunning).toBe(false)
  })

  it('calls onComplete when replay finishes', async () => {
    const { adapter } = createMockAdapter()
    const run = makeRun(['move'])
    const onComplete = vi.fn()
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
      onComplete,
    })

    await replayer.play(run)

    expect(onComplete).toHaveBeenCalled()
  })

  it('calls onCommand for each command sent', async () => {
    const { adapter } = createMockAdapter()
    const run = makeRun(['move', 'rotate', 'stop'])
    const onCommand = vi.fn()
    const replayer = new Sim2RealReplay(adapter, {
      speed: 100,
      onCommand,
    })

    await replayer.play(run)

    expect(onCommand).toHaveBeenCalledTimes(3)
  })

  it('has correct default config', () => {
    expect(DEFAULT_REPLAY_CONFIG.speed).toBe(1)
    expect(DEFAULT_REPLAY_CONFIG.skipIfDisconnected).toBe(true)
  })
})
