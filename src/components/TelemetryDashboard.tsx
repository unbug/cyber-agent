/**
 * TelemetryDashboard — Real-time visualization of behavior tree telemetry.
 *
 * Displays:
 * - Emotion sparkline (color-coded by emotion type)
 * - Energy bar with gradient
 * - Position heatmap (mini canvas trail)
 * - TPS trend sparkline
 */

import { useRef, useEffect, useCallback } from 'react'
import type { TelemetryData } from '@/hooks/useTelemetry'
import styles from './TelemetryDashboard.module.css'

// Emotion colors for sparkline
const EMOTION_COLORS: Record<string, string> = {
  happy: '#22c55e',
  excited: '#eab308',
  calm: '#3b82f6',
  neutral: '#6b7280',
  angry: '#ef4444',
  sad: '#8b5cf6',
  fearful: '#f97316',
}

function getEmotionColor(emotion: string): string {
  const key = emotion.toLowerCase()
  const found = EMOTION_COLORS[key as keyof typeof EMOTION_COLORS]
  return (found ?? EMOTION_COLORS.neutral) as string
}

function getEmotionIcon(emotion: string): string {
  const map: Record<string, string> = {
    happy: '😊',
    excited: '🤩',
    calm: '😌',
    neutral: '😐',
    angry: '😠',
    sad: '😢',
    fearful: '😨',
  }
  return map[emotion.toLowerCase()] ?? '😐'
}

// ─── Sparkline chart component ─────────────────────────────────

interface SparklineProps {
  data: number[]
  color: string
  height?: number
  filled?: boolean
  label: string
}

function Sparkline({ data, color, height = 40, filled = true, label }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const step = w / (data.length - 1)

    // Fill
    if (filled) {
      ctx.beginPath()
      ctx.moveTo(0, h)
      data.forEach((v, i) => {
        const x = i * step
        const y = h - ((v - min) / range) * (h - 4) - 2
        if (i === 0) ctx.lineTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fillStyle = color + '22'
      ctx.fill()
    }

    // Line
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    // End dot
    const lastVal = data[data.length - 1]
    if (lastVal === undefined) return
    const lastX = (data.length - 1) * step
    const lastY = h - ((lastVal - min) / range) * (h - 4) - 2
    ctx.beginPath()
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }, [data, color, height, filled])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(draw)
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [draw])

  return (
    <div className={styles.sparkline}>
      <span className={styles.label}>{label}</span>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}

// ─── Energy bar component ──────────────────────────────────────

interface EnergyBarProps {
  value: number
  label: string
}

function EnergyBar({ value, label }: EnergyBarProps) {
  const pct = Math.round(value * 100)
  const color = pct > 60 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444'

  return (
    <div className={styles.energyBar}>
      <span className={styles.label}>{label}</span>
      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className={styles.value}>{pct}%</span>
    </div>
  )
}

// ─── Position heatmap ─────────────────────────────────────────

interface PositionHeatmapProps {
  data: { x: number; y: number }[]
  label: string
  width?: number
  height?: number
}

function PositionHeatmap({ data, label, width = 160, height = 120 }: PositionHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 0.5
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }

    // Trail with fading
    const recent = data.slice(-60)
    recent.forEach((point, i) => {
      const alpha = (i / recent.length) * 0.8
      const size = 2 + (i / recent.length) * 3
      ctx.beginPath()
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`
      ctx.fill()
    })

    // Connection line
    ctx.beginPath()
    recent.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Current position dot
    const last = recent[recent.length - 1]
    if (!last) return
    ctx.beginPath()
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#818cf8'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(last.x, last.y, 8, 0, Math.PI * 2)
    ctx.strokeStyle = '#818cf844'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [data, width, height])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(draw)
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [draw])

  return (
    <div className={styles.heatmap}>
      <span className={styles.label}>{label}</span>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}

// ─── Main dashboard ────────────────────────────────────────────

interface TelemetryDashboardProps {
  data: TelemetryData | null
}

export function TelemetryDashboard({ data }: TelemetryDashboardProps) {
  if (!data || data.history.length === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📡</span>
          <p>Start the behavior tree to see telemetry</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      {/* Emotion section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🧠</span>
          <h3 className={styles.sectionTitle}>Emotion</h3>
          <span
            className={styles.emotionBadge}
            style={{ color: getEmotionColor(data.currentEmotion) }}
          >
            {getEmotionIcon(data.currentEmotion)} {data.currentEmotion}
          </span>
        </div>
        <Sparkline
          data={data.emotionHistory.map((e) => {
            const colors: Record<string, number> = {
              happy: 100, excited: 90, calm: 60, neutral: 50,
              angry: 80, sad: 30, fearful: 70,
            }
            return colors[e.emotion.toLowerCase()] ?? 50
          })}
          color={getEmotionColor(data.currentEmotion)}
          label=""
          filled
        />
      </div>

      {/* Energy section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>⚡</span>
          <h3 className={styles.sectionTitle}>Energy</h3>
          <span className={styles.value}>{Math.round(data.currentEnergy * 100)}%</span>
        </div>
        <EnergyBar value={data.currentEnergy} label="" />
      </div>

      {/* Excitement section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>💫</span>
          <h3 className={styles.sectionTitle}>Excitement</h3>
          <span className={styles.value}>{Math.round(data.currentExcitement * 100)}%</span>
        </div>
        <Sparkline
          data={data.energyHistory.map((e) => e.energy * 100)}
          color="#f59e0b"
          label=""
          filled
        />
      </div>

      {/* Position section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>📍</span>
          <h3 className={styles.sectionTitle}>Position</h3>
          <span className={styles.value}>
            {Math.round(data.currentX)}, {Math.round(data.currentY)}
          </span>
        </div>
        <PositionHeatmap
          data={data.positionHistory.map((p) => ({ x: p.x, y: p.y }))}
          label=""
          width={160}
          height={120}
        />
      </div>

      {/* TPS section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>📊</span>
          <h3 className={styles.sectionTitle}>Performance</h3>
          <span className={styles.value}>{data.currentTPS} tps</span>
        </div>
        <div className={styles.tpsStats}>
          <span>Min: {data.minTPS}</span>
          <span>Avg: {data.avgTPS}</span>
          <span>Max: {data.maxTPS}</span>
        </div>
        <Sparkline
          data={data.tpsHistory.map((t) => t.tps)}
          color={data.currentTPS >= 55 ? '#22c55e' : data.currentTPS >= 30 ? '#eab308' : '#ef4444'}
          label=""
          filled
        />
      </div>
    </div>
  )
}
