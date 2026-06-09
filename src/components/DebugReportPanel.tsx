/**
 * DebugReportPanel — Generate and export a comprehensive debug report.
 *
 * Bundles BT tree, blackboard, errors with context chain, performance stats,
 * character config, policy results, perception events, and adapter events
 * into a shareable JSON file.
 */

import { useState, useCallback } from 'react'
import { useDebug } from '@/hooks/useDebug'
import { useDebugReport } from '@/hooks/useDebugReport'
import styles from './DebugReportPanel.module.css'

export function DebugReportPanel() {
  const debug = useDebug()
  const reportHook = useDebugReport({
    tree: debug.tree,
    blackboard: debug.blackboard,
    errors: debug.errors,
    totalEvents: debug.totalEvents,
    tickRate: debug.tickRate,
    avgLatency: debug.avgLatency,
    perceptionEvents: debug.perceptionEvents,
    policyResults: debug.policyResults,
    policyEvents: debug.policyEvents,
    adapterEvents: debug.adapterEvents,
    emotionPreset: debug.emotionPreset,
    valConfig: debug.valConfig,
    memoryConfig: debug.memoryConfig,
    perceptionConfig: debug.perceptionConfig,
  })

  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleDownload = useCallback(() => {
    setGenerating(true)
    reportHook.download()
    setGenerating(false)
  }, [reportHook])

  const handleCopy = useCallback(async () => {
    const success = await reportHook.copyToClipboard()
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [reportHook])

  // Quick stats summary for the panel header
  const errorCount = debug.errors.length
  const perceptionCount = debug.perceptionEvents.length
  const policyCount = debug.policyResults.length

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>📋 Debug Report</span>
        <span className={styles.subtitle}>
          Export BT state + blackboard + errors for root-cause analysis
        </span>
      </div>

      {/* Quick stats */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Errors</span>
          <span className={`${styles.statValue} ${errorCount > 0 ? styles.statError : ''}`}>
            {errorCount}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Perception</span>
          <span className={styles.statValue}>{perceptionCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Policy calls</span>
          <span className={styles.statValue}>{policyCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Tick rate</span>
          <span className={`${styles.statValue} ${debug.tickRate >= 8 ? '' : styles.statWarning}`}>
            {debug.tickRate.toFixed(1)} fps
          </span>
        </div>
      </div>

      {/* Character info */}
      {debug.emotionPreset && (
        <div className={styles.charInfo}>
          <span className={styles.charLabel}>Character:</span>
          <span className={styles.charValue}>{debug.emotionPreset}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleDownload}
          disabled={generating}
        >
          {generating ? '⏳ Generating...' : '💾 Download Report'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={handleCopy}
          disabled={debug.totalEvents === 0}
        >
          {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
        </button>
      </div>

      {/* Report preview (collapsed by default) */}
      <details className={styles.preview}>
        <summary className={styles.summary}>Preview report structure</summary>
        <pre className={styles.previewContent}>
{`{
  "$schema": "cyberagent/debug-report/v1",
  "generatedAt": "<ISO timestamp>",
  "character": "${debug.emotionPreset ?? 'unknown'}",
  "btTree": { /* flattened BT structure */ },
  "blackboard": { /* filtered fields */ },
  "errors": [/* with preceding context chain */],
  "performance": {
    "tickRateFps": ${debug.tickRate.toFixed(1)},
    "avgLatencyMs": ${debug.avgLatency.toFixed(2)},
    "totalEvents": ${debug.totalEvents},
    "errorCount": ${errorCount}
  },
  "recentPolicyResults": [/* last 20 */],
  "recentPerceptionEvents": [/* last 50 */],
  "recentAdapterEvents": [/* last 100 TX/RX */]
}`}
        </pre>
      </details>

      {/* Empty state */}
      {debug.totalEvents === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <p>No debug data yet. Start a behavior tree to generate a report.</p>
        </div>
      )}
    </div>
  )
}
