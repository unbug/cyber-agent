/**
 * EventTimelineScrubber — Visual timeline for the trace scrubber.
 *
 * Renders events as colored bars on a time axis with:
 * - Zoom via mouse wheel (pinch-to-zoom on trackpad)
 * - Pan via click-and-drag
 * - Click to seek to event position
 * - Event type legend with counts
 * - Current playback position indicator
 * - Auto-scroll during playback
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { TracerEvent } from '@/engine/tracer'
import styles from './EventTimelineScrubber.module.css'

// ─── Event Type Colors (matches EventTimelinePanel) ──────────────

const EVENT_COLORS: Record<string, string> = {
  // BT execution
  'tick.start': '#3b82f6',       // blue
  'node.enter': '#10b981',       // green
  'node.exit': '#059669',        // dark green
  // Adapter
  'adapter.tx': '#a855f7',       // purple
  'adapter.rx': '#14b8a6',       // teal
  // Perception
  'perception': '#84cc16',       // lime
  // Policy
  'policy.invoke': '#ec4899',    // pink
  'policy.success': '#f472b6',   // light pink
  'policy.failure': '#ef4444',   // red
  // Social
  'social.event': '#f59e0b',     // amber
  // VAL
  'val.update': '#8b5cf6',       // violet
  // System / other
  'action.dispatch': '#6366f1',  // indigo
  'bb.set': '#0ea5e9',           // sky blue
  'error': '#dc2626',            // bright red
  'wait.start': '#64748b',       // slate
}

function getEventType(event: TracerEvent): string {
  const color = EVENT_COLORS[event.type]
  if (color) return color
  const base: string = (event.type.split('.')[0] as string) || ''
  if (!base || !(base in EVENT_COLORS)) return '#94a3b8'
  return EVENT_COLORS[base as keyof typeof EVENT_COLORS]!
}

// ─── Props ──────────────────────────────────────────────────────

interface EventTimelineScrubberProps {
  events: TracerEvent[]
  currentIndex: number
  onSeek: (index: number) => void
  isPlaying: boolean
  eventCount?: number // total visible count for legend
}

// ─── Component ──────────────────────────────────────────────────

export function EventTimelineScrubber({
  events,
  currentIndex,
  onSeek,
  isPlaying,
}: EventTimelineScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)

  // Pan state
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)


  // Zoom state (events per visible pixel row, higher = more zoomed in)
  const [zoomLevel, setZoomLevel] = useState(1) // 0.5x to 4x

  // Visible range
  const visibleStart = useMemo(() => {
    return Math.max(0, currentIndex - Math.floor(events.length / (2 * zoomLevel)))
  }, [currentIndex, events.length, zoomLevel])

  const visibleEnd = useMemo(() => {
    return Math.min(events.length, visibleStart + Math.ceil(events.length / zoomLevel))
  }, [visibleStart, events.length, zoomLevel])

  // ─── Canvas Drawing ────────────────────────────────────────

  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    // Clear
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    if (events.length === 0) {
      ctx.fillStyle = '#64748b'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('No events loaded', width / 2, height / 2)
      return
    }

    const visibleCount = visibleEnd - visibleStart
    if (visibleCount <= 0) return

    const barWidth = Math.max(1, (width - 40) / visibleCount) // 20px padding each side
    const barGap = Math.max(0, barWidth - 1)
    const barHeight = height - 30

    // Draw event bars
    for (let i = 0; i < visibleCount; i++) {
      const globalIndex = visibleStart + i
      if (globalIndex >= events.length) break

      const evt = events[globalIndex]
      if (!evt) continue
      const color = getEventType(evt)
      const x = 20 + i * barWidth

      // Bar
      ctx.fillStyle = color + 'cc'
      ctx.fillRect(x, 15, Math.max(1, barGap), barHeight - 5)

      // Highlight current position
      if (globalIndex === currentIndex) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.strokeRect(x - 1, 14, Math.max(3, barGap + 2), barHeight - 3)

        // Glow effect
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = 8
        ctx.fillStyle = color
        ctx.fillRect(x, 15, Math.max(1, barGap), barHeight - 5)
        ctx.shadowBlur = 0
      }
    }

    // Draw playback position line
    if (isPlaying && currentIndex >= visibleStart && currentIndex < visibleEnd) {
      const playX = 20 + (currentIndex - visibleStart) * barWidth + barWidth / 2
      ctx.strokeStyle = '#ffffff88'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(playX, 0)
      ctx.lineTo(playX, height)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw axis labels (every Nth event)
    const labelInterval = Math.max(1, Math.floor(visibleCount / 12))
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'

    for (let i = 0; i < visibleCount; i += labelInterval) {
      const globalIndex = visibleStart + i
      if (globalIndex >= events.length) break
      const x = 20 + i * barWidth + barWidth / 2
      ctx.fillText(String(globalIndex + 1), x, height - 5)
    }

    // Draw type legend at top
    drawLegend(ctx, width, events.slice(visibleStart, visibleEnd))
  }, [events, currentIndex, visibleStart, visibleEnd, isPlaying, zoomLevel])

  // ─── Legend Drawing ────────────────────────────────────────

  function drawLegend(ctx: CanvasRenderingContext2D, width: number, visibleEvents: TracerEvent[]) {
    const typeCounts = new Map<string, number>()
    for (const evt of visibleEvents) {
      const parts = evt.type.split('.')
      const base = parts[0] ?? ''
      const key: string = evt.type in EVENT_COLORS
        ? evt.type
        : (base && base in EVENT_COLORS ? base : '#94a3b8')
      typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1)
    }

    if (typeCounts.size === 0) return

    const entries = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])
    const legendY = 4
    let legendX = width - 20

    // Right-align legend
    ctx.font = '9px system-ui'
    for (const [color, count] of entries.slice(-6)) {
      const textWidth = ctx.measureText(`${count}`).width + 12
      legendX -= textWidth
      ctx.fillStyle = color
      ctx.fillRect(legendX, legendY, 8, 8)
      ctx.fillStyle = '#e2e8f0'
      ctx.textAlign = 'left'
      ctx.fillText(String(count), legendX + 10, legendY + 7)
    }
  }

  // ─── Redraw on changes ─────────────────────────────────────

  useEffect(() => {
    drawTimeline()
  }, [drawTimeline])

  // ─── Auto-scroll during playback ──────────────────────────

  useEffect(() => {
    if (!isPlaying) return

    const scrollToCurrent = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const visibleCount = visibleEnd - visibleStart
      const barWidth = Math.max(1, (rect.width - 40) / visibleCount)
      const currentX = 20 + (currentIndex - visibleStart) * barWidth

      // Keep current position in the middle third of viewport
      if (currentX < rect.width * 0.3 || currentX > rect.width * 0.7) {
        // Adjust zoom to keep current event visible
        setZoomLevel(prev => Math.min(4, prev + 0.1))
      }
    }

    animFrameRef.current = requestAnimationFrame(scrollToCurrent)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [currentIndex, isPlaying, visibleStart, visibleEnd])

  // ─── Mouse Interaction ─────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const dx = e.clientX - dragStartX.current
    const rect = canvas.getBoundingClientRect()
    const visibleCount = visibleEnd - visibleStart
    const barWidth = Math.max(1, (rect.width - 40) / visibleCount)

    // Convert pixel delta to event index delta
    const eventDelta = Math.round(-dx / barWidth)
    const newCurrentIndex = Math.max(-1, Math.min(events.length - 1, currentIndex + eventDelta))

    dragStartX.current = e.clientX
    onSeek(newCurrentIndex)
  }, [isDragging, visibleStart, visibleEnd, events.length, currentIndex, onSeek])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return // Don't seek after drag

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const visibleCount = visibleEnd - visibleStart
    const barWidth = Math.max(1, (rect.width - 40) / visibleCount)

    // Convert click position to event index
    const clickedIndex = visibleStart + Math.floor((x - 20) / barWidth)
    if (clickedIndex >= 0 && clickedIndex < events.length) {
      onSeek(clickedIndex)
    }
  }, [isDragging, visibleStart, visibleEnd, events.length, onSeek])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    // Zoom in/out based on scroll direction
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setZoomLevel(prev => Math.max(0.3, Math.min(4, prev + delta)))
  }, [])

  return (
    <div ref={containerRef} className={styles.timelineContainer}>
      <canvas
        ref={canvasRef}
        className={styles.timelineCanvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      <div className={styles.timelineHint}>
        Scroll to zoom · Drag to seek · Click to jump
      </div>
    </div>
  )
}
