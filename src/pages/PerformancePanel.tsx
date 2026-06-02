/**
 * PerformancePanel — Live performance metrics for the /debug page.
 *
 * Shows:
 * - Tick-rate trend (sparkline over last N ticks)
 * - Latency distribution histogram
 * - Per-frame budget compliance (16 ms target)
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import styles from './DebugPage.module.css'

// ─── Types ───────────────────────────────────────────────────────

export interface PerformanceEntry {
  tickRate: number   // fps
  latencyMs: number  // ms
  t: number          // timestamp
}

export interface PerformancePanelProps {
  data: PerformanceEntry[]
  width?: number
  height?: number
}

// ─── Constants ───────────────────────────────────────────────────

const TICK_HISTORY = 120
const BUDGET_MS = 16

// ─── Helpers ─────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─── Component ───────────────────────────────────────────────────

export function PerformancePanel({
  data,
  width = 600,
  height = 200,
}: PerformancePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<{ tickRate: number; latencyMs: number; t: number } | null>(null)

  const tickRates = useMemo(() => (data ?? []).map(d => d.tickRate).slice(-TICK_HISTORY), [data])
  const latencies = useMemo(() => (data ?? []).map(d => d.latencyMs).slice(-TICK_HISTORY), [data])

  const stats = useMemo(() => {
    if (tickRates.length === 0) return null
    const avgRate = tickRates.reduce((a, b) => a + b, 0) / tickRates.length
    const minRate = Math.min(...tickRates)
    const maxRate = Math.max(...tickRates)
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const maxLatency = Math.max(...latencies)
    const budgetHits = latencies.filter(l => l <= BUDGET_MS).length
    const budgetPct = (budgetHits / latencies.length) * 100
    return { avgRate, minRate, maxRate, avgLatency, maxLatency, budgetPct }
  }, [tickRates, latencies])

  // Draw on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cw = width!
    const ch = height!
    canvas.width = cw * dpr
    canvas.height = ch * dpr
    ctx.scale(dpr, dpr)

    const pad = { top: 20, right: 20, bottom: 30, left: 45 }
    const w = cw - pad.left - pad.right
    const h = ch - pad.top - pad.bottom

    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, cw, ch)

    // Grid lines
    ctx.strokeStyle = '#ffffff11'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (h / 4) * i
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(cw - pad.right, y)
      ctx.stroke()
    }

    // Y-axis labels (tick rate)
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    const maxRate = Math.max(60, ...tickRates)
    for (let i = 0; i <= 4; i++) {
      const val = (maxRate / 4) * (4 - i)
      const y = pad.top + (h / 4) * i
      ctx.fillText(val.toFixed(0), pad.left - 5, y + 3)
    }

    // Budget line (16 ms → ~62.5 fps)
    if (maxRate > 60) {
      const budgetY = pad.top + h * (1 - 60 / maxRate)
      ctx.strokeStyle = '#22c55e88'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(pad.left, budgetY)
      ctx.lineTo(cw - pad.right, budgetY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#22c55e'
      ctx.textAlign = 'left'
      ctx.fillText('60 fps', cw - pad.right + 2, budgetY + 3)
    }

    // Tick rate line
    if (tickRates.length >= 2) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < tickRates.length; i++) {
        const x = pad.left + (i / (tickRates.length - 1)) * w
        const y = pad.top + h * (1 - tickRates[i]! / maxRate)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Fill under line
      const lastX = pad.left + w
      const bottomY = pad.top + h
      ctx.lineTo(lastX, bottomY)
      ctx.lineTo(pad.left, bottomY)
      ctx.closePath()
      const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + h)
      gradient.addColorStop(0, '#3b82f622')
      gradient.addColorStop(1, '#3b82f600')
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Latency bars (right side)
    if (latencies.length >= 2) {
      const barW = Math.max(1, w / latencies.length)
      const maxLat = Math.max(32, ...latencies)
      for (let i = 0; i < latencies.length; i++) {
        const x = pad.left + (i / latencies.length) * w
        const barH = (latencies[i]! / maxLat) * h
        const y = pad.top + h - barH
        const isOverBudget = latencies[i]! > BUDGET_MS
        ctx.fillStyle = isOverBudget ? '#ef444466' : '#22c55e44'
        ctx.fillRect(x, y, barW - 1, barH)
      }
    }

    // Hovered point
    if (hovered) {
      const lastT = data[data.length - 1]?.t ?? 1
      const idx = Math.floor((data.length - tickRates.length + tickRates.length * 0.8) * (hovered.t / lastT))
      const clampedIdx = clamp(idx, 0, tickRates.length - 1)
      const x = pad.left + (clampedIdx / (tickRates.length - 1)) * w
      const y = pad.top + h * (1 - tickRates[clampedIdx]! / maxRate)

      ctx.strokeStyle = '#ffffff44'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(x, pad.top)
      ctx.lineTo(x, pad.top + h)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // X-axis label
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('last 120 ticks', cw / 2, ch - 5)
  }, [tickRates, latencies, data, hovered])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pad = { left: 45, right: 20 }
    const cw = width!
    const w = cw - pad.left - pad.right
    const relX = (x - pad.left) / w
    const idx = Math.floor(relX * tickRates.length)
    if (idx >= 0 && idx < tickRates.length && data.length > 0) {
      const dataIdx = Math.floor((data.length - tickRates.length) + (idx / tickRates.length) * tickRates.length)
      const clamped = clamp(dataIdx, 0, data.length - 1)
      setHovered({
        tickRate: tickRates[idx]!,
        latencyMs: latencies[idx]!,
        t: data[clamped]?.t ?? 0,
      })
    }
  }, [tickRates, latencies, width, data])

  const statusColor = stats
    ? stats.budgetPct >= 95 ? '#22c55e'
      : stats.budgetPct >= 80 ? '#f59e0b'
        : '#ef4444'
    : '#888'

  const cw = width!
  const ch = height!

  return (
    <div className={styles.perfPanel}>
      <div className={styles.perfHeader}>
        <span className={styles.panelIcon}>⚡</span>
        <span className={styles.panelTitle}>Performance</span>
        {stats && (
          <span className={styles.perfStats}>
            <span className={styles.perfStatItem}>
              Avg{' '}<strong>{stats.avgRate.toFixed(1)}</strong> fps
            </span>
            <span className={styles.perfStatItem}>
              Latency{' '}<strong>{stats.avgLatency.toFixed(2)}</strong> ms
            </span>
            <span className={styles.perfStatItem}>
              Budget hit{' '}<strong style={{ color: statusColor }}>{stats.budgetPct.toFixed(0)}%</strong>
            </span>
          </span>
        )}
      </div>

      <div className={styles.perfBody}>
        {tickRates.length >= 2 ? (
          <canvas
            ref={canvasRef}
            className={styles.perfCanvas}
            width={cw}
            height={ch}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
          />
        ) : (
          <div className={styles.perfEmpty}>
            <span className={styles.perfEmptyIcon}>⏳</span>
            <p>Collecting performance data...</p>
          </div>
        )}

        {hovered && (
          <div className={styles.perfHover}>
            <span className={styles.perfHoverTime}>{(hovered.t / 1000).toFixed(2)}s</span>
            <span className={styles.perfHoverMetric}>
              <span className={styles.perfHoverLabel}>Tick:</span>
              <strong>{hovered.tickRate.toFixed(1)} fps</strong>
            </span>
            <span className={styles.perfHoverMetric}>
              <span className={styles.perfHoverLabel}>Latency:</span>
              <strong style={{ color: hovered.latencyMs > BUDGET_MS ? '#ef4444' : '#22c55e' }}>
                {hovered.latencyMs.toFixed(2)} ms
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
