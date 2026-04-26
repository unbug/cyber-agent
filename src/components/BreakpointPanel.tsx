/**
 * BreakpointPanel — Manage breakpoints in the /debug page.
 *
 * Supports three breakpoint kinds:
 *   1. BT node breakpoint — pause when a node enters/exits
 *   2. Blackboard predicate — pause when a bb.set matches a field/value pattern
 *   3. Adapter event breakpoint — pause on a specific adapter.tx/adapter.rx
 *
 * When a breakpoint triggers, the tracer pauses and emits a
 * `breakpoint.triggered` event. The UI shows a paused state indicator
 * and the breakpoint details.
 */

import { useState, useEffect } from 'react'
import { breakpoints, type Breakpoint, addNodeBreakpoint, addBbBreakpoint, addAdapterBreakpoint } from '@/engine/breakpoints'
import { tracer } from '@/engine/tracer'
import styles from '../pages/DebugPage.module.css'

// ─── Add Breakpoint Form ─────────────────────────────────────────

type BreakpointKind = 'node' | 'blackboard' | 'adapter'

interface NewBreakpoint {
  kind: BreakpointKind
  pattern: string
  value?: string
  phase?: 'enter' | 'exit' | 'both'
  eventType?: 'adapter.tx' | 'adapter.rx'
}

function BreakpointForm({ onAdd }: { onAdd: (bp: NewBreakpoint) => void }) {
  const [kind, setKind] = useState<BreakpointKind>('node')
  const [pattern, setPattern] = useState('')
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState<'enter' | 'exit' | 'both'>('both')
  const [eventType, setEventType] = useState<'adapter.tx' | 'adapter.rx'>('adapter.tx')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pattern.trim()) return
    onAdd({ kind, pattern: pattern.trim(), value: value.trim() || undefined, phase, eventType })
    setPattern('')
    setValue('')
  }

  return (
    <form className={styles.bpForm} onSubmit={handleSubmit}>
      <select className={styles.bpKindSelect} value={kind} onChange={e => setKind(e.target.value as BreakpointKind)}>
        <option value="node">🌳 BT Node</option>
        <option value="blackboard">🧠 Blackboard</option>
        <option value="adapter">📡 Adapter</option>
      </select>

      <input
        className={styles.bpPatternInput}
        type="text"
        placeholder={kind === 'node' ? 'Node name (e.g. Root*)' : kind === 'blackboard' ? 'Field name (e.g. battery)' : 'Command pattern (e.g. move_*)'}
        value={pattern}
        onChange={e => setPattern(e.target.value)}
      />

      {kind === 'node' && (
        <select className={styles.bpPhaseSelect} value={phase} onChange={e => setPhase(e.target.value as typeof phase)}>
          <option value="both">Both</option>
          <option value="enter">Enter</option>
          <option value="exit">Exit</option>
        </select>
      )}

      {kind === 'adapter' && (
        <select className={styles.bpPhaseSelect} value={eventType} onChange={e => setEventType(e.target.value as typeof eventType)}>
          <option value="adapter.tx">TX</option>
          <option value="adapter.rx">RX</option>
        </select>
      )}

      {kind === 'blackboard' && (
        <input
          className={styles.bpValueInput}
          type="text"
          placeholder="Value (optional)"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      )}

      <button className={styles.bpAddBtn} type="submit">
        + Add
      </button>
    </form>
  )
}

// ─── Breakpoint List Item ────────────────────────────────────────

function BreakpointItem({ bp, onToggle, onDelete }: {
  bp: Breakpoint
  onToggle: () => void
  onDelete: () => void
}) {
  const kindIcon = bp.kind === 'node' ? '🌳' : bp.kind === 'blackboard' ? '🧠' : '📡'
  const kindLabel = bp.kind === 'node' ? 'Node' : bp.kind === 'blackboard' ? 'BB' : 'Adapter'

  return (
    <div className={`${styles.bpItem} ${!bp.enabled ? styles.bpDisabled : ''}`}>
      <span className={styles.bpIcon}>{kindIcon}</span>
      <span className={styles.bpKind}>{kindLabel}</span>
      <span className={styles.bpPattern}>{bp.condition.type === 'node' ? (bp.condition as any).nodePattern
        : bp.condition.type === 'blackboard' ? (bp.condition as any).fieldPattern
        : `${(bp.condition as any).eventType}${(bp.condition as any).commandPattern ? ': ' + (bp.condition as any).commandPattern : ''}`}</span>
      <span className={styles.bpHitCount}>hits: {bp.hitCount}</span>
      <button
        className={`${styles.bpToggleBtn} ${bp.enabled ? styles.bpEnabled : styles.bpDisabledBtn}`}
        onClick={onToggle}
        title={bp.enabled ? 'Disable' : 'Enable'}
      >
        {bp.enabled ? '⏸' : '▶'}
      </button>
      <button className={styles.bpDeleteBtn} onClick={onDelete} title="Delete">
        ✕
      </button>
    </div>
  )
}

