/**
 * VALTimelinePanel — Unified timeline showing VAL trajectory alongside
 * perception events and adapter tx/rx markers on a shared time axis.
 *
 * This is the v1.3 release deliverable: "VAL trajectory aligned with timeline".
 *
 * Layout (top to bottom):
 *   1. VAL curve — V/A/D plotted over time (shared x-axis)
 *   2. Perception events — colored dots aligned to VAL curve's time axis
 *   3. Adapter events — TX/RX markers aligned to same time axis
 *   4. Crosshair — hover shows time, VAL state, and event details
 */

import { useMemo, useRef, useEffect, useCallback, useState } from 'react'
import { type TracerEvent } from '@/engine/tracer'
import type { ValState } from '@/affect/types'
import styles from './DebugPage.module.css'

// ─── Types ───────────────────────────────────────────────────────

interface TimelineProps {
  /** Current VAL state */
  valState: ValState | null
  /** VAL history: { t, valence, arousal, dominance } */
  valHistory: Array<{ t: number; valence: number; arousal: number; dominance: number }> | null
  /** Perception events from tracer */
  perceptionEvents: TracerEvent[]
  /** Adapter tx/rx events from tracer */
  adapterEvents: TracerEvent[]
  /** Width of the canvas in pixels */
  width?: number
  /** Height of the timeline area in pixels */
  height?: number
}

// ─── Drawing constants ───────────────────────────────────────────

const PAD = { left: 50, right: 20, top: 10, bottom: 10 }
const ROW_HEIGHTS = { val: 140, perception: 30, adapter: 30 }
const VAL_COLORS = {
  valence: '#4ecdc4',
  arousal: '#f9ca24',
  dominance: '#a29bfe',
}
const PERCEPTION_COLORS: Record<string, string> = {
  'see.face': '#4ecdc4',
  'see.object': '#45b7d1',
  'hear.word': '#f9ca24',
  'hear.sound': '#f0932b',
  'near': '#6c5ce7',
  'tilt': '#a29bfe',
  'bump': '#ff6b6b',
  'custom': '#fd79a8',
}
const TX_COLOR = '#22c55e'
const RX_COLOR = '#f97316'

// ─── Main component ──────────────────────────────────────────────

