/**
 * v2.0 — Simulation recorder
 *
 * Records simulation steps into a SimRun for later replay.
 * Supports start/stop, pause/resume, and export to JSON.
 */

import { SimEngine } from './engine'
import { SimStep, SimRun } from './types'

export class SimRecorder {
  private recording: boolean
  private _run: SimRun | null
  private paused: boolean

  constructor(_engine: SimEngine) {
    void _engine // engine reference for future use
    this.recording = false
    this._run = null
    this.paused = false
  }

  get isRecording(): boolean {
    return this.recording
  }

  get run(): SimRun | null {
    return this._run
  }

  /** Start recording */
  start(characterId: string): void {
    if (this.recording) return
    this.recording = true
    this.paused = false
    this._run = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      characterId,
      startedAt: Date.now(),
      endedAt: 0,
      duration: 0,
      steps: [],
      stepCount: 0,
    }
  }

  /** Stop recording and finalize the run */
  stop(): SimRun | null {
    if (!this.recording || !this._run) return null
    this.recording = false
    this._run.endedAt = Date.now()
    this._run.duration = this._run.endedAt - this._run.startedAt
    this.paused = false
    return this._run
  }

  /** Record a single step */
  recordStep(step: SimStep): void {
    if (!this.recording || !this._run) return
    this._run.steps.push(step)
    this._run.stepCount++
  }

  /** Pause recording */
  pause(): void {
    if (!this.recording || this.paused) return
    this.paused = true
  }

  /** Resume recording */
  resume(): void {
    if (!this.recording || !this.paused) return
    this.paused = false
  }

  /** Export the recorded run as JSON */
  exportJSON(): string {
    if (!this._run) return '[]'
    return JSON.stringify(this._run, null, 2)
  }

  /** Import a run from JSON */
  static importJSON(json: string): SimRun {
    return JSON.parse(json) as SimRun
  }
}
