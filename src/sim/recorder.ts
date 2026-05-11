/**
 * v2.0 — Simulation recorder
 *
 * Records simulation steps and commands into a SimRun for later replay.
 * Supports start/stop, pause/resume, and export to JSON.
 * Export format is compatible with the `.cybertrace` schema (uses same
 * event types for adapter.tx events).
 */

import { SimEngine } from './engine'
import { SimStep, SimRun, SimCommand } from './types'

/**
 * Export a SimRun into the `.cybersim` format (a variant of cybertrace).
 * Returns a JSON string with a cybertrace-compatible header.
 */
export function exportCyberSim(run: SimRun): string {
  const header = {
    $schema: 'cybersim/v1' as const,
    $version: 1 as const,
    meta: {
      platform: 'browser-sim',
      character: run.characterId,
      startedAt: new Date(run.startedAt).toISOString(),
      stoppedAt: new Date(run.endedAt).toISOString(),
      tickRate: Math.round(1000 / 16), // ~60fps
      durationMs: run.duration,
      eventCount: run.steps.length,
    },
  }

  const lines = [JSON.stringify(header)]

  for (const step of run.steps) {
    // Emit a tick.start event
    lines.push(
      JSON.stringify({
        t: step.t,
        type: 'tick.start' as const,
        label: 'tick.start',
        payload: { simTime: step.simTime },
      }),
    )

    // Emit adapter.tx events for each command in this step
    if (step.commands) {
      for (const cmd of step.commands) {
        lines.push(
          JSON.stringify({
            t: cmd.t,
            type: 'adapter.tx' as const,
            label: cmd.type,
            payload: { command: cmd.type, args: cmd.payload },
          }),
        )
      }
    }

    // Emit sim body state as bb.set events
    for (const body of step.bodies) {
      lines.push(
        JSON.stringify({
          t: step.t,
          type: 'bb.set' as const,
          label: `body.${body.id}.pos`,
          payload: { field: `body.${body.id}.pos`, value: body.pos },
        }),
      )
      lines.push(
        JSON.stringify({
          t: step.t,
          type: 'bb.set' as const,
          label: `body.${body.id}.vel`,
          payload: { field: `body.${body.id}.vel`, value: body.vel },
        }),
      )
    }
  }

  return lines.join('\n')
}

/**
 * Import a `.cybersim` file content and return a SimRun.
 */
export function importCyberSim(content: string): SimRun {
  const lines = content.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    throw new Error('Empty cybersim content')
  }

  // Parse header
  const header = JSON.parse(lines[0]!) as {
    $schema: string
    $version: number
    meta: { character?: string; startedAt?: string; stoppedAt?: string; durationMs?: number }
  }

  if (header.$schema !== 'cybersim/v1') {
    throw new Error(`Unsupported cybersim schema: ${header.$schema}`)
  }

  const characterId = header.meta.character ?? 'unknown'
  const startedAt = header.meta.startedAt ? new Date(header.meta.startedAt).getTime() : Date.now()
  const endedAt = header.meta.stoppedAt ? new Date(header.meta.stoppedAt).getTime() : startedAt
  const duration = header.meta.durationMs ?? 0

  const run: SimRun = {
    id: `imported-${startedAt}`,
    characterId,
    startedAt,
    endedAt,
    duration,
    steps: [],
    stepCount: 0,
  }

  let currentStep: SimStep | null = null

  for (let i = 1; i < lines.length; i++) {
    const event = JSON.parse(lines[i]!) as {
      t: number
      type: string
      label: string
      payload?: Record<string, unknown>
    }

    switch (event.type) {
      case 'tick.start':
        if (currentStep) {
          run.steps.push(currentStep)
          run.stepCount++
        }
        currentStep = {
          t: event.t,
          simTime: (event.payload?.simTime as number) ?? 0,
          bodies: [],
          commands: [],
        }
        break

      case 'bb.set': {
        if (!currentStep) break
        const field = event.payload?.field as string | undefined
        const value = event.payload?.value as Record<string, unknown> | undefined
        if (field && value && currentStep.bodies.length > 0) {
          const bodyId = field.match(/^body\.([^/.]+)\./)?.[1]
          if (bodyId) {
            const body = currentStep.bodies.find((b) => b.id === bodyId)
            if (body) {
              if (field.endsWith('.pos')) body.pos = value as { x: number; y: number }
              if (field.endsWith('.vel')) body.vel = value as { vx: number; vy: number }
            }
          }
        }
        break
      }

      case 'adapter.tx': {
        if (!currentStep) continue
        const command = event.payload?.command as string | undefined
        const args = event.payload?.args as Record<string, unknown> | undefined
        if (command && currentStep.commands) {
          currentStep.commands.push({
            type: command as SimCommand['type'],
            payload: args ?? {},
            t: event.t,
          })
        }
        break
      }
    }
  }

  // Push last step
  if (currentStep) {
    run.steps.push(currentStep)
    run.stepCount++
  }

  return run
}

// ─── SimRecorder (unchanged core, now uses exported format) ───

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
    if (!this.recording || this.paused || !this._run) return
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

  /** Export the recorded run as JSON (legacy format) */
  exportJSON(): string {
    if (!this._run) return '[]'
    return JSON.stringify(this._run, null, 2)
  }

  /** Export the recorded run as .cybersim format (cybertrace-compatible) */
  exportCyberSim(): string {
    if (!this._run) return ''
    return exportCyberSim(this._run)
  }

  /** Import a run from legacy JSON */
  static importJSON(json: string): SimRun {
    return JSON.parse(json) as SimRun
  }

  /** Import a run from .cybersim format */
  static importCyberSim(content: string): SimRun {
    return importCyberSim(content)
  }
}