export function VALTimelinePanel({
  valState: _valState,
  valHistory,
  perceptionEvents,
  adapterEvents,
  width = 900,
  height: propHeight,
}: TimelineProps) {
  void _valState // current state shown in VALPanel; timeline shows history
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; t: number } | null>(null)

  const totalHeight = ROW_HEIGHTS.val + ROW_HEIGHTS.perception + ROW_HEIGHTS.adapter + PAD.top + PAD.bottom
  const height = propHeight ?? totalHeight
  const plotW = width - PAD.left - PAD.right
  const safeHistory = valHistory ?? []
  const safePerception = perceptionEvents ?? []
  const safeAdapter = adapterEvents ?? []

  // Compute time window from all events
  const timeWindow = useMemo(() => {
    const allTimes = [
      ...safeHistory.map((v) => v.t),
      ...safePerception.map((e) => e.t),
      ...safeAdapter.map((e) => e.t),
    ]
    if (allTimes.length === 0) return { min: Date.now(), max: Date.now(), span: 30_000 }
    const min = Math.min(...allTimes)
    const max = Math.max(...allTimes)
    // Show last 30s or full range if shorter
    const span = Math.max(10_000, Math.min(30_000, max - min))
    const winMin = Math.max(min, max - span)
    const winMax = max
    return { min: winMin, max: winMax, span: winMax - winMin }
  }, [safeHistory, safePerception, safeAdapter])

  // Map time → x position
  const timeToX = useCallback(
    (t: number) => PAD.left + ((t - timeWindow.min) / timeWindow.span) * plotW,
    [timeWindow, plotW],
  )

  // Find nearest VAL state at a given time
  const nearestValAt = useCallback(
    (t: number) => {
      if (safeHistory.length < 2) return null
      // Binary search for closest point before t
      let lo = 0, hi = safeHistory.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (safeHistory[mid]!.t <= t) lo = mid
        else hi = mid - 1
      }
      const idx = lo < safeHistory.length ? lo : safeHistory.length - 1
      return safeHistory[idx]! ?? safeHistory[0]! ?? null
    },
    [safeHistory],
  )

  // ─── Drawing ─────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const { min: tMin, max: tMax, span: tSpan } = timeWindow

    // ── Row 1: VAL curve ────────────────────────────────────
    const valTop = PAD.top
    const valBot = valTop + ROW_HEIGHTS.val
    const valPlotH = ROW_HEIGHTS.val - PAD.top - PAD.bottom

    // Grid lines for VAL
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 0.5
    // Horizontal grid
    for (let i = 0; i <= 4; i++) {
      const y = valTop + PAD.top + (i / 4) * valPlotH
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(width - PAD.right, y)
      ctx.stroke()
    }
    // Vertical grid (time ticks)
    const timeStep = tSpan > 20_000 ? 5_000 : tSpan > 10_000 ? 2_000 : 1_000
    for (let t = Math.ceil(tMin / timeStep) * timeStep; t <= tMax; t += timeStep) {
      const x = timeToX(t)
      ctx.beginPath()
      ctx.moveTo(x, valTop)
      ctx.lineTo(x, valBot)
      ctx.stroke()
    }

    // Draw VAL curves
    const datasets = [
      { key: 'valence' as const, color: VAL_COLORS.valence, range: [-1, 1], offset: 0 },
      { key: 'arousal' as const, color: VAL_COLORS.arousal, range: [0, 1], offset: 0 },
      { key: 'dominance' as const, color: VAL_COLORS.dominance, range: [0, 1], offset: 0 },
    ]

    for (const ds of datasets) {
      ctx.strokeStyle = ds.color
      ctx.lineWidth = 2
      ctx.beginPath()
      let started = false
      for (let i = 0; i < safeHistory.length; i++) {
        const pt = safeHistory[i]
        if (!pt || pt.t < tMin || pt.t > tMax) continue
        const x = timeToX(pt.t)
        const val = pt![ds.key] as number
        const norm = (val - ds.range[0]!) / (ds.range[1]! - ds.range[0]!)
        const y = valTop + PAD.top + (1 - norm) * valPlotH
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // VAL legend
    ctx.font = '10px monospace'
    let lx = width - PAD.right - 110
    for (const ds of datasets) {
      ctx.fillStyle = ds.color
      ctx.fillRect(lx, valTop + 4, 8, 8)
      const k: string = ds.key as string
      ctx.fillText(k[0]!, lx + 11, valTop + 12)
      lx -= 40
    }

    // ── Row 2: Perception events ────────────────────────────
    const percTop = valBot + 4
    const percH = ROW_HEIGHTS.perception

    // Perception event markers
    for (const evt of safePerception) {
      if (evt.t < tMin || evt.t > tMax) continue
      const x = timeToX(evt.t)
      const cat = evt.label
      const color = PERCEPTION_COLORS[cat] ?? '#888'
      const confidence = evt.payload?.confidence as number | undefined
      const r = confidence !== undefined && confidence > 0.5 ? 5 : 3
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, percTop + percH / 2, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── Row 3: Adapter events ───────────────────────────────
    const adjTop = percTop + percH + 4
    const adjH = ROW_HEIGHTS.adapter

    for (const evt of safeAdapter) {
      if (evt.t < tMin || evt.t > tMax) continue
      const x = timeToX(evt.t)
      const color = evt.type === 'adapter.tx' ? TX_COLOR : RX_COLOR
      const h = evt.type === 'adapter.tx' ? 6 : 4
      const y = adjTop + adjH / 2 - h / 2
      ctx.fillStyle = color
      ctx.fillRect(x - 1, y, 2, h)
    }

    // ── Crosshair ───────────────────────────────────────────
    if (hoverPos && hoverPos.x >= PAD.left && hoverPos.x <= width - PAD.right) {
      const xPos = hoverPos.x
      // Vertical line
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(xPos, valTop)
      ctx.lineTo(xPos, adjTop + adjH)
      ctx.stroke()
      ctx.setLineDash([])

      // Time label
      const t = tMin + ((xPos - PAD.left) / plotW) * tSpan
      ctx.font = '10px monospace'
      ctx.fillStyle = '#aaa'
      ctx.fillText(`${(t / 1000).toFixed(1)}s`, xPos + 6, valTop + 12)

      // VAL state at this time
      const nv = nearestValAt(t)
      if (nv) {
        ctx.font = '11px monospace'
        ctx.fillStyle = VAL_COLORS.valence
        ctx.fillText(`V:${nv.valence.toFixed(2)}`, xPos + 6, valTop + 26)
        ctx.fillStyle = VAL_COLORS.arousal
        ctx.fillText(`A:${nv.arousal.toFixed(2)}`, xPos + 6, valTop + 40)
        ctx.fillStyle = VAL_COLORS.dominance
        ctx.fillText(`D:${nv.dominance.toFixed(2)}`, xPos + 6, valTop + 54)
      }
    }

    // ── Time axis labels ────────────────────────────────────
    ctx.font = '9px monospace'
    ctx.fillStyle = '#666'
    for (let t = Math.ceil(tMin / timeStep) * timeStep; t <= tMax; t += timeStep) {
      const label = `${(t / 1000).toFixed(0)}s`
      ctx.textAlign = 'right'
      ctx.fillText(label, PAD.left - 4, adjTop + adjH + 12)
      ctx.textAlign = 'left'
    }
  }, [safeHistory, safePerception, safeAdapter, timeWindow, hoverPos, timeToX, nearestValAt, width, height])

  useEffect(() => { draw() }, [draw])

  // ─── Hover handler ─────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (x >= PAD.left && x <= width - PAD.right) {
        const t = timeWindow.min + ((x - PAD.left) / plotW) * timeWindow.span
        setHoverPos({ x, y, t })
      } else {
        setHoverPos(null)
      }
    },
    [timeWindow, plotW, width],
  )

  const handleMouseLeave = useCallback(() => setHoverPos(null), [])

  // ─── Render ────────────────────────────────────────────────

  const hasData = safeHistory.length > 0 || safePerception.length > 0 || safeAdapter.length > 0

  return (
    <div className={styles.valTimelinePanel}>
      <div className={styles.valTimelineHeader}>
        <span className={styles.valTimelineIcon}>💓</span>
        <span className={styles.valTimelineTitle}>VAL Trajectory</span>
        <span className={styles.valTimelineCount}>
          {hasData ? `${safeHistory.length} VAL pts · ${safePerception.length} perc · ${safeAdapter.length} adapter` : 'No data yet'}
        </span>
      </div>

      {!hasData ? (
        <div className={styles.valTimelineEmpty}>
          <span className={styles.valTimelineEmptyIcon}>💓</span>
          <p>Start a behavior tree to see the VAL trajectory</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={styles.valTimelineCanvas}
          style={{ width, height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  )
}
