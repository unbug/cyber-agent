/**
 * v2.0 — Sim ↔ Real Trace Comparison Panel
 *
 * Uploads a simulated trace and a real trace, aligns them by timestamp,
 * and highlights differences in timing and command payloads.
 *
 * Supports:
 * - `.cybersim` format (sim runs exported from SimulatorPanel)
 * - `.cybertrace` format (real device traces)
 * - Side-by-side timeline with diff bars
 * - Per-step command diff (sim vs adapter tx)
 * - Sim→Real gap statistics (timing drift, command delta)
 *
 * Usage:
 *   <SimRealComparePanel
 *     simTrace={simData}
 *     realTrace={realData}
 *     onSimUpload={handleSimUpload}
 *     onRealUpload={handleRealUpload}
 *   />
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { FileText, Activity } from 'lucide-react'
import { type TracerEvent } from '@/engine/tracer'
import styles from './DebugPage.module.css'

// ─── Types ───────────────────────────────────────────────────────

/** A step from a sim trace */
export interface SimStep {
  t: number
  simTime: number
  commands: Array<{ type: string; payload: Record<string, unknown> }>
  bodies: Array<{ id: string; x: number; y: number; orientation: number }>
}

/** A step from a real trace (adapter tx events) */
export interface RealStep {
  t: number
  type: string
  label: string
  payload: Record<string, unknown>
}

/** Alignment result for one pair of steps */
export interface StepDiff {
  simStep: SimStep | null
  realStep: RealStep | null
  timeDelta: number // ms
  commandsMatch: boolean
  diffFields: Array<{ field: string; simVal: unknown; realVal: unknown }>
}

/** Comparison statistics */
export interface CompareStats {
  totalSteps: number
  matchedSteps: number
  avgTimeDelta: number
  maxTimeDelta: number
  commandMatchRate: number
  avgPayloadDelta: number
}

// ─── Upload helpers ──────────────────────────────────────────────

interface FileUploadInputProps {
  label: string
  accept: string
  onFile: (content: string, name: string) => void
  icon: React.ReactNode
}

function FileUploadInput({ label, accept, onFile, icon }: FileUploadInputProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => onFile(reader.result as string, file.name)
      reader.readAsText(file)
    },
    [onFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => onFile(reader.result as string, file.name)
      reader.readAsText(file)
    },
    [onFile],
  )

  return (
    <div
      className={styles.compareUpload}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={dragging ? { borderColor: 'var(--accent)', background: '#1a1a2e' } : {}}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <span className={styles.compareUploadIcon}>{icon}</span>
      <span className={styles.compareUploadLabel}>{label}</span>
      <span className={styles.compareUploadHint}>Click or drop file</span>
    </div>
  )
}

// ─── Comparison engine ───────────────────────────────────────────

/**
 * Align sim steps with real trace events by timestamp proximity.
 * Returns an array of StepDiff pairs.
 */
export function alignTraces(
  simSteps: SimStep[],
  realEvents: TracerEvent[],
  toleranceMs: number = 50,
): StepDiff[] {
  const txEvents = realEvents.filter((e) => e.type === 'adapter.tx')
  const diffs: StepDiff[] = []

  for (const simStep of simSteps) {
    // Find closest real event
    let closest: TracerEvent | null = null
    let closestDelta = Infinity

    for (const evt of txEvents) {
      const delta = Math.abs(evt.t - simStep.t)
      if (delta < closestDelta) {
        closestDelta = delta
        closest = evt
      }
    }

    // Only consider events within tolerance
    const realStep: RealStep | null = closestDelta <= toleranceMs && closest
      ? {
          t: closest.t,
          type: closest.type,
          label: closest.label,
          payload: (closest.payload ?? {}) as Record<string, unknown>,
        }
      : null

    // Compare commands
    let commandsMatch = false
    const diffFields: StepDiff['diffFields'] = []

    if (simStep.commands.length > 0 && realStep) {
      const simCmd = simStep.commands[0]!
      const realCmd = realStep.payload as Record<string, unknown>

      // Check if the command types match
      const simType = simCmd.type
      const realType = realCmd['command'] || realCmd['type'] || realStep.label

      if (simType === realType) {
        commandsMatch = true
        // Compare payload fields
        const simPayload = simCmd.payload
        for (const key of Object.keys(simPayload)) {
          if (realCmd[key] !== undefined && realCmd[key] !== simPayload[key]) {
            diffFields.push({
              field: key,
              simVal: simPayload[key],
              realVal: realCmd[key],
            })
          }
        }
      } else {
        commandsMatch = false
        diffFields.push({
          field: 'command_type',
          simVal: simType,
          realVal: realType,
        })
      }
    }

    diffs.push({
      simStep: simStep,
      realStep,
      timeDelta: closestDelta,
      commandsMatch,
      diffFields,
    })
  }

  return diffs
}

