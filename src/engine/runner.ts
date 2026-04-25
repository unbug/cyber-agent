/**
 * BehaviorTreeRunner — manages the tick loop for a character's behavior tree.
 *
 * Usage:
 *   const runner = new BehaviorTreeRunner(characterBehavior, adapter)
 *   runner.start()
 *   // ... later
 *   runner.stop()
 */

import type {
  CharacterBehavior,
  Blackboard,
  RobotAdapter,
  RuntimeNode,
} from './types'
import { createBlackboard } from './types'
import { hydrate, tick, resetTree } from './executor'
import { emitTickStart, emitBbSet } from './tracer'

// Ensure all builtins are registered
import './builtins'

export type RunnerState = 'stopped' | 'running' | 'paused'

export interface RunnerSnapshot {
  state: RunnerState
  blackboard: Readonly<Blackboard>
  rootNode: RuntimeNode
  ticksPerSecond: number
}

export class BehaviorTreeRunner {
  private root: RuntimeNode
  private bb: Blackboard
  private adapter: RobotAdapter
  private intervalMs: number
  private timerId: ReturnType<typeof setInterval> | null = null
  private animFrameId: number | null = null
  private lastTickTime = 0
  private _state: RunnerState = 'stopped'
  private _tps = 0
  private _tpsCounter = 0
  private _tpsTimer = 0

  /** Callback invoked after every tick — use for UI updates */
  public onTick: ((snapshot: RunnerSnapshot) => void) | null = null

  constructor(behavior: CharacterBehavior, adapter: RobotAdapter) {
    this.root = hydrate(behavior.tree)
    this.intervalMs = behavior.tickIntervalMs ?? 100
    this.adapter = adapter

    // Create blackboard with defaults
    this.bb = createBlackboard()
    if (behavior.defaults) {
      Object.assign(this.bb, behavior.defaults)
    }
  }

  get state(): RunnerState { return this._state }
  get blackboard(): Readonly<Blackboard> { return this.bb }
  get rootNode(): RuntimeNode { return this.root }

  /** Update canvas dimensions (call on resize) */
  setCanvasSize(width: number, height: number) {
    this.bb.canvasWidth = width
    this.bb.canvasHeight = height
  }

  /** Update pointer position from mouse/touch events */
  setPointer(x: number, y: number, active: boolean) {
    this.bb.pointerX = x
    this.bb.pointerY = y
    this.bb.pointerActive = active
  }

  start() {
    if (this._state === 'running') return

    this._state = 'running'
    this.adapter.init(this.bb)
    this.lastTickTime = performance.now()
    this._tpsTimer = performance.now()

    // Tick loop using setInterval for consistent BT logic rate
    this.timerId = setInterval(() => {
      if (this._state !== 'running') return
      this.doTick()
    }, this.intervalMs)

    // Render loop using requestAnimationFrame for smooth visuals
    const renderLoop = () => {
      if (this._state === 'stopped') return
      this.adapter.update(this.bb)
      this.animFrameId = requestAnimationFrame(renderLoop)
    }
    this.animFrameId = requestAnimationFrame(renderLoop)
  }

  pause() {
    this._state = 'paused'
  }

  resume() {
    if (this._state === 'paused') {
      this._state = 'running'
      this.lastTickTime = performance.now()
    }
  }

  stop() {
    this._state = 'stopped'
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.adapter.destroy()
    resetTree(this.root)
  }

  reset(behavior: CharacterBehavior) {
    const wasRunning = this._state === 'running'
    this.stop()
    this.root = hydrate(behavior.tree)
    this.bb = createBlackboard()
    if (behavior.defaults) {
      Object.assign(this.bb, behavior.defaults)
    }
    if (wasRunning) this.start()
  }

  snapshot(): RunnerSnapshot {
    return {
      state: this._state,
      blackboard: { ...this.bb },
      rootNode: this.root,
      ticksPerSecond: this._tps,
    }
  }

  // ── Private ────────────────────────────────────────────────

  private doTick() {
    const now = performance.now()

    // Emit tick.start
    emitTickStart(now)

    this.bb.deltaMs = now - this.lastTickTime
    this.bb.totalMs += this.bb.deltaMs
    this.bb.tick++
    this.lastTickTime = now

    // Execute behavior tree
    tick(this.root, this.bb, this.adapter)

    // Emit blackboard snapshots for key fields
    const bbFields = ['x', 'y', 'rotation', 'speed', 'emotion', 'energy', 'excitement'] as const
    for (const field of bbFields) {
      emitBbSet(field, this.bb[field], now)
    }

    // TPS counter
    this._tpsCounter++
    if (now - this._tpsTimer >= 1000) {
      this._tps = this._tpsCounter
      this._tpsCounter = 0
      this._tpsTimer = now
    }

    // Notify listeners
    this.onTick?.(this.snapshot())
  }
}
