/**
 * v2.0 — Simulation replay
 *
 * Plays back a recorded SimRun step-by-step.
 * Supports play, pause, step, speed control, and scrubbing.
 */

import { SimEngine } from './engine'
import { SimStep, SimReplayState, SimBody } from './types'

export class SimReplay {
  private engine: SimEngine
  private steps: SimStep[]
  private _state: SimReplayState
  private playing: boolean
  private playbackIndex: number

  constructor(engine: SimEngine) {
    this.engine = engine
    this.steps = []
    this._state = {
      stepIndex: -1,
      currentStep: null,
      playing: false,
      speed: 1,
    }
    this.playing = false
    this.playbackIndex = 0
  }

  get state(): SimReplayState {
    return this._state
  }

  get isPlaying(): boolean {
    return this.playing
  }

  get stepCount(): number {
    return this.steps.length
  }

  /** Load a recorded run for replay */
  load(run: { steps: SimStep[] }): void {
    this.steps = run.steps
    this.playbackIndex = 0
    this._state.stepIndex = -1
    this._state.currentStep = null
    this.playing = false
    this._state.playing = false
  }

  /** Start playback from the beginning */
  play(): void {
    if (this.steps.length === 0) return
    this.playbackIndex = 0
    this.playing = true
    this._state.playing = true
    this.nextStep()
  }

  /** Pause playback */
  pause(): void {
    this.playing = false
    this._state.playing = false
  }

  /** Toggle playback */
  togglePlay(): void {
    if (this.playing) {
      this.pause()
    } else {
      this.play()
    }
  }

  /** Step forward one frame */
  stepForward(): void {
    this.playing = false
    this._state.playing = false
    this.nextStep()
  }

  /** Step backward one frame */
  stepBackward(): void {
    if (this.playbackIndex <= 0) return
    this.playbackIndex--
    this.applyStep(this.playbackIndex)
  }

  /** Jump to a specific step index */
  scrubTo(index: number): void {
    if (index < 0 || index >= this.steps.length) return
    this.playbackIndex = index
    this.applyStep(index)
  }

  setSpeed(speed: number): void {
    this._state.speed = Math.max(0.1, Math.min(10, speed))
  }

  /** Get the current replayed body states */
  getBodies(): SimBody[] {
    return this._state.currentStep?.bodies ?? []
  }

  /** Advance to the next step in the recording */
  private nextStep(): void {
    if (this.playbackIndex >= this.steps.length) {
      // Loop back to start
      this.playbackIndex = 0
    }

    const step = this.steps[this.playbackIndex]
    if (!step) return

    this.applyStep(this.playbackIndex)
    this._state.stepIndex = this.playbackIndex
    this._state.currentStep = step
    this.playbackIndex++

    // Auto-advance if playing
    if (this.playing && this.playbackIndex < this.steps.length) {
      const delay = (1000 / this._state.speed) / 60 // ~60fps base
      setTimeout(() => this.nextStep(), delay)
    } else if (this.playing) {
      this.playing = false
      this._state.playing = false
    }
  }

  /** Apply a step to the engine */
  private applyStep(index: number): void {
    const step = this.steps[index]
    if (!step) return

    // Reset engine and apply body states from this step
    this.engine.reset()
    for (const bodyDef of step.bodies) {
      this.engine.addBody(bodyDef)
    }
  }
}
