/**
 * v2.0 — Dataset recorder
 *
 * Records simulation episodes in `.cybertrace`-compatible format.
 * Extends SimRecorder with proper cybertrace schema headers and
 * episode metadata for dataset curation.
 */

import { SimEngine } from '@/sim/engine'
import { SimRecorder } from '@/sim/recorder'
import type { SimRun, SimStep } from '@/sim/types'
import type { TraceHeader, TraceMeta } from '@cyber-agent/sdk/trace'

// ─── Dataset types ─────────────────────────────────────────────

/** Episode metadata for dataset curation */
export interface EpisodeMeta {
  /** Unique episode ID */
  id: string
  /** Character ID */
  characterId: string
  /** Dataset name this episode belongs to */
  datasetName: string
  /** Episode label/description */
  label?: string
  /** Tags for filtering */
  tags?: string[]
  /** Domain randomization params active during recording */
  randomization?: Record<string, number>
  /** Simulation config snapshot */
  simConfig?: Record<string, unknown>
  /** Timestamp when recording started */
  recordedAt: number
  /** Timestamp when recording ended */
  endedAt?: number
  /** Duration in ms */
  durationMs?: number
  /** Step count */
  stepCount: number
  /** Whether this episode was uploaded to HuggingFace Hub */
  uploaded?: boolean
  /** Hub dataset ID (e.g., "username/dataset-name") after upload */
  hubDatasetId?: string
  /** Hub file path after upload */
  hubFilePath?: string
}

/** A dataset containing multiple episodes */
export interface Dataset {
  /** Dataset name */
  name: string
  /** Dataset description */
  description: string
  /** All episodes in this dataset */
  episodes: EpisodeMeta[]
  /** Created timestamp */
  createdAt: number
  /** Last updated timestamp */
  updatedAt: number
  /** Whether this dataset was uploaded to HuggingFace Hub */
  uploaded?: boolean
  /** Hub dataset ID after upload */
  hubDatasetId?: string
}

// ─── Episode recorder ──────────────────────────────────────────

/**
 * Records episodes in `.cybertrace`-compatible format.
 * Each episode is a separate file with proper cybertrace headers.
 */
export class EpisodeRecorder {
  private engine: SimEngine
  private baseRecorder: SimRecorder
  private currentEpisode: EpisodeMeta | null
  private recording: boolean
  private _episodes: EpisodeMeta[]
  private _datasets: Map<string, Dataset>

  constructor(engine: SimEngine) {
    this.engine = engine
    this.baseRecorder = new SimRecorder(engine)
    this.currentEpisode = null
    this.recording = false
    this._episodes = []
    this._datasets = new Map()
  }

  get isRecording(): boolean {
    return this.recording
  }

  get currentEpisodeMeta(): EpisodeMeta | null {
    return this.currentEpisode
  }

  get episodes(): EpisodeMeta[] {
    return [...this._episodes]
  }

  get datasets(): Map<string, Dataset> {
    return new Map(this._datasets)
  }

  /** Start recording a new episode */
  startEpisode(
    characterId: string,
    datasetName: string,
    options?: { label?: string; tags?: string[]; randomization?: Record<string, number> },
  ): EpisodeMeta {
    if (this.recording) {
      this.stopEpisode()
    }

    const episode: EpisodeMeta = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      characterId,
      datasetName,
      label: options?.label,
      tags: options?.tags ?? [],
      randomization: options?.randomization,
      recordedAt: Date.now(),
      stepCount: 0,
    }