/** Compute comparison statistics */
export function computeStats(diffs: StepDiff[]): CompareStats {
  const total = diffs.length
  if (total === 0) {
    return { totalSteps: 0, matchedSteps: 0, avgTimeDelta: 0, maxTimeDelta: 0, commandMatchRate: 0, avgPayloadDelta: 0 }
  }

  const matched = diffs.filter((d) => d.commandsMatch).length
  const avgTimeDelta = diffs.reduce((s, d) => s + d.timeDelta, 0) / total
  const maxTimeDelta = Math.max(...diffs.map((d) => d.timeDelta))
  const payloadDeltas = diffs
    .filter((d) => d.diffFields.length > 0)
    .map((d) => d.diffFields.length)
  const avgPayloadDelta = payloadDeltas.length > 0 ? payloadDeltas.reduce((s, v) => s + v, 0) / payloadDeltas.length : 0

  return {
    totalSteps: total,
    matchedSteps: matched,
    avgTimeDelta,
    maxTimeDelta,
    commandMatchRate: matched / total,
    avgPayloadDelta,
  }
}

// ─── Timeline renderer ───────────────────────────────────────────

interface TimelineRowProps {
  label: string
  color: string
  events: Array<{ t: number; label?: string; type?: string; payload?: Record<string, unknown> }>
  width: number
  height: number
  simStart: number
  simEnd: number
}

