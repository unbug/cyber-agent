/**
 * SafetyEventPanel — Displays safety supervisor events in the /debug page.
 *
 * Shows:
 * - Current safety state (ok / degraded / e_stopped)
 * - Heartbeat status
 * - Recent safety events (heartbeat_miss, motor_stall, battery_low, e_stop, etc.)
 * - Policy display
 * - Manual actions (clear e-stop, run self-test)
 */

import { useState, useRef, useEffect } from 'react'
import type { SafetyEvent, SafetyState } from '@/engine/safety-supervisor'
import styles from '../pages/DebugPage.module.css'

interface SafetyEventPanelProps {
  /** Current safety state */
  safetyState: SafetyState | null
  /** E-stop active flag */
  eStopActive: boolean
  /** Recent safety events */
  events: SafetyEvent[]
  /** Clear e-stop handler */
  onClearEStop: () => void
  /** Run self-test handler */
  onSelfTest: () => void
  /** Self-test result (null if not run) */
  selfTestResult: { ok: boolean; status: string; checks: Array<{ name: string; ok: boolean; message: string }> } | null
  /** Whether self-test is running */
  selfTestLoading: boolean
}

function stateIcon(state: SafetyState | null): string {
  switch (state) {
    case 'ok': return '✅'
    case 'degraded': return '⚠️'
    case 'e_stopped': return '🛑'
    default: return '⏸'
  }
}

function stateColor(state: SafetyState | null): string {
  switch (state) {
    case 'ok': return '#22c55e'
    case 'degraded': return '#eab308'
    case 'e_stopped': return '#ef4444'
    default: return '#6b7280'
  }
}

function formatSafetyEvent(evt: SafetyEvent): string {
  const t = evt.type
  switch (t) {
    case 'heartbeat_ok':
      return `Heartbeat OK`
    case 'heartbeat_miss':
      return `Heartbeat miss: ${(evt as any).gapMs.toFixed(0)}ms gap (${(evt as any).consecutiveMisses} consecutive)`
    case 'e_stop_triggered':
      return `E-stop: ${evt.reason}`
    case 'motor_stall':
      return `Motor stall: ${evt.motor} at ${evt.currentA.toFixed(2)}A (threshold: ${evt.thresholdA.toFixed(2)}A)`
    case 'battery_low':
      return `Battery: ${evt.voltage.toFixed(2)}V (min: ${evt.minVoltage.toFixed(2)}V)`
    case 'self_test_fail':
      return `Self-test fail: ${evt.checkName} — ${evt.message}`
    case 'policy_changed':
      return `Policy: ${evt.oldPolicy} → ${evt.newPolicy}`
    default:
      return String(t)
  }
}

function formatEventTime(t: number): string {
  return `${(t / 1000).toFixed(2)}s`
}

export function SafetyEventPanel({
  safetyState,
  eStopActive,
  events,
  onClearEStop,
  onSelfTest,
  selfTestResult,
  selfTestLoading,
}: SafetyEventPanelProps) {
  const [showDetails, setShowDetails] = useState(false)
  const eventLogRef = useRef<HTMLDivElement>(null)
  const safeEvents = events ?? []

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (eventLogRef.current && safeEvents.length > 0) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight
    }
  }, [safeEvents.length])

  const eventCount = safeEvents.length
  const eStopCount = safeEvents.filter(e => e.type === 'e_stop_triggered').length

  return (
    <div className={styles.bpPanel}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🛡️ Safety
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: stateColor(safetyState),
              background: `${stateColor(safetyState)}11`,
              padding: '2px 8px',
              borderRadius: '99px',
            }}
          >
            {stateIcon(safetyState)} {safetyState ?? 'inactive'}
          </span>
          <button
            className={styles.bpSmallBtn}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* E-stop banner */}
      {eStopActive && (
        <div className={styles.bpPausedBanner}>
          <span className={styles.bpPausedIcon}>🛑</span>
          <span>E-stop active</span>
          <button className={styles.bpResumeBtn} onClick={onClearEStop}>
            Clear E-stop
          </button>
        </div>
      )}

      {/* Event count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
          {eventCount} safety event{eventCount !== 1 ? 's' : ''}
        </span>
        <button
          className={styles.bpSmallBtn}
          onClick={onSelfTest}
          disabled={selfTestLoading}
          style={{ opacity: selfTestLoading ? 0.5 : 1 }}
        >
          {selfTestLoading ? '⏳ Testing...' : '🔍 Self-test'}
        </button>
      </div>

      {/* Event log */}
      {eventCount > 0 && (
        <div
          ref={eventLogRef}
          style={{
            maxHeight: '160px',
            overflowY: 'auto',
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: '0.65rem',
          }}
        >
          {safeEvents.slice(-20).map((evt, i) => {
            const et = evt as SafetyEvent
            return (
            <div
              key={i}
              style={{
                padding: '3px 6px',
                marginBottom: '2px',
                borderRadius: '4px',
                background: evt.type === 'e_stop_triggered' ? '#ef444411'
                  : evt.type === 'heartbeat_miss' ? '#eab30811'
                  : 'var(--bg-elevated)',
                borderLeft: evt.type === 'e_stop_triggered' ? '3px solid #ef4444'
                  : evt.type === 'heartbeat_miss' ? '3px solid #eab308'
                  : '3px solid var(--border)',
                display: 'flex',
                gap: '6px',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: 'var(--text-tertiary)', minWidth: '55px', flexShrink: 0 }}>
                {formatEventTime(et.t)}
              </span>
              <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatSafetyEvent(et)}
              </span>
            </div>
            )
          })}
        </div>
      )}

      {/* Self-test result */}
      {selfTestResult && (
        <div style={{
          padding: '8px',
          borderRadius: '6px',
          background: selfTestResult.ok ? '#22c55e11' : '#ef444411',
          border: `1px solid ${selfTestResult.ok ? '#22c55e33' : '#ef444433'}`,
          fontSize: '0.7rem',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', color: selfTestResult.ok ? '#22c55e' : '#ef4444' }}>
            {selfTestResult.ok ? '✅ Self-test passed' : '❌ Self-test failed'}
          </div>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>
            Status: {selfTestResult.status}
          </div>
          {showDetails && (
            <div style={{ marginTop: '4px' }}>
              {selfTestResult.checks.map((check, i) => (
                <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                  <span style={{ color: check.ok ? '#22c55e' : '#ef4444' }}>
                    {check.ok ? '✓' : '✗'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {check.name}: {check.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          borderRadius: '6px',
          background: 'var(--bg-elevated)',
          fontSize: '0.65rem',
          color: 'var(--text-tertiary)',
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>E-stop count:</strong> {eStopCount}
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Latest event:</strong>{' '}
            {safeEvents.length > 0 ? formatSafetyEvent(safeEvents[safeEvents.length - 1]!) : 'None'}
          </div>
        </div>
      )}
    </div>
  )
}
