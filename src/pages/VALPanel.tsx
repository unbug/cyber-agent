/**
 * CyberAgent — VAL (Valence / Arousal / Dominance) Debug Panel
 *
 * Displays the real-time affect trajectory of the running agent:
 * - Current VAL state with color-coded gauges
 * - Historical VAL trajectory (last 300 ticks)
 * - Emotion label (derived from current VAL)
 * - Perception events that shifted VAL
 */

import { useMemo, useRef, useEffect, useCallback } from 'react'
import styles from './DebugPage.module.css'
import type { ValState } from '@/affect/types'
import { valToString } from '@/affect/types'

// ─── VAL Trajectory Canvas ──────────────────────────────────────

interface ValTrajectoryProps {
  history: Array<{ t: number; valence: number; arousal: number; dominance: number }>
  width?: number
  height?: number
}

function ValTrajectory({ history, width = 400, height = 120 }: ValTrajectoryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const pad = 8
    const plotW = width - pad * 2
    const plotH = height - pad * 2

    // Grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = pad + (plotH / 4) * i
      ctx.beginPath()
      ctx.moveTo(pad, y)
      ctx.lineTo(width - pad, y)
      ctx.stroke()
    }

    const datasets = [
      { key: 'valence' as const, color: '#4ecdc4', label: 'V' },
      { key: 'arousal' as const, color: '#f9ca24', label: 'A' },
      { key: 'dominance' as const, color: '#a29bfe', label: 'D' },
    ]

    for (const ds of datasets) {
      ctx.strokeStyle = ds.color
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < history.length; i++) {
        const x = pad + (i / (history.length - 1)) * plotW
        const point = history[i]
        if (!point) continue
        const normalized = point[ds.key]
        // Map: valence [-1,1] → [height,0], arousal/dominance [0,1] → [height,0]
        const y = ds.key === 'valence'
          ? pad + ((1 - normalized) / 2) * plotH
          : pad + (1 - normalized) * plotH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Legend
    ctx.font = '11px monospace'
    let legendX = width - pad - 120
    for (const ds of datasets) {
      ctx.fillStyle = ds.color
      ctx.fillRect(legendX, pad, 10, 10)
      ctx.fillText(ds.label, legendX + 14, pad + 9)
      legendX -= 50
    }
  }, [history, width, height])

  useEffect(() => { draw() }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={styles.valTrajectoryCanvas}
      style={{ width, height }}
    />
  )
}

// ─── VAL Gauge ──────────────────────────────────────────────────

interface ValGaugeProps {
  label: string
  value: number
  range: [number, number]
  color: string
  icon: string
}

function ValGauge({ label, value, range, color, icon }: ValGaugeProps) {
  const [pct] = useMemo(() => {
    const [min, max] = range
    const n = (value - min) / (max - min)
    return [n, Math.round(n * 100)]
  }, [value, range])

  return (
    <div className={styles.valGauge}>
      <div className={styles.valGaugeHeader}>
        <span className={styles.valGaugeIcon}>{icon}</span>
        <span className={styles.valGaugeLabel}>{label}</span>
      </div>
      <div className={styles.valGaugeBar}>
        <div
          className={styles.valGaugeFill}
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
        />
      </div>
      <div className={styles.valGaugeFooter}>
        <span className={styles.valGaugeValue} style={{ color }}>
          {value.toFixed(3)}
        </span>
        <span className={styles.valGaugePct}>{pct}%</span>
      </div>
    </div>
  )
}

// ─── VAL Event Log ──────────────────────────────────────────────

interface ValEventLogProps {
  perceptionEvents: Array<{ t: number; label: string; payload?: Record<string, unknown> }>
}

function ValEventLog({ perceptionEvents }: ValEventLogProps) {
  const valEvents = useMemo(
    () =>
      (perceptionEvents ?? [])
        .filter((e) => e.payload?.confidence !== undefined)
        .slice(-20)
        .reverse(),
    [perceptionEvents],
  )

  return (
    <div className={styles.valEventLog}>
      <div className={styles.valEventLogTitle}>Perception → VAL Shifts</div>
      {valEvents.length === 0 ? (
        <div className={styles.valEventLogEmpty}>No perception events yet</div>
      ) : (
        <div className={styles.valEventList}>
          {valEvents.map((evt, i) => {
            const confidence = evt.payload?.confidence as number
            return (
              <div key={i} className={styles.valEventItem}>
                <span className={styles.valEventTime}>{evt.t.toFixed(0)}ms</span>
                <span className={styles.valEventCategory}>{evt.label}</span>
                {confidence !== undefined && (
                  <span
                    className={styles.valEventConfidence}
                    style={{ color: confidence > 0.7 ? '#4ecdc4' : confidence > 0.4 ? '#f9ca24' : '#ff6b6b' }}
                  >
                    {(confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main VAL Panel ─────────────────────────────────────────────

interface VALPanelProps {
  valState: ValState | null
  valHistory: Array<{ t: number; valence: number; arousal: number; dominance: number }>
  perceptionEvents: Array<{ t: number; label: string; payload?: Record<string, unknown> }>
  emotionLabel?: string
}

export function VALPanel({ valState, valHistory, perceptionEvents }: VALPanelProps) {
  const safeHistory = valHistory ?? []
  const safePerception = perceptionEvents ?? []
  const currentEmotion = useMemo(() => {
    if (!valState) return 'idle'
    const v = valState.valence
    const a = valState.arousal
    const d = valState.dominance

    if (a > 0.7 && v > 0) return 'excited'
    if (a > 0.7 && v < -0.3) return 'anxious'
    if (a < 0.3 && v > 0) return 'calm'
    if (a < 0.3 && v < -0.3) return 'depressed'
    if (d > 0.7 && a > 0.5) return 'dominant'
    if (d < 0.3 && a > 0.5) return 'overwhelmed'
    if (v > 0.5 && a > 0.4) return 'playful'
    if (v < -0.5 && d < 0.5) return 'shy'
    return 'neutral'
  }, [valState])

  return (
    <div className={styles.valPanel}>
      <div className={styles.valPanelHeader}>
        <span className={styles.valPanelIcon}>💓</span>
        <span className={styles.valPanelTitle}>Affect (VAL)</span>
        <span className={styles.valEmotionBadge}>
          {currentEmotion === 'idle' ? '⏸' : '🎭'} {currentEmotion}
        </span>
        <span className={styles.valEmotionLabel}>{valState ? valToString(valState) : '—'}</span>
      </div>

      <div className={styles.valBody}>
        {/* Current state gauges */}
        <div className={styles.valGauges}>
          <ValGauge
            label="Valence"
            value={valState?.valence ?? 0}
            range={[-1, 1]}
            color="#4ecdc4"
            icon="😊"
          />
          <ValGauge
            label="Arousal"
            value={valState?.arousal ?? 0}
            range={[0, 1]}
            color="#f9ca24"
            icon="⚡"
          />
          <ValGauge
            label="Dominance"
            value={valState?.dominance ?? 0}
            range={[0, 1]}
            color="#a29bfe"
            icon="👑"
          />
        </div>

        {/* Trajectory */}
        <div className={styles.valTrajectory}>
          <ValTrajectory history={safeHistory} width={500} height={130} />
        </div>

        {/* Perception → VAL events */}
        <ValEventLog perceptionEvents={safePerception} />
      </div>
    </div>
  )
}