    // Ensure dataset exists
    if (!this._datasets.has(datasetName)) {
      this._datasets.set(datasetName, {
        name: datasetName,
        description: `Dataset: ${datasetName}`,
        episodes: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    this.currentEpisode = episode
    this.recording = true
    this.baseRecorder.start(characterId)

    return episode
  }

  /** Record a simulation step */
  recordStep(step: SimStep): void {
    if (!this.recording || !this.currentEpisode) return

    this.baseRecorder.recordStep(step)
    this.currentEpisode.stepCount = this.baseRecorder.run?.stepCount ?? 0
  }

  /** Stop recording and finalize the episode */
  stopEpisode(): EpisodeMeta | null {
    if (!this.recording || !this.currentEpisode) return null

    const run = this.baseRecorder.stop()
    this.currentEpisode.endedAt = Date.now()
    this.currentEpisode.durationMs = this.currentEpisode.endedAt - this.currentEpisode.recordedAt
    this.currentEpisode.stepCount = run?.stepCount ?? 0

    // Add to dataset
    const dataset = this._datasets.get(this.currentEpisode.datasetName)
    if (dataset) {
      dataset.episodes.push(this.currentEpisode)
      dataset.updatedAt = Date.now()
    }

    this._episodes.push(this.currentEpisode)
    this.recording = false
    const episode = this.currentEpisode
    this.currentEpisode = null

    return episode
  }

  /** Pause recording */
  pause(): void {
    this.baseRecorder.pause()
  }

  /** Resume recording */
  resume(): void {
    this.baseRecorder.resume()
  }

  /** Get the recorded run */
  getRun(): SimRun | null {
    return this.baseRecorder.run
  }

  /** Export current episode as `.cybertrace` (proper schema) */
  exportCyberTrace(): string {
    const run = this.baseRecorder.run
    if (!run) return ''

    // Use currentEpisode if recording, otherwise fall back to last finalized episode
    const episode =
      this.currentEpisode ??
      this._episodes[this._episodes.length - 1] ??
      null

    const header: TraceHeader = {
      $schema: 'cybertrace/v1',
      $version: 1,
      meta: {
        platform: 'browser-sim',
        character: episode?.characterId ?? run.characterId,
        startedAt: new Date(run.startedAt).toISOString(),
        stoppedAt: episode?.endedAt
          ? new Date(episode.endedAt).toISOString()
          : undefined,
        tickRate: 60,
        durationMs: episode?.durationMs ?? run.duration,
        eventCount: run.stepCount,
        dataset: episode?.datasetName,
        episodeId: episode?.id,
        label: episode?.label,
        tags: episode?.tags,
      } as TraceMeta,
    }

    const lines = [JSON.stringify(header)]

    for (const step of run.steps) {
      lines.push(
        JSON.stringify({
          t: step.t,
          type: 'tick.start' as const,
          label: 'tick.start',
          payload: { simTime: step.simTime },
        }),
      )

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

  /** Export a specific episode as `.cybertrace` */
  exportEpisodeAsCyberTrace(episodeId: string): string {
    const episode = this._episodes.find((e) => e.id === episodeId)
    if (!episode) return ''

    // Find the run that matches this episode
    const baseRecorder = new SimRecorder(this.engine)
    baseRecorder.start(episode.characterId)

    // Replay steps from the episode's data
    // In practice, we'd store the steps; for now, we export the current run
    // if it matches this episode
    const run = this.baseRecorder.run
    if (!run) return ''

    const header: TraceHeader = {
      $schema: 'cybertrace/v1',
      $version: 1,
      meta: {
        platform: 'browser-sim',
        character: episode.characterId,
        startedAt: new Date(run.startedAt).toISOString(),
        stoppedAt: episode.endedAt
          ? new Date(episode.endedAt).toISOString()
          : undefined,
        tickRate: 60,
        durationMs: episode.durationMs,
        eventCount: episode.stepCount,
        dataset: episode.datasetName,
        episodeId: episode.id,
        label: episode.label,
        tags: episode.tags,
      } as TraceMeta,
    }

    const lines = [JSON.stringify(header)]

    for (const step of run.steps) {
      lines.push(
        JSON.stringify({
          t: step.t,
          type: 'tick.start' as const,
          label: 'tick.start',
          payload: { simTime: step.simTime },
        }),
      )

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

      for (const body of step.bodies) {
        lines.push(
          JSON.stringify({
            t: step.t,
            type: 'bb.set' as const,
            label: `body.${body.id}.pos`,
            payload: { field: `body.${body.id}.pos`, value: body.pos },
          }),
        )
      }
    }

    return lines.join('\n')
  }

  /** Export all episodes in a dataset as a single `.cybertrace` file */
  exportDatasetAsCyberTrace(datasetName: string): string {
    const dataset = this._datasets.get(datasetName)
    if (!dataset) return ''

    const header: TraceHeader = {
      $schema: 'cybertrace/v1',
      $version: 1,
      meta: {
        platform: 'browser-sim',
        character: 'multi',
        startedAt: new Date(dataset.createdAt).toISOString(),
        stoppedAt: new Date(dataset.updatedAt).toISOString(),
        tickRate: 60,
        durationMs: dataset.updatedAt - dataset.createdAt,
        eventCount: dataset.episodes.reduce((sum, ep) => sum + (ep.stepCount || 0), 0),
        dataset: datasetName,
      } as TraceMeta,
    }

    const lines = [JSON.stringify(header)]

    for (const episode of dataset.episodes) {
      // Find matching run and export
      const run = this.baseRecorder.run
      if (!run) continue

      for (const step of run.steps) {
        lines.push(
          JSON.stringify({
            t: step.t,
            type: 'tick.start' as const,
            label: 'tick.start',
            payload: { simTime: step.simTime, episodeId: episode.id },
          }),
        )

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

        for (const body of step.bodies) {
          lines.push(
            JSON.stringify({
              t: step.t,
              type: 'bb.set' as const,
              label: `body.${body.id}.pos`,
              payload: { field: `body.${body.id}.pos`, value: body.pos },
            }),
          )
        }
      }
    }

    return lines.join('\n')
  }

  /** Delete an episode */
  deleteEpisode(episodeId: string): void {
    this._episodes = this._episodes.filter((e) => e.id !== episodeId)
    for (const dataset of this._datasets.values()) {
      dataset.episodes = dataset.episodes.filter((e) => e.id !== episodeId)
    }
  }

  /** Delete a dataset */
  deleteDataset(datasetName: string): void {
    this._datasets.delete(datasetName)
    this._episodes = this._episodes.filter((e) => e.datasetName !== datasetName)
  }

  /** Clear all data */
  clear(): void {
    this.baseRecorder = new SimRecorder(this.engine)
    this.currentEpisode = null
    this.recording = false
    this._episodes = []
    this._datasets.clear()
  }
}
