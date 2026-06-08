/**
 * ErrorTimelinePanel — Visual timeline of errors with root-cause context.
 *
 * Shows error events on a shared time axis alongside the BT execution,
 * adapter commands, and blackboard changes that preceded each error.
 * Helps diagnose issues without real hardware by showing the full chain:
 *   perception → BT decision → motor command → error
 */

import { useMemo, useCallback } from 'react'
import { tracer, type TracerEvent } from '@/engine/tracer'
import styles from './ErrorTimelinePanel.module.css'

interface ErrorWithContext {
  event: TracerEvent
  precedingEvents: TracerEvent[]
  timestamp: string
}

const ERROR_ICONS: Record<string, string> = {
  'error': '⚠',
  'breakpoint.triggered': '🔒',
  'policy.failure': '❌',
  'policy.low_confidence': '⚡',
}

const ERROR_COLORS: Record<string, string> = {
  'error': '#ef4444',
  'breakpoint.triggered': '#f59e0b',
  'policy.failure': '#dc2626',
  'policy.low_confidence': '#d97706',
}

export function ErrorTimelinePanel() {
  const allEvents = useMemo(() => tracer.snapshot(), [])

  // Find error events and their preceding context (last 5 events before each error)
  const errorsWithContext = useMemo<ErrorWithContext[]>(() => {
    const errors: TracerEvent[] = []
    for (const evt of allEvents) {
      if (evt.type === 'error' || evt.type === 'policy.failure') {
        errors.push(evt)
      }
    }

    return errors.map(errorEvt => {
      // Find index of this error event
      const idx = allEvents.indexOf(errorEvt)
      // Get preceding events (last 5 before the error)
      const startIdx = Math.max(0, idx - 5)
      const preceding = allEvents.slice(startIdx, idx)

      return {
        event: errorEvt,
        precedingEvents: preceding,
        timestamp: formatTime(errorEvt.t),
      }
    })
  }, [allEvents])

  // Group errors by type for summary
  const errorSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of allEvents) {
      if (e.type === 'error' || e.type === 'policy.failure') {
        counts[e.type] = (counts[e.type] ?? 0) + 1
      }
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
  }, [allEvents])

  const hasErrors = errorsWithContext.length > 0

  // Export error report as JSON for sharing
  const handleExportReport = useCallback(() => {
    if (!hasErrors) return
    const report = {
      generatedAt: new Date().toISOString(),
      totalEvents: allEvents.length,
      errorCount: errorsWithContext.length,
      summary: Object.fromEntries(errorSummary),
      errors: errorsWithContext.map(e => ({
        timestamp: e.timestamp,
        type: e.event.type,
        label: e.event.label,
        message: e.event.payload?.message ?? 'No message',
        precedingEvents: e.precedingEvents.map(pe => ({
          time: formatTime(pe.t),
          type: pe.type,
          label: pe.label,
        })),
      })),
    }
    const json = JSON.stringify(report, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [hasErrors, allEvents, errorsWithContext, errorSummary])

  if (!hasErrors) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.icon}>✅</span>
          <span className={styles.title}>Error Timeline</span>
          <span className={styles.badge}>No errors</span>
        </div>
        <div className={styles.emptyState}>
          <p>No error events detected in this session.</p>
          <p className={styles.hint}>Errors will appear here as they occur during execution.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      {/* Header with summary */}
      <div className={styles.header}>
        <span className={styles.icon}>⚠️</span>
        <span className={styles.title}>Error Timeline</span>
        <div className={styles.summary}>
          {errorSummary.map(([type, count]) => (
            <span
              key={type}
              className={styles.summaryItem}
              style={{ color: ERROR_COLORS[type] ?? '#888' }}
            >
              {ERROR_ICONS[type] ?? '·'} {count}× {type}
            </span>
          ))}
        </div>
      </div>

      {/* Error timeline */}
      <div className={styles.timeline}>
        {errorsWithContext.map((errorInfo, i) => (
          <div key={i} className={styles.errorBlock}>
            {/* Error event */}
            <div
              className={styles.errorEvent}
              style={{ borderLeftColor: ERROR_COLORS[errorInfo.event.type] ?? '#ef4444' }}
            >
              <span className={styles.errorTime}>{errorInfo.timestamp}</span>
              <span
                className={styles.errorType}
                style={{ color: ERROR_COLORS[errorInfo.event.type] ?? '#ef4444' }}
              >
                {ERROR_ICONS[errorInfo.event.type] ?? '·'} {errorInfo.event.type}
              </span>
              <span className={styles.errorMessage}>
                {String(errorInfo.event.payload?.message ?? errorInfo.event.label)}
              </span>
            </div>

            {/* Preceding context */}
            {errorInfo.precedingEvents.length > 0 && (
              <div className={styles.contextChain}>
                <span className={styles.contextLabel}>Preceded by:</span>
                {errorInfo.precedingEvents.map((evt, j) => (
                  <div key={j} className={styles.contextEvent}>
                    <span className={styles.contextTime}>{formatTime(evt.t)}</span>
                    <span className={contextTypeColor(evt.type)}>{evt.type}</span>
                    <span className={styles.contextLabel}>{evt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Export button */}
      <button className={styles.exportBtn} onClick={handleExportReport}>
        📥 Export Error Report
      </button>
    </div>
  )
}

function formatTime(t: number): string {
  return `${(t / 1000).toFixed(2)}s`
}

function contextTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'tick.start': '#3b82f6',
    'node.enter': '#3b82f6',
    'action.dispatch': '#f97316',
    'adapter.tx': '#22c55e',
    'bb.set': '#06b6d4',
  }
  return colors[type] ?? '#888'
}
