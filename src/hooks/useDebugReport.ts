/**
 * useDebugReport — Serialize debug state into a shareable JSON report.
 *
 * Bundles:
 * - BT tree structure (node types, names, statuses)
 * - Blackboard snapshot (filtered non-internal fields)
 * - Recent errors with preceding context chain
 * - Performance summary (tick rate, latency, event counts)
 * - Character config (emotion preset, VAL/memory/perception settings)
 * - Policy results (last 20 invocations)
 * - Perception events (last 50)
 * - Adapter events (last 100 TX/RX pairs)
 * - Timestamp and session metadata
 */

import { useCallback } from 'react'
import type { RuntimeNode, Blackboard } from '@/engine/types'
import type { TracerEvent } from '@/engine/tracer'
import type { PolicyResult } from '@/engine/policy'
import type { MemoryConfig, PerceptionConfig, ValConfig } from '@/agents/types'

// ─── Report types ──────────────────────────────────────────────

export interface DebugReport {
  /** Report format version */
  $schema: string
  /** ISO timestamp of report generation */
  generatedAt: string
  /** Timestamp epoch ms when debug session started (0 if unknown) */
  sessionStartMs: number
  /** Character name / emotion preset */
  character?: string
  /** BT tree structure (root node with children) */
  btTree: BtTreeNode | null
  /** Blackboard snapshot */
  blackboard: Record<string, unknown>
  /** Recent errors with preceding context */
  errors: DebugErrorEntry[]
  /** Performance summary */
  performance: {
    tickRateFps: number
    avgLatencyMs: number
    totalEvents: number
    errorCount: number
    perceptionEventCount: number
    policyInvocationCount: number
  }
  /** Character config (v3.0) */
  characterConfig?: {
    emotionPreset?: string
    valConfig?: ValConfig
    memoryConfig?: MemoryConfig
    perceptionConfig?: PerceptionConfig
  }
  /** Recent policy results */
  recentPolicyResults: Array<{
    modelId: string
    confidence: number
    latencyMs: number
    timestamp: number
  }>
  /** Recent perception events */
  recentPerceptionEvents: Array<{
    t: number
    label: string
    payload?: Record<string, unknown>
  }>
  /** Recent adapter TX/RX pairs */
  recentAdapterEvents: Array<{
    t: number
    direction: 'tx' | 'rx'
    label: string
    payload?: Record<string, unknown>
  }>
}

export interface BtTreeNode {
  name?: string
  type: string
  status: string
  children: BtTreeNode[]
}

export interface DebugErrorEntry {
  t: number
  message: string
  precedingEvents: Array<{
    t: number
    type: string
    label: string
  }>
}

// ─── Serialization helpers ─────────────────────────────────────

function serializeTree(node: RuntimeNode): BtTreeNode {
  return {
    name: node.def.name ?? node.def.type,
    type: node.def.type,
    status: node.status,
    children: node.children.map(serializeTree),
  }
}

function filterBlackboard(bb: Blackboard | null): Record<string, unknown> {
  if (!bb) return {}
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(bb)) {
    // Skip internal fields and canvas-specific fields
    if (key.startsWith('_')) continue
    if (['pointerX', 'pointerY', 'pointerActive', 'canvasWidth', 'canvasHeight'].includes(key)) continue
    filtered[key] = value
  }
  return filtered
}

function buildErrorEntry(
  errorEvent: TracerEvent,
  allEvents: TracerEvent[],
): DebugErrorEntry {
  const errorTime = errorEvent.t
  // Find events within 2 seconds before this error as context
  const precedingEvents = allEvents
    .filter(e => e.t >= errorTime - 2000 && e.t < errorTime)
    .slice(-10)
    .map(e => ({ t: e.t, type: e.type, label: e.label }))

  return {
    t: errorTime,
    message: String(errorEvent.payload?.message ?? errorEvent.label),
    precedingEvents,
  }
}

// ─── Hook ──────────────────────────────────────────────────────

export interface UseDebugReportOptions {
  tree?: RuntimeNode | null
  blackboard?: Blackboard | null
  errors: TracerEvent[]
  totalEvents: number
  tickRate: number
  avgLatency: number
  perceptionEvents?: TracerEvent[]
  policyResults?: PolicyResult[]
  policyEvents?: TracerEvent[]
  adapterEvents?: TracerEvent[]
  emotionPreset?: string
  valConfig?: ValConfig
  memoryConfig?: MemoryConfig
  perceptionConfig?: PerceptionConfig
}

export interface DebugReportResult {
  /** Generate a report from current debug state */
  generate: () => DebugReport
  /** Download the report as a .json file */
  download: (report?: DebugReport) => void
  /** Copy report JSON to clipboard */
  copyToClipboard: (report?: DebugReport) => Promise<boolean>
}

export function useDebugReport(options: UseDebugReportOptions): DebugReportResult {
  const {
    tree,
    blackboard,
    errors,
    totalEvents,
    tickRate,
    avgLatency,
    perceptionEvents = [],
    policyResults = [],
    policyEvents = [],
    adapterEvents = [],
    emotionPreset,
    valConfig,
    memoryConfig,
    perceptionConfig,
  } = options

  const generate = useCallback((): DebugReport => {
    // Combine all events for context chain lookup
    const allEvents = [...policyEvents, ...perceptionEvents, ...adapterEvents]
      .sort((a, b) => a.t - b.t)

    return {
      $schema: 'cyberagent/debug-report/v1',
      generatedAt: new Date().toISOString(),
      sessionStartMs: allEvents.length > 0 ? (allEvents[0]?.t ?? 0) : 0,
      character: emotionPreset,
      btTree: tree != null ? serializeTree(tree) : null,
      blackboard: filterBlackboard(blackboard ?? null),
      errors: errors.map(e => buildErrorEntry(e, allEvents)),
      performance: {
        tickRateFps: tickRate,
        avgLatencyMs: avgLatency,
        totalEvents,
        errorCount: errors.length,
        perceptionEventCount: perceptionEvents.length,
        policyInvocationCount: policyResults.length,
      },
      characterConfig: emotionPreset || valConfig || memoryConfig || perceptionConfig ? {
        emotionPreset,
        valConfig,
        memoryConfig,
        perceptionConfig,
      } : undefined,
      recentPolicyResults: policyResults.slice(-20).map(r => ({
        modelId: r.modelId,
        confidence: r.confidence,
        latencyMs: r.latencyMs,
        timestamp: r.timestamp,
      })),
      recentPerceptionEvents: perceptionEvents.slice(-50).map(e => ({
        t: e.t,
        label: e.label,
        payload: e.payload as Record<string, unknown> | undefined,
      })),
      recentAdapterEvents: adapterEvents.slice(-100).map(e => ({
        t: e.t,
        direction: e.type === 'adapter.tx' ? 'tx' : 'rx',
        label: e.label,
        payload: e.payload as Record<string, unknown> | undefined,
      })),
    }
  }, [tree, blackboard, errors, totalEvents, tickRate, avgLatency,
       perceptionEvents, policyResults, policyEvents, adapterEvents,
       emotionPreset, valConfig, memoryConfig, perceptionConfig])

  const download = useCallback((report?: DebugReport) => {
    const data = report ?? generate()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cyberagent-debug-report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [generate])

  const copyToClipboard = useCallback(async (report?: DebugReport): Promise<boolean> => {
    try {
      const data = report ?? generate()
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      return true
    } catch {
      return false
    }
  }, [generate])

  return { generate, download, copyToClipboard }
}
