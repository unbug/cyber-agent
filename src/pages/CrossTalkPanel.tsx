/**
 * CrossTalkPanel — Real-time cross-talk detection for MultiBroadcastAdapter.
 *
 * Displays per-robot command stats, drop rates, drift, and health status
 * in a compact panel suitable for the /debug page during multi-robot sessions.
 */

import { useMemo } from 'react'
import styles from './DebugPage.module.css'

// ─── Types ────────────────────────────────────────────────────────

export interface CrossTalkEntry {
  id: string
  sent: number
  received: number
  drops: number
  dropRate: number
}

export interface CrossTalkReport {
  status: 'clean' | 'warning' | 'critical'
  totalSent: number
  totalReceived: number
  totalDrops: number
  perRobot: CrossTalkEntry[]
  hasCriticalRobot: boolean
  criticalRobots: string[]
}

export interface CrossTalkPanelProps {
  report: CrossTalkReport | null
  drift: number
  driftOk: boolean
  eStopActive: boolean
  robotCount: number
  onReset: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  clean: { color: '#22c55e', bg: '#22c55e22', icon: '✅' },
  warning: { color: '#f59e0b', bg: '#f59e0b22', icon: '⚠️' },
  critical: { color: '#ef4444', bg: '#ef444422', icon: '🚨' },
}

function formatDropRate(rate: number): string {
  return `${rate.toFixed(2)}%`
}

// ─── Component ────────────────────────────────────────────────────

export function CrossTalkPanel({
  report,
  drift,
  driftOk,
  eStopActive,
  robotCount,
  onReset,
}: CrossTalkPanelProps) {
  const statusStyle = report ? STATUS_STYLES[report.status] : null

  const summary = useMemo(() => {
    if (!report) return null
    return {
      rate: report.totalSent > 0
        ? ((report.totalReceived / report.totalSent) * 100).toFixed(1)
        : '—',
      dropRate: report.totalSent > 0
        ? ((report.totalDrops / report.totalSent) * 100).toFixed(2)
        : '0.00',
    }
  }, [report])

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon}>📡</span>
        <span className={styles.panelTitle}>Cross-Talk Monitor</span>
        <span className={styles.panelCount}>
          {robotCount} robot{robotCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status banner */}
      <div
        className={styles.crossTalkStatus}
        style={{
          backgroundColor: statusStyle?.bg ?? '#33333344',
          borderColor: statusStyle?.color ?? '#555',
          color: statusStyle?.color ?? '#aaa',
        }}
      >
        <span className={styles.crossTalkIcon}>{statusStyle?.icon ?? '⏳'}</span>
        <span className={styles.crossTalkLabel}>
          {report ? report.status.toUpperCase() : 'NO DATA'}
        </span>
        {eStopActive && (
          <span className={`${styles.crossTalkBadge} ${styles.crossTalkBadgeEstop}`}>
            E-STOP ACTIVE
          </span>
        )}
      </div>

      {/* Summary stats */}
      {report && (
        <div className={styles.crossTalkSummary}>
          <div className={styles.crossTalkStat}>
            <span className={styles.crossTalkStatLabel}>Sent</span>
            <span className={styles.crossTalkStatValue}>{report.totalSent.toLocaleString()}</span>
          </div>
          <div className={styles.crossTalkStat}>
            <span className={styles.crossTalkStatLabel}>Received</span>
            <span className={styles.crossTalkStatValue}>{report.totalReceived.toLocaleString()}</span>
          </div>
          <div className={styles.crossTalkStat}>
            <span className={styles.crossTalkStatLabel}>Drops</span>
            <span
              className={`${styles.crossTalkStatValue} ${
                report.totalDrops > 0 ? styles.statWarning : ''
              }`}
            >
              {report.totalDrops.toLocaleString()}
            </span>
          </div>
          <div className={styles.crossTalkStat}>
            <span className={styles.crossTalkStatLabel}>Drop Rate</span>
            <span
              className={`${styles.crossTalkStatValue} ${
                ((report.totalDrops ?? 0) / Math.max(report.totalSent ?? 1, 1) * 100) > 1
                  ? styles.statWarning : ''
              }`}
            >
              {summary?.dropRate}%
            </span>
          </div>
          <div className={styles.crossTalkStat}>
            <span className={styles.crossTalkStatLabel}>Drift</span>
            <span
              className={`${styles.crossTalkStatValue} ${
                !driftOk ? styles.statWarning : ''
              }`}
            >
              {Math.abs(drift).toFixed(2)} ms
            </span>
          </div>
        </div>
      )}

      {/* Per-robot table */}
      {report && report.perRobot.length > 0 && (
        <table className={styles.crossTalkTable}>
          <thead>
            <tr>
              <th className={styles.crossTalkTh}>Robot</th>
              <th className={styles.crossTalkTh}>Sent</th>
              <th className={styles.crossTalkTh}>Received</th>
              <th className={styles.crossTalkTh}>Drops</th>
              <th className={styles.crossTalkTh}>Drop Rate</th>
            </tr>
          </thead>
          <tbody>
            {report.perRobot.map((entry) => (
              <tr
                key={entry.id}
                style={{
                  backgroundColor:
                    report.criticalRobots.includes(entry.id)
                      ? '#ef444411'
                      : 'transparent',
                }}
              >
                <td className={styles.crossTalkTd}>
                  {entry.id}
                  {report.criticalRobots.includes(entry.id) && (
                    <span className={`${styles.crossTalkBadge} ${styles.crossTalkBadgeCritical}`}>
                      critical
                    </span>
                  )}
                </td>
                <td className={styles.crossTalkTd}>{entry.sent.toLocaleString()}</td>
                <td className={styles.crossTalkTd}>{entry.received.toLocaleString()}</td>
                <td className={styles.crossTalkTd}>{entry.drops.toLocaleString()}</td>
                <td className={styles.crossTalkTd}>
                  <span
                    style={{
                      color: entry.dropRate > 5 ? '#ef4444' : entry.dropRate > 1 ? '#f59e0b' : '#22c55e',
                    }}
                  >
                    {formatDropRate(entry.dropRate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* No data state */}
      {!report && (
        <div className={styles.crossTalkEmpty}>
          <span className={styles.crossTalkEmptyIcon}>📡</span>
          <p>Connect MultiBroadcastAdapter to see cross-talk data</p>
        </div>
      )}

      {/* Reset button */}
      {report && (report.totalSent > 0 || report.totalDrops > 0) && (
        <button className={`${styles.btn} ${styles.btnSmall}`} onClick={onReset}>
          ↻ Reset Counters
        </button>
      )}
    </div>
  )
}
