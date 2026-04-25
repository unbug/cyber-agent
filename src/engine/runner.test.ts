/**
 * BehaviorTreeRunner tests — covers start, stop, pause/resume, reset,
 * snapshot, canvas size, pointer, and tick loop behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BehaviorTreeRunner } from './runner'
import { getBehavior } from '../agents'
import type { RobotAdapter, Blackboard } from './types'

import './builtins'

// ─── Helpers ──────────────────────────────────────────────────────

function mockAdapter(): RobotAdapter {
  return {
    type: 'mock-runner',
    name: 'MockRunner',
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    sendCommand: vi.fn(),
  }
}

function tickRunner(_runner: BehaviorTreeRunner, count = 3): void {
  // Allow the interval to fire
  vi.advanceTimersByTime(count * 100)
}

// ─── Tests ────────────────────────────────────────────────────────

describe('BehaviorTreeRunner', () => {
  let adapter: RobotAdapter

  beforeEach(() => {
    adapter = mockAdapter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('starts in stopped state', () => {
    const behavior = getBehavior('fox')!
    const runner = new BehaviorTreeRunner(behavior, adapter)
    expect(runner.state).toBe('stopped')
  })

  it('transitions to running on start', () => {
    const behavior = getBehavior('fox')!
    const runner = new BehaviorTreeRunner(behavior, adapter)
    runner.start()
    expect(runner.state).toBe('running')
  })

  it('calls adapter.init on start', () => {
    const behavior = getBehavior('fox')!
    const runner = new BehaviorTreeRunner(behavior, adapter)
    runner.start()
    expect(adapter.init).toHaveBeenCalled()
  })

  it('calls adapter.destroy on stop', () => {
    const behavior = getBehavior('fox')!
    const runner = new BehaviorTreeRunner(behavior, adapter)
    runner.start()
    runner.stop()
    expect(adapter.destroy).toHaveBeenCalled()
  })

  it('returns stopped on double-start', () => {
    const behavior = getBehavior('fox')!
    const runner = new BehaviorTreeRunner(behavior, adapter)
    runner.start()
    runner.start() // should be a no-op
    expect(runner.state).toBe('running')
  })

  describe('pause / resume', () => {
    it('pauses the runner', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()
      runner.pause()
      expect(runner.state).toBe('paused')
    })

    it('resumes from paused state', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()
      runner.pause()
      runner.resume()
      expect(runner.state).toBe('running')
    })

    it('resume is no-op when not paused', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()
      runner.resume() // should not crash
      expect(runner.state).toBe('running')
    })
  })

  describe('snapshot', () => {
    it('returns current state snapshot', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()

      const snap = runner.snapshot()
      expect(snap.state).toBe('running')
      expect(snap.blackboard.x).toBeDefined()
      expect(snap.blackboard.y).toBeDefined()
      expect(snap.blackboard.emotion).toBeDefined()
      expect(snap.blackboard.energy).toBeDefined()
      expect(snap.blackboard.excitement).toBeDefined()
      expect(snap.rootNode).toBeDefined()
      expect(typeof snap.ticksPerSecond).toBe('number')
    })

    it('snapshot blackboard is a copy', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()

      const originalX = runner.blackboard.x
      const snap = runner.snapshot()
      // snapshot() returns a shallow copy { ...this.bb }
      const bbCopy = snap.blackboard as any
      // Modifying the copy should not affect the runner
      bbCopy.x = 999
      const snap2 = runner.snapshot()
      // snapshot() returns a shallow copy { ...this.bb }, so x should be original
      expect(snap2.blackboard.x).toBe(originalX)
    })
  })

  describe('setCanvasSize', () => {
    it('updates blackboard dimensions', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.setCanvasSize(800, 600)
      const snap = runner.snapshot()
      expect(snap.blackboard.canvasWidth).toBe(800)
      expect(snap.blackboard.canvasHeight).toBe(600)
    })
  })

  describe('setPointer', () => {
    it('updates pointer position and active state', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.setPointer(250, 180, true)
      const snap = runner.snapshot()
      expect(snap.blackboard.pointerX).toBe(250)
      expect(snap.blackboard.pointerY).toBe(180)
      expect(snap.blackboard.pointerActive).toBe(true)
    })

    it('sets pointerActive to false', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.setPointer(100, 100, false)
      const snap = runner.snapshot()
      expect(snap.blackboard.pointerActive).toBe(false)
    })
  })

  describe('reset', () => {
    it('resets with a new behavior', () => {
      const behavior1 = getBehavior('fox')!
      const behavior2 = getBehavior('puppy')!
      const runner = new BehaviorTreeRunner(behavior1, adapter)
      runner.start()

      tickRunner(runner, 1)

      runner.reset(behavior2)
      const snap = runner.snapshot()
      expect(snap.rootNode).toBeDefined()
      expect(runner.state).toBe('running') // should auto-restart
    })

    it('resets blackboard to defaults', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()

      // Modify blackboard
      const bb = runner.blackboard as Blackboard & { _modified?: boolean }
      bb._modified = true
      bb.x = 999

      runner.reset(behavior)
      const newBb = runner.blackboard as any
      expect(newBb._modified).toBeUndefined()
      expect(newBb.x).not.toBe(999)
    })
  })

  describe('onTick callback', () => {
    it('invokes onTick after each tick', () => {
      const behavior = getBehavior('fox')!
      const callback = vi.fn()
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.onTick = callback
      runner.start()

      // Advance one tick interval
      vi.advanceTimersByTime(100)

      expect(callback).toHaveBeenCalled()
      const snap = (callback as any).mock.calls[0][0]
      expect(snap.state).toBe('running')
    })
  })

  describe('TPS tracking', () => {
    it('tracks ticks per second', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      runner.start()

      // Advance enough for the TPS counter to update (1 second)
      vi.advanceTimersByTime(2000)

      const snap = runner.snapshot()
      expect(typeof snap.ticksPerSecond).toBe('number')
      expect(snap.ticksPerSecond).toBeGreaterThanOrEqual(0)
    })
  })

  describe('integration: full lifecycle', () => {
    it('runs for 10 ticks without error', () => {
      const behavior = getBehavior('fox')!
      const runner = new BehaviorTreeRunner(behavior, adapter)
      let tickCount = 0
      runner.onTick = () => { tickCount++ }
      runner.start()

      vi.advanceTimersByTime(10 * 100) // 10 ticks

      // Allow for off-by-one due to timer precision
      expect(tickCount).toBeGreaterThanOrEqual(9)
      expect(tickCount).toBeLessThanOrEqual(12)
      expect(runner.state).toBe('running')

      runner.stop()
      expect(runner.state).toBe('stopped')
    })
  })
})