function TimelineRow({ label, color, events, width, height, simStart, simEnd }: TimelineRowProps) {
  const duration = simEnd - simStart || 1
  const scale = width / duration

  return (
    <div className={styles.compareTimelineRow}>
      <span className={styles.compareTimelineLabel}>{label}</span>
      <div className={styles.compareTimelineTrack} style={{ height: `${height}px` }}>
        {events.map((evt, i) => {
          const x = (evt.t - simStart) * scale
          return (
            <div
              key={i}
              className={styles.compareTimelineDot}
              style={{
                left: `${x}px`,
                backgroundColor: color,
              }}
              title={`${evt.label || evt.type}: ${(evt.t - simStart).toFixed(1)}ms`}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────

interface SimRealComparePanelProps {
  /** Tolerance for alignment (ms) */
  toleranceMs?: number
}

export function SimRealComparePanel({
  toleranceMs = 50,
}: SimRealComparePanelProps) {
  const [simData, setSimData] = useState<string | null>(null)
  const [realData, setRealData] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  // Parse sim trace
  const simSteps = useMemo<SimStep[]>(() => {
    if (!simData) return []
    try {
      const parsed = JSON.parse(simData)
      if (parsed.steps && Array.isArray(parsed.steps)) {
        return parsed.steps.map((s: any) => ({
          t: s.t,
          simTime: s.simTime,
          commands: s.commands || [],
          bodies: s.bodies || [],
        }))
      }
    } catch {
      // ignore
    }
    return []
  }, [simData])

  // Parse real trace
  const realEvents = useMemo<TracerEvent[]>(() => {
    if (!realData) return []
    try {
      const lines = realData.split('\n').filter((l) => l.trim())
      if (lines.length === 0) return []
      // Skip header
      const events: TracerEvent[] = []
      for (let i = 1; i < lines.length; i++) {
        try {
          const obj = JSON.parse(lines[i]!)
          // Inline validation: t (number), type (string), label (string)
          if (
            typeof obj === 'object' &&
            obj !== null &&
            typeof (obj as any).t === 'number' &&
            typeof (obj as any).type === 'string' &&
            typeof (obj as any).label === 'string'
          ) {
            events.push(obj as TracerEvent)
          }
        } catch {
          // skip invalid lines
        }
      }
      return events
    } catch {
      return []
    }
  }, [realData])

  // Align and compare
  const diffs = useMemo(() => alignTraces(simSteps, realEvents, toleranceMs), [simSteps, realEvents, toleranceMs])
  const stats = useMemo(() => computeStats(diffs), [diffs])

  // Time range
  const timeRange = useMemo(() => {
    if (simSteps.length === 0) return { start: 0, end: 0 }
    return {
      start: simSteps[0]!.t,
      end: simSteps[simSteps.length - 1]!.t,
    }
  }, [simSteps])

  // Upload handlers
  const handleSimUpload = useCallback((content: string) => setSimData(content), [])
  const handleRealUpload = useCallback((content: string) => setRealData(content), [])

  // Clear
  const handleClear = useCallback(() => {
    setSimData(null)
    setRealData(null)
  }, [])

  return (
    <div className={styles.comparePanel}>
      {/* Header */}
      <div className={styles.compareHeader}>
        <span className={styles.compareTitle}>
          <Activity size={14} />
          Sim ↔ Real Trace Comparison
        </span>
        {(simData || realData) && (
          <button className={styles.compareClearBtn} onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {/* Upload area */}
      <div className={styles.compareUploads}>
        <FileUploadInput
          label="Sim Trace (.cybersim / .json)"
          accept=".json,.cybersim"
          onFile={handleSimUpload}
          icon={<FileText size={14} />}
        />
        <FileUploadInput
          label="Real Trace (.cybertrace)"
          accept=".cybertrace,.jsonl"
          onFile={handleRealUpload}
          icon={<FileText size={14} />}
        />
      </div>

      {/* Comparison results */}
      {diffs.length > 0 && (
        <>
          {/* Statistics */}
          <div className={styles.compareStats}>
            <div className={styles.compareStatCard}>
              <span className={styles.compareStatLabel}>Total Steps</span>
              <span className={styles.compareStatValue}>{stats.totalSteps}</span>
            </div>
            <div className={styles.compareStatCard}>
              <span className={styles.compareStatLabel}>Matched</span>
              <span
                className={`${styles.compareStatValue} ${
                  stats.commandMatchRate >= 0.9
                    ? styles.compareStatGood
                    : stats.commandMatchRate >= 0.7
                      ? styles.compareStatWarn
                      : styles.compareStatBad
                }`}
              >
                {stats.matchedSteps}/{stats.totalSteps}
              </span>
            </div>
            <div className={styles.compareStatCard}>
              <span className={styles.compareStatLabel}>Avg Time Delta</span>
              <span className={styles.compareStatValue}>{stats.avgTimeDelta.toFixed(1)} ms</span>
            </div>
            <div className={styles.compareStatCard}>
              <span className={styles.compareStatLabel}>Max Time Delta</span>
              <span className={styles.compareStatValue}>{stats.maxTimeDelta.toFixed(1)} ms</span>
            </div>
            <div className={styles.compareStatCard}>
              <span className={styles.compareStatLabel}>Command Match Rate</span>
              <span
                className={`${styles.compareStatValue} ${
                  stats.commandMatchRate >= 0.9
                    ? styles.compareStatGood
                    : stats.commandMatchRate >= 0.7
                      ? styles.compareStatWarn
                      : styles.compareStatBad
                }`}
              >
                {(stats.commandMatchRate * 100).toFixed(0)}%
              </span>
            </div>
            <div className={styles.compareStatCard}>
              <span className={styles.compareStatLabel}>Avg Payload Diff</span>
              <span className={styles.compareStatValue}>{stats.avgPayloadDelta.toFixed(1)} fields</span>
            </div>
          </div>

          {/* Timeline visualization */}
          {simSteps.length > 0 && (
            <div className={styles.compareTimeline}>
              <TimelineRow
                label="Sim Commands"
                color="#3b82f6"
                events={simSteps.map((s) => ({
                  t: s.t,
                  label: s.commands[0]?.type || '',
                  payload: s.commands[0]?.payload,
                }))}
                width={700}
                height={24}
                simStart={timeRange.start}
                simEnd={timeRange.end}
              />
              <TimelineRow
                label="Real TX"
                color="#22c55e"
                events={realEvents.filter((e) => e.type === 'adapter.tx').map((e) => ({
                  t: e.t,
                  label: e.label,
                  payload: e.payload,
                }))}
                width={700}
                height={24}
                simStart={timeRange.start}
                simEnd={timeRange.end}
              />
            </div>
          )}

          {/* Step-by-step diff table */}
          <div className={styles.compareDiffTable}>
            <div className={styles.compareDiffHeader}>
              <span className={styles.compareDiffCol}>Step</span>
              <span className={styles.compareDiffCol}>Time Δ</span>
              <span className={styles.compareDiffCol}>Sim Cmd</span>
              <span className={styles.compareDiffCol}>Real Cmd</span>
              <span className={styles.compareDiffCol}>Diff</span>
            </div>
            <div className={styles.compareDiffBody}>
              {diffs.slice(0, 100).map((d, i) => (
                <div
                  key={i}
                  className={`${styles.compareDiffRow} ${
                    d.commandsMatch ? styles.compareDiffMatch : styles.compareDiffMismatch
                  }`}
                >
                  <span className={styles.compareDiffCol}>#{i + 1}</span>
                  <span className={styles.compareDiffCol}>{d.timeDelta.toFixed(1)} ms</span>
                  <span className={styles.compareDiffCol}>
                    {d.simStep?.commands[0]?.type || '—'}
                    {d.simStep?.commands[0]?.payload && (
                      <span className={styles.compareDiffPayload}>
                        {JSON.stringify(d.simStep.commands[0].payload).slice(0, 30)}
                      </span>
                    )}
                  </span>
                  <span className={styles.compareDiffCol}>
                    {d.realStep ? d.realStep.label : '—'}
                    {d.realStep?.payload && (
                      <span className={styles.compareDiffPayload}>
                        {JSON.stringify(d.realStep.payload).slice(0, 30)}
                      </span>
                    )}
                  </span>
                  <span className={styles.compareDiffCol}>
                    {d.diffFields.length > 0 ? (
                      <span className={styles.compareDiffFieldCount}>
                        {d.diffFields.map((f) => (
                          <span key={f.field} className={styles.compareDiffField}>
                            {f.field}: {String(f.simVal)}→{String(f.realVal)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className={styles.compareDiffMatchText}>✓</span>
                    )}
                  </span>
                </div>
              ))}
              {diffs.length > 100 && (
                <div className={styles.compareDiffMore}>
                  ... and {diffs.length - 100} more steps
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Raw toggle */}
      {showRaw && (
        <div className={styles.compareRaw}>
          {simData && (
            <div className={styles.compareRawSection}>
              <h4>Sim Trace</h4>
              <pre>{simData.slice(0, 2000)}</pre>
            </div>
          )}
          {realData && (
            <div className={styles.compareRawSection}>
              <h4>Real Trace</h4>
              <pre>{realData.slice(0, 2000)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Toggle raw */}
      {(simData || realData) && (
        <button
          className={styles.compareRawToggle}
          onClick={() => setShowRaw(!showRaw)}
        >
          {showRaw ? '▲ Hide Raw' : '▼ Show Raw'}
        </button>
      )}
    </div>
  )
}
