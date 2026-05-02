/**
 * DebugPage — Real-time debugger for the CyberAgent behavior tree engine.
 *
 * Split-view layout:
 * - Top bar: tick rate, latency, event count, controls
 * - Left panel: BT tree visualization with current node highlighted + breadcrumb
 * - Center panel: actuator timeline (adapter tx/rx events)
 * - Right panel: blackboard inspector with diff highlighting
 */

import { useMemo, useCallback, useState } from 'react'
import { tracer, type TracerEvent, type TracerEventType } from '@/engine/tracer'
import { useDebug, diffBlackboards, type BbDiff } from '@/hooks/useDebug'
import type { RuntimeNode } from '@/engine/types'
import type { PerceptionCategory } from '@/perception/types'
import { TraceScrubber } from './TraceScrubber'
import { BreakpointPanel } from '@/components/BreakpointPanel'
import { TracePullerPanel } from '@/components/TracePullerPanel'
import { SafetyEventPanel } from '@/components/SafetyEventPanel'
import { MemoriesPanel } from './MemoriesPanel'
import { computeMemoryStats } from '@/memory/episodic-store'
import styles from './DebugPage.module.css'

// ─── BT Tree Renderer ─────────────────────────────────────────

interface TreeNodeProps {
  node: RuntimeNode
  depth: number
  activeNodes: Set<string>
  onHover: (name: string) => void
}

