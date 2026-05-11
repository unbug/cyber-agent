/**
 * v2.0 — Sim → Real replay
 *
 * Takes a recorded SimRun and replays the commands on a real RobotAdapter.
 * The replay converts simulation body states back to robot commands
 * (move, rotate, stop) and sends them through the adapter's sendCommand.
 *
 * Usage:
 *   const replayer = new Sim2RealReplay(adapter)
 *   await replayer.play(run, { speed: 1 })
 */

import { RobotAdapter } from '../engine/types'
import { SimRun, SimCommand } from './types'

// ─── Replay configuration ──────────────────────────────────────

export interface ReplayConfig {
  /** Playback speed multiplier (0.1 = slow, 1 = real-time, 10 = fast) */
  speed?: number
  /** Whether to skip commands when adapter is not connected */
  skipIfDisconnected?: boolean
  /** Delay between steps in ms (overrides speed calc) */
  stepDelay?: number
  /** Called after each command is sent (for debugging/observing) */
  onCommand?: (cmd: SimCommand, stepIndex: number) => void
  /** Called when replay completes */
  onComplete?: () => void
  /** Called on replay error */
  onError?: (err: Error) => void
}

export const DEFAULT_REPLAY_CONFIG: ReplayConfig = {
  speed: 1,
  skipIfDisconnected: true,
}

// ─── Sim2RealReplay ────────────────────────────────────────────

export class Sim2RealReplay {
  private adapter: RobotAdapter
  private config: ReplayConfig
  private running: boolean
  private abortController: AbortController | null

  constructor(adapter: RobotAdapter, config: ReplayConfig = {}) {
    this.adapter = adapter
    this.config = { ...DEFAULT_REPLAY_CONFIG, ...config }
    this.running = false
    this.abortController = null
  }

  get isRunning(): boolean {
    return this.running
  }

  /** Abort current replay */
  abort(): void {
    this.running = false
    this.abortController?.abort()
    this.abortController = null
  }

  /**
   * Replay a recorded SimRun on the real adapter.
   * Converts simulation body states to robot commands and sends them.
   */
  async play(run: SimRun, extraConfig?: Partial<ReplayConfig>): Promise<void> {
    const cfg = { ...this.config, ...extraConfig }
    this.running = true
    this.abortController = new AbortController()
    const { signal } = this.abortController

    const stepDelay =
      cfg.stepDelay ?? Math.round(1000 / (60 * (cfg.speed ?? 1)))

    for (let i = 0; i < run.steps.length && this.running; i++) {
      if (signal.aborted) {
        this.running = false
        return
      }

      const step = run.steps[i]
      if (!step) continue

      // Send commands from this step
      for (const cmd of step.commands) {
        if (!this.running || signal.aborted) return

        // Map sim command to adapter command
        const adapterCmd = this.simCommandToAdapter(cmd)
        if (adapterCmd) {
          try {
            this.adapter.sendCommand(adapterCmd)
          } catch (err) {
            if (cfg.onError) {
              cfg.onError(err as Error)
            }
          }
          if (cfg.onCommand) {
            cfg.onCommand(cmd, i)
          }
        }
      }

      // Wait for the next step
      if (i < run.steps.length - 1 && this.running) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, stepDelay)
          signal.addEventListener('abort', () => {
            clearTimeout(timer)
            resolve()
          })
        })
      }
    }

    this.running = false
    if (cfg.onComplete) cfg.onComplete()
  }

  /**
   * Convert a simulation command to a RobotAdapter command.
   * Maps sim types to adapter-compatible command formats.
   */
  private simCommandToAdapter(
    cmd: SimCommand,
  ): { type: string; payload: Record<string, unknown> } | null {
    switch (cmd.type) {
      case 'move': {
        const payload = cmd.payload as {
          direction?: 'forward' | 'backward' | number
          speed?: number
          x?: number
          y?: number
        }
        const speed = payload.speed ?? 0.5
        const direction = payload.direction ?? 'forward'

        if (typeof direction === 'number') {
          // Angle-based movement
          const rad = (direction * Math.PI) / 180
          return {
            type: 'move',
            payload: {
              x: Math.cos(rad) * speed,
              y: Math.sin(rad) * speed,
            },
          }
        }

        return {
          type: 'move',
          payload: {
            direction,
            speed,
          },
        }
      }

      case 'rotate': {
        const payload = cmd.payload as { angle?: number; speed?: number }
        return {
          type: 'rotate',
          payload: {
            angle: payload.angle ?? 90,
            speed: payload.speed ?? 1,
          },
        }
      }

      case 'stop':
        return { type: 'stop', payload: {} }

      case 'gesture': {
        const payload = cmd.payload as { gesture?: string }
        return {
          type: 'gesture',
          payload: {
            gesture: payload.gesture ?? 'wave',
          },
        }
      }

      case 'led': {
        const payload = cmd.payload as { r?: number; g?: number; b?: number }
        return {
          type: 'led',
          payload: {
            r: Math.round(payload.r ?? 0),
            g: Math.round(payload.g ?? 0),
            b: Math.round(payload.b ?? 0),
          },
        }
      }

      case 'sound': {
        const payload = cmd.payload as { freq?: number; dur?: number }
        return {
          type: 'sound',
          payload: {
            frequency: Math.round(payload.freq ?? 440),
            duration: Math.round(payload.dur ?? 100),
          },
        }
      }

      case 'emergency_stop':
        return { type: 'emergency_stop', payload: {} }

      default:
        return null
    }
  }
}

// ─── Convenience function ──────────────────────────────────────

/**
 * Quick replay: play a SimRun on an adapter with default settings.
 * Returns a promise that resolves when replay completes.
 */
export async function replayOnReal(
  adapter: RobotAdapter,
  run: SimRun,
  config?: Partial<ReplayConfig>,
): Promise<void> {
  const replayer = new Sim2RealReplay(adapter, config)
  await replayer.play(run, config)
}
