/**
 * TraceQualityPanel — live trace health analysis for /debug
 *
 * Subscribes to the tracer and continuously analyzes the event stream:
 * - Health score (0-100) with color-coded badge
 * - Tick timing (avg / median / max interval, slow-tick count)
 * - Adapter tx/rx fail rate
 * - Perception density, policy stats, error count
 * - Actionable recommendations from the analyzer
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { tracer, type TracerEvent } from '@/engine/tracer'
import { analyzeTraceQuality, type TraceQualityReport } from '@/utils/trace-quality'
import styles from './TraceQualityPanel.module.css'

const MAX_EVENTS = 1000
const REFRESH_MS = 1000

function scoreClass(score: number): string {
  if (score >= 80) return styles.scoreGood!
  if (score >= 50) return styles.scoreWarn!
  return styles.scoreBad!
}

export function TraceQualityPanel() {
  const eventsRef = useRef<TracerEvent[]>([])
  const [report, setReport] = useState<TraceQualityReport | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const unsubscribe = tracer.subscribe((event) => {
      eventsRef.current.push(event)
      if (eventsRef.current.length > MAX_EVENTS) {
        eventsRef.current.shift()
      }
    })

    eventsRef.current = [...tracer.snapshot()]

    const timer = window.setInterval(() => {
      if (eventsRef.current.length > 0) {
        setReport(analyzeTraceQuality([...eventsRef.current]))
      }
    }, REFRESH_MS)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [])

  const stats = useMemo(() => {
    if (!report) return []
    return [
      { label: 'Ticks', value: String(report.tickCount) },
      { label: 'Avg tick', value: `${report.avgTickIntervalMs} ms` },
      { label: 'Max tick', value: `${report.maxTickIntervalMs} ms` },
      { label: 'Slow ticks', value: String(report.slowTicks.length) },
      {
        label: 'Adapter fail',
        value: `${Math.round(report.adapterRxFailRate * 100)}%`,
      },
      { label: 'Perception/s', value: String(report.perceptionEventsPerSec) },
      {
        label: 'Policy ok/fail',
        value: `${report.policySuccessCount}/${report.policyFailureCount}`,
      },
      { label: 'Errors', value: String(report.errorEvents.length) },
    ]
  }, [report])

  return (
    <section className={styles.panel} data-testid="trace-quality-panel">
      <header className={styles.header}>
        <h3 className={styles.title}>Trace Quality</h3>
        {report && (
          <span
            className={`${styles.score} ${scoreClass(report.healthScore)}`}
            data-testid="trace-health-score"
          >
            {report.healthScore}/100
          </span>
        )}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </header>

      {!report && (
        <p className={styles.empty} data-testid="trace-quality-empty">
          No tracer events yet — run a behavior tree to see trace quality.
        </p>
      )}

      {report && !collapsed && (
        <>
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <dt className={styles.statLabel}>{s.label}</dt>
                <dd className={styles.statValue}>{s.value}</dd>
              </div>
            ))}
          </dl>

          {report.recommendations.length > 0 && (
            <ul className={styles.recs} data-testid="trace-recommendations">
              {report.recommendations.map((rec, i) => (
                <li key={i} className={styles.rec}>
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