function TreeNode({ node, depth, activeNodes, onHover }: TreeNodeProps) {
  const { def } = node
  const isRoot = depth === 0
  const isActive = activeNodes.has(def.name ?? def.type)

  const typeColors: Record<string, string> = {
    sequence: '#3b82f6',
    selector: '#8b5cf6',
    parallel: '#f59e0b',
    inverter: '#ef4444',
    repeater: '#06b6d4',
    cooldown: '#ec4899',
    condition: '#22c55e',
    action: '#f97316',
    wait: '#6b7280',
    root: '#6366f1',
  }

  const color = typeColors[def.type] ?? '#6b7280'
  const statusColor = node.status === 'success' ? '#22c55e'
    : node.status === 'failure' ? '#ef4444'
    : node.status === 'running' ? '#eab308'
    : '#6b7280'

  const indent = isRoot ? 0 : depth * 20

  return (
    <div className={styles.treeNode} style={{ marginLeft: `${indent}px` }}>
      <div
        className={`${styles.nodeHeader} ${isActive ? styles.nodeActive : ''}`}
        style={{
          borderLeftColor: isActive ? color : 'transparent',
          backgroundColor: isActive ? `${color}11` : 'transparent',
        }}
        onMouseEnter={() => onHover(def.name ?? def.type)}
      >
        <span className={styles.nodeIcon}>{typeIcon(def.type)}</span>
        <span
          className={styles.nodeName}
          style={{ color: isActive ? color : 'var(--text-secondary)' }}
        >
          {def.name ?? def.type}
        </span>
        <span
          className={styles.nodeStatus}
          style={{ color: statusColor }}
          title={`Status: ${node.status}`}
        >
          {statusDot(node.status)}
        </span>
      </div>
      {isActive && node.children.length > 0 && (
        <div className={styles.treeChildren}>
          {node.children.map(child => (
            <TreeNode
              key={child.def.name ?? child.def.type}
              node={child}
              depth={depth + 1}
              activeNodes={activeNodes}
              onHover={onHover}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    sequence: '→',
    selector: '⫸',
    parallel: '⫽',
    inverter: '¬',
    repeater: '↻',
    cooldown: '⏱',
    condition: '?',
    action: '!',
    wait: '⏳',
    root: '◆',
  }
  return icons[type] ?? '·'
}

function statusDot(status: string): string {
  if (status === 'running') return '●'
  if (status === 'success') return '✓'
  if (status === 'failure') return '✗'
  return '○'
}

// ─── Breadcrumb Renderer ───────────────────────────────────────

interface BreadcrumbProps {
  events: TracerEvent[]
  hoveredNode: string | null
}

function Breadcrumb({ events, hoveredNode }: BreadcrumbProps) {
  return (
    <div className={styles.breadcrumb}>
      {events.length === 0 && (
        <span className={styles.empty}>No events yet</span>
      )}
      {events.map((evt, i) => (
        <span
          key={i}
          className={`${styles.breadcrumbItem} ${
            hoveredNode === evt.label ? styles.breadcrumbHovered : ''
          }`}
          style={{
            color: evt.type === 'node.enter' ? '#3b82f6' : '#8b5cf6',
          }}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
        >
          {evt.label}
        </span>
      ))}
    </div>
  )
}

// ─── Actuator Timeline Renderer ────────────────────────────────

interface ActuatorTimelineProps {
  events: TracerEvent[]
}

function ActuatorTimeline({ events }: ActuatorTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📡</span>
        <p>No adapter events yet</p>
      </div>
    )
  }

  // Group by direction
  const txEvents = events.filter(e => e.type === 'adapter.tx')
  const rxEvents = events.filter(e => e.type === 'adapter.rx')

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineItem}>
        <div className={styles.timelineHeader}>
          <span className={styles.timelineLabel}>TX (commands sent)</span>
          <span className={styles.timelineCount}>{txEvents.length}</span>
        </div>
        <div className={styles.timelineEvents}>
          {txEvents.slice(-50).map((evt, i) => (
            <div key={i} className={styles.timelineEvent}>
              <span className={styles.timelineTime}>{formatTime(evt.t)}</span>
              <span className={styles.timelineType}>TX</span>
              <span className={styles.timelineMsg}>{evt.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.timelineItem}>
        <div className={styles.timelineHeader}>
          <span className={styles.timelineLabel}>RX (telemetry received)</span>
          <span className={styles.timelineCount}>{rxEvents.length}</span>
        </div>
        <div className={styles.timelineEvents}>
          {rxEvents.slice(-50).map((evt, i) => (
            <div key={i} className={styles.timelineEvent}>
              <span className={styles.timelineTime}>{formatTime(evt.t)}</span>
              <span className={styles.timelineType}>RX</span>
              <span className={styles.timelineMsg}>
                {evt.payload ? JSON.stringify(evt.payload).slice(0, 80) : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTime(t: number): string {
  return `${(t / 1000).toFixed(2)}s`
}

// ─── Blackboard Inspector ──────────────────────────────────────

function BlackboardInspector({ blackboard, diffs }: { blackboard: Record<string, unknown> | null; diffs: BbDiff[] }) {
  if (!blackboard) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🧠</span>
        <p>No blackboard data yet</p>
      </div>
    )
  }

  // Filter out internal fields
  const fields = Object.entries(blackboard).filter(
    ([key]) => !key.startsWith('_') && key !== 'pointerX' && key !== 'pointerY' &&
               key !== 'pointerActive' && key !== 'canvasWidth' && key !== 'canvasHeight'
  )

  const diffMap = new Map(diffs.map(d => [d.field, d]))

  return (
    <div className={styles.blackboard}>
      <div className={styles.blackboardHeader}>
        <span className={styles.blackboardTitle}>Blackboard</span>
        <span className={styles.blackboardCount}>{fields.length} fields</span>
      </div>
      <div className={styles.blackboardFields}>
        {fields.map(([key, value]) => {
          const diff = diffMap.get(key)
          const isChanged = !!diff

          return (
            <div
              key={key}
              className={`${styles.blackboardField} ${isChanged ? styles.fieldChanged : ''}`}
            >
              <div className={styles.fieldHeader}>
                <span className={styles.fieldName}>{key}</span>
                {isChanged && (
                  <span className={styles.fieldChangedBadge}>changed</span>
                )}
              </div>
              <div className={styles.fieldValue}>
                {formatValue(value)}
              </div>
              {isChanged && diff && (
                <div className={styles.fieldDiff}>
                  <span className={styles.fieldOld}>
                    ← {formatValue(diff.oldValue)}
                  </span>
                  <span className={styles.fieldArrow}>→</span>
                  <span className={styles.fieldNew}>
                    {formatValue(diff.newValue)} →
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return String(val)
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'number') return val.toFixed(2)
  if (typeof val === 'string') return val.length > 40 ? val.slice(0, 40) + '…' : val
  if (typeof val === 'object') {
    try { return JSON.stringify(val).slice(0, 60) } catch { return '[object]' }
  }
  return String(val)
}

// ─── Error Log ─────────────────────────────────────────────────

interface ErrorLogProps {
  errors: TracerEvent[]
}

function ErrorLog({ errors }: ErrorLogProps) {
  if (errors.length === 0) return null

  return (
    <div className={styles.errorLog}>
      <div className={styles.errorLogHeader}>
        <span className={styles.errorLogTitle}>⚠ Errors</span>
        <span className={styles.errorCount}>{errors.length}</span>
      </div>
      <div className={styles.errorList}>
        {errors.map((evt, i) => (
          <div key={i} className={styles.errorItem}>
            <span className={styles.errorTime}>{formatTime(evt.t)}</span>
            <span className={styles.errorMsg}>
              {String(evt.payload?.message ?? evt.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Perception Panel ────────────────────────────────────────

interface PerceptionPanelProps {
  events: TracerEvent[] | undefined
}

function PerceptionPanel({ events }: PerceptionPanelProps) {
  const perceptionEvents = useMemo(
    () => (events ?? []).filter((e) => e.type === 'perception'),
    [events],
  )

  const categoryIcons: Record<PerceptionCategory, string> = {
    'see.face': '👤',
    'see.object': '📦',
    'hear.word': '🗣️',
    'hear.sound': '🔊',
    'near': '📏',
    'tilt': '📐',
    'bump': '💥',
    'custom': '✨',
  }

  const categoryColors: Record<PerceptionCategory, string> = {
    'see.face': '#4ecdc4',
    'see.object': '#45b7d1',
    'hear.word': '#f9ca24',
    'hear.sound': '#f0932b',
    'near': '#6c5ce7',
    'tilt': '#a29bfe',
    'bump': '#ff6b6b',
    'custom': '#fd79a8',
  }

  const recentEvents = useMemo(
    () => perceptionEvents.slice(-50),
    [perceptionEvents],
  )

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const evt of perceptionEvents) {
      const cat = evt.label as PerceptionCategory
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
  }, [perceptionEvents])

  if (perceptionEvents.length === 0) {
    return null
  }

  return (
    <div className={styles.perceptionPanel}>
      <div className={styles.perceptionHeader}>
        <span className={styles.panelIcon}>👁️</span>
        <span className={styles.panelTitle}>Perception</span>
        <span className={styles.perceptionCount}>{perceptionEvents.length} events</span>
      </div>

      {/* Category summary */}
      <div className={styles.perceptionCategories}>
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <span
            key={cat}
            className={styles.perceptionCategoryBadge}
            style={{ backgroundColor: categoryColors[cat as PerceptionCategory] + '33', color: categoryColors[cat as PerceptionCategory] }}
          >
            {categoryIcons[cat as PerceptionCategory]} {cat} ×{count}
          </span>
        ))}
      </div>

      {/* Recent events */}
      <div className={styles.perceptionList}>
        {recentEvents.map((evt, i) => {
          const cat = evt.label as PerceptionCategory
          const color = categoryColors[cat] ?? '#888'
          const confidence = evt.payload?.confidence as number | undefined
          return (
            <div
              key={i}
              className={styles.perceptionEvent}
              style={{ borderLeftColor: color }}
            >
              <span className={styles.perceptionTime}>{formatTime(evt.t)}</span>
              <span className={styles.perceptionIcon}>{categoryIcons[cat]}</span>
              <span className={styles.perceptionCategory}>{cat}</span>
              {confidence !== undefined && (
                <span className={styles.perceptionConfidence} style={{ color }}>
                  {(confidence * 100).toFixed(0)}%
                </span>
              )}
              <span className={styles.perceptionSource}>[{String(evt.payload?.source ?? '')}]</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Debug Page ───────────────────────────────────────────

export function DebugPage() {
  const debug = useDebug()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [scrubberTraceData, setScrubberTraceData] = useState<
    { header: Record<string, unknown>; events: TracerEvent[] } | undefined
  >()
  const [selfTestResult, setSelfTestResult] = useState<{
    ok: boolean
    status: string
    checks: Array<{ name: string; ok: boolean; message: string }>
  } | null>(null)
  const [selfTestLoading, setSelfTestLoading] = useState(false)

  // Collect active nodes from tree
  const activeNodes = useMemo(() => {
    const set = new Set<string>()
    if (!debug.tree) return set
    const walk = (node: RuntimeNode) => {
      if (node.status === 'running') {
        set.add(node.def.name ?? node.def.type)
      }
      for (const child of node.children) {
        walk(child)
      }
    }
    walk(debug.tree)
    return set
  }, [debug.tree])

  // Blackboard diff
  const diffs = useMemo(
    () => diffBlackboards(debug.prevBlackboard, debug.blackboard),
    [debug.prevBlackboard, debug.blackboard],
  )

  const handleClear = useCallback(() => {
    tracer.clear()
    debug.reset()
  }, [debug])

  const handlePause = useCallback(() => {
    tracer.setEnabled(!tracer.enabled)
  }, [])

  return (
    <div className={styles.page}>
      {/* Top stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.statsGroup}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Tick Rate</span>
            <span className={`${styles.statValue} ${debug.tickRate >= 8 ? '' : styles.statWarning}`}>
              {debug.tickRate.toFixed(1)} fps
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Avg Latency</span>
            <span className={styles.statValue}>
              {debug.avgLatency.toFixed(2)} ms
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Events</span>
            <span className={styles.statValue}>{debug.totalEvents}</span>
          </div>
        </div>
        <div className={styles.statsActions}>
          <button
            className={styles.btn}
            onClick={handlePause}
          >
            {tracer.enabled ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={handleClear}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Error log */}
      {showErrors && <ErrorLog errors={debug.errors} />}
      {debug.errors.length > 0 && (
        <button
          className={styles.errorToggle}
          onClick={() => setShowErrors(!showErrors)}
        >
          ⚠ {debug.errors.length} error{debug.errors.length > 1 ? 's' : ''}
        </button>
      )}

      {/* Trace Scrubber */}
      <TraceScrubber
        liveEvents={debug.breadcrumb}
        liveBlackboard={debug.blackboard}
        traceData={scrubberTraceData}
      />

      {/* Breakpoint Panel */}
      <BreakpointPanel
        onTriggered={() => {
          /* breakpoint triggered — banner shown in panel */
        }}
      />

      {/* Trace Puller — real device WebSocket */}
      <TracePullerPanel
        onLoadScrubber={(data) => {
          // Convert pulled trace data to TracerEvent[] for scrubber
          const events: TracerEvent[] = (data.events as { t: number; type: string; label: string; payload: unknown }[]).map(e => ({
            t: e.t,
            type: e.type as TracerEventType,
            label: e.label,
            payload: e.payload as Record<string, unknown> | undefined,
          }))
          setScrubberTraceData({ header: data.header, events })
        }}
      />

      {/* Safety Supervisor */}
      <SafetyEventPanel
        safetyState={debug.safetyState}
        eStopActive={debug.eStopActive}
        events={debug.safetyEvents}
        onClearEStop={() => {
          debug.updateSafety('ok', false)
        }}
        onSelfTest={async () => {
          setSelfTestLoading(true)
          try {
            // Self-test requires a running runner; report best-effort
            setSelfTestResult({ ok: true, status: 'no-runner', checks: [] })
          } finally {
            setSelfTestLoading(false)
          }
        }}
        selfTestResult={selfTestResult}
        selfTestLoading={selfTestLoading}
      />

      {/* Perception Panel */}
      <PerceptionPanel events={debug.perceptionEvents} />

      {/* Memories Panel */}
      <MemoriesPanel
        memories={debug.memories}
        stats={computeMemoryStats(debug.memories)}
        onPurge={debug.purgeMemories}
        onForget={debug.simulateForgetting}
      />

      {/* Main split view */}
      <div className={styles.splitView}>
        {/* Left: BT Graph */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>🌳</span>
            <span className={styles.panelTitle}>Behavior Tree</span>
          </div>
          <div className={styles.panelBody}>
            {debug.tree ? (
              <>
                <TreeNode
                  node={debug.tree}
                  depth={0}
                  activeNodes={activeNodes}
                  onHover={setHoveredNode}
                />
                <div className={styles.breadcrumbSection}>
                  <span className={styles.breadcrumbLabel}>Breadcrumb (last {debug.breadcrumb.length})</span>
                  <Breadcrumb events={debug.breadcrumb} hoveredNode={hoveredNode} />
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🌳</span>
                <p>Start a behavior tree to see the graph</p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Actuator Timeline */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>📡</span>
            <span className={styles.panelTitle}>Actuator Timeline</span>
          </div>
          <div className={styles.panelBody}>
            <ActuatorTimeline events={debug.adapterEvents} />
          </div>
        </div>

        {/* Right: Blackboard Inspector */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>🧠</span>
            <span className={styles.panelTitle}>Blackboard</span>
          </div>
          <div className={styles.panelBody}>
            <BlackboardInspector
              blackboard={debug.blackboard}
              diffs={diffs}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