// ─── Triggered Breakpoint Banner ─────────────────────────────────

function TriggeredBanner({ bp, onResume }: { bp: Breakpoint | null; onResume: () => void }) {
  if (!bp) return null

  const kindIcon = bp.kind === 'node' ? '🌳' : bp.kind === 'blackboard' ? '🧠' : '📡'

  return (
    <div className={styles.bpBanner}>
      <span className={styles.bpBannerIcon}>{kindIcon}</span>
      <div className={styles.bpBannerContent}>
        <span className={styles.bpBannerTitle}>Breakpoint triggered: {bp.name}</span>
        <span className={styles.bpBannerDetail}>
          hits: {bp.hitCount} · {bp.enabled ? 'enabled' : 'auto-disabled'}
        </span>
      </div>
      <button className={styles.bpResumeBtn} onClick={onResume}>
        ▶ Resume
      </button>
    </div>
  )
}

// ─── Main BreakpointPanel Component ──────────────────────────────

interface BreakpointPanelProps {
  onTriggered: (bp: Breakpoint) => void
}

export function BreakpointPanel({ onTriggered }: BreakpointPanelProps) {
  const [bps, setBps] = useState<Breakpoint[]>(breakpoints.getAll())
  const [triggeredBp, setTriggeredBp] = useState<Breakpoint | null>(null)

  // Subscribe to breakpoint changes
  useEffect(() => {
    const unsub = breakpoints.subscribe(() => {
      setBps(breakpoints.getAll())
    })
    return unsub
  }, [])

  // Listen for breakpoint.triggered events from tracer
  useEffect(() => {
    const unsub = tracer.subscribe(event => {
      if (event.type === 'breakpoint.triggered' && event.payload) {
        const bpId = (event.payload as any).breakpointId as string
        const bp = breakpoints.get(bpId)
        if (bp) {
          setTriggeredBp(bp)
          onTriggered(bp)
        }
      }
    })
    return unsub
  }, [onTriggered])

  const handleAdd = (newBp: NewBreakpoint) => {
    switch (newBp.kind) {
      case 'node':
        addNodeBreakpoint(newBp.pattern, newBp.phase ?? 'both')
        break
      case 'blackboard':
        addBbBreakpoint(newBp.pattern, newBp.value)
        break
      case 'adapter':
        addAdapterBreakpoint(newBp.eventType ?? 'adapter.tx', newBp.pattern)
        break
    }
    setBps(breakpoints.getAll())
  }

  const handleToggle = (id: string) => {
    breakpoints.toggle(id)
    setBps(breakpoints.getAll())
  }

  const handleDelete = (id: string) => {
    breakpoints.remove(id)
    setBps(breakpoints.getAll())
  }

  const handleResume = () => {
    breakpoints.resume()
    setTriggeredBp(null)
    // Also re-enable tracer
    tracer.setEnabled(true)
  }

  const handleClearAll = () => {
    breakpoints.clear()
    setBps([])
    setTriggeredBp(null)
  }

  const handleResetCounts = () => {
    breakpoints.resetHitCounts()
    setBps(breakpoints.getAll())
  }

  const isPaused = breakpoints._paused

  return (
    <div className={styles.bpPanel}>
      {/* Banner */}
      <TriggeredBanner bp={triggeredBp} onResume={handleResume} />

      {/* Pause indicator */}
      {isPaused && !triggeredBp && (
        <div className={styles.bpPausedBanner}>
          <span className={styles.bpPausedIcon}>⏸</span>
          <span>Paused by breakpoint</span>
          <button className={styles.bpResumeBtn} onClick={handleResume}>▶ Resume</button>
        </div>
      )}

      {/* Add form */}
      <BreakpointForm onAdd={handleAdd} />

      {/* Breakpoint list */}
      {bps.length > 0 && (
        <div className={styles.bpList}>
          <div className={styles.bpListHeader}>
            <span className={styles.bpListTitle}>Breakpoints ({bps.filter(b => b.enabled).length}/{bps.length})</span>
            <div className={styles.bpListActions}>
              <button className={styles.bpSmallBtn} onClick={handleResetCounts} title="Reset hit counts">
                ↻
              </button>
              <button className={styles.bpSmallBtnDanger} onClick={handleClearAll} title="Clear all">
                🗑
              </button>
            </div>
          </div>
          <div className={styles.bpItems}>
            {bps.map(bp => (
              <BreakpointItem
                key={bp.id}
                bp={bp}
                onToggle={() => handleToggle(bp.id)}
                onDelete={() => handleDelete(bp.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
