/**
 * MultiAgentTimelinePanel — N-track timeline for multi-agent debugging.
 *
 * Renders parallel timeline tracks, one per agent, with:
 *   - BT events (node.enter/exit, action.dispatch) as colored markers
 *   - Adapter tx/rx events as TX/RX badges
 *   - Shared time axis with hover crosshair
 *   - Per-agent tick rate and event count
 *
 * Each track is independently scrollable but shares the time axis.
 */

import { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import type { AgentDebugState } from '@/hooks/useMultiAgentDebug'

interface MultiAgentTimelinePanelProps {
  agents: AgentDebugState[]
  /** Shared time range (ms) for the visible window */
  timeWindowMs?: number
  /** Current hover time (ms) for crosshair */
  hoverTime?: number | null
  /** Callback for hover time changes */
  onHoverTimeChange?: (time: number | null) => void
}

// Event type colors
const EVENT_COLORS: Record<string, string> = {
  'tick.start': '#6366f1',
  'node.enter': '#3b82f6',
  'node.exit': '#8b5cf6',
  'action.dispatch': '#f97316',
  'bb.set': '#22c55e',
  'adapter.tx': '#3b82f6',
  'adapter.rx': '#22c55e',
  'error': '#ef4444',
  'social.event': '#ec4899',
  'perception': '#06b6d4',
  'val.update': '#a855f7',
}

const AGENT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function MultiAgentTimelinePanel({
  agents,
  timeWindowMs = 30000,
  hoverTime: externalHoverTime,
  onHoverTimeChange,
}: MultiAgentTimelinePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  const currentHoverTime = externalHoverTime ?? hoverTime

  // Get the latest timestamp for time axis
  const maxTime = useMemo(() => {
    let max = 0
    for (const agent of agents) {
      const lastEvent = agent.btEvents[agent.btEvents.length - 1]
      if (lastEvent && lastEvent.t > max) max = lastEvent.t
      const lastRx = agent.rxEvents[agent.rxEvents.length - 1]
      if (lastRx && lastRx.t > max) max = lastRx.t
    }
    return max
  }, [agents])

  // Visible time range
  const visibleStart = maxTime - scrollOffset - timeWindowMs
  const visibleEnd = maxTime - scrollOffset

  // Filter events to visible range (computed inline)
  const getVisibleEvents = useCallback((agent: AgentDebugState) => ({
    btEvents: agent.btEvents.filter(e => e.t >= visibleStart && e.t <= visibleEnd),
    txEvents: agent.txEvents.filter(e => e.t >= visibleStart && e.t <= visibleEnd),
    rxEvents: agent.rxEvents.filter(e => e.t >= visibleStart && e.t <= visibleEnd),
  }), [visibleStart, visibleEnd])

  // Draw timeline on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = (agents.length * 60 + 40) * dpr
    canvas.style.height = `${agents.length * 60 + 40}px`
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = agents.length * 60 + 40
    const trackHeight = 60
    const labelWidth = 80
    const contentWidth = width - labelWidth

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Time axis header
    ctx.fillStyle = 'var(--text-tertiary, #6b7280)'
    ctx.font = '10px monospace'
    for (let i = 0; i <= 10; i++) {
      const t = visibleStart + (visibleEnd - visibleStart) * (i / 10)
      const x = labelWidth + (i / 10) * contentWidth
      const label = `${((t - visibleStart) / 1000).toFixed(1)}s`
      ctx.fillText(label, x + 2, 14)

      // Grid line
      ctx.strokeStyle = 'var(--border, #2d2d44)'
      ctx.beginPath()
      ctx.moveTo(x, 20)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw each agent's track
    agents.forEach((agent, idx) => {
      const trackY = 25 + idx * trackHeight
      const color = AGENT_COLORS[idx % AGENT_COLORS.length] ?? '#3b82f6'

      // Track background
      ctx.fillStyle = `${color}08`
      ctx.fillRect(labelWidth, trackY, contentWidth, trackHeight)

      // Track border
      ctx.strokeStyle = `${color}33`
      ctx.lineWidth = 1
      ctx.strokeRect(labelWidth, trackY, contentWidth, trackHeight)

      // Agent label
      ctx.fillStyle = color
      ctx.font = 'bold 11px monospace'
      ctx.fillText(`agent-${agent.agentId.slice(-4)}`, labelWidth + 8, trackY + 16)

      // Tick rate badge
      ctx.fillStyle = '#6b7280'
      ctx.font = '9px monospace'
      ctx.fillText(`${agent.tickRate.toFixed(1)}Hz`, labelWidth + 8, trackY + 28)

      // Event count badge
      ctx.fillText(`${agent.eventCount} evt`, labelWidth + 8, trackY + 40)

      // Draw BT events as vertical markers
      const eventHeight = trackHeight - 10
      const eventY = trackY + (trackHeight - eventHeight) / 2 + 5
      const vis = getVisibleEvents(agent)
      for (const evt of vis.btEvents) {
        const x = labelWidth + ((evt.t - visibleStart) / (visibleEnd - visibleStart)) * contentWidth
        if (x < labelWidth || x > width) continue

        ctx.fillStyle = EVENT_COLORS[evt.type] ?? '#8b5cf6'
        ctx.globalAlpha = 0.7
        ctx.fillRect(x - 1, eventY, 2, eventHeight)
        ctx.globalAlpha = 1
      }

      // Draw TX events as green dots
      for (const evt of vis.txEvents) {
        const x = labelWidth + ((evt.t - visibleStart) / (visibleEnd - visibleStart)) * contentWidth
        if (x < labelWidth || x > width) continue
        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.arc(x, eventY + eventHeight / 2, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw RX events as blue dots
      for (const evt of vis.rxEvents) {
        const x = labelWidth + ((evt.t - visibleStart) / (visibleEnd - visibleStart)) * contentWidth
        if (x < labelWidth || x > width) continue
        ctx.fillStyle = '#3b82f6'
        ctx.beginPath()
        ctx.arc(x, eventY + eventHeight / 2, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw hover crosshair
    if (currentHoverTime !== null && currentHoverTime >= visibleStart && currentHoverTime <= visibleEnd) {
      const x = labelWidth + ((currentHoverTime - visibleStart) / (visibleEnd - visibleStart)) * contentWidth
      ctx.strokeStyle = '#ffffff88'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [visibleStart, visibleEnd, agents, currentHoverTime])

  // Mouse handler for hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left - 80 // offset for label
    const contentWidth = rect.width - 80
    const ratio = Math.max(0, Math.min(1, x / contentWidth))
    const time = visibleStart + (visibleEnd - visibleStart) * ratio

    setHoverTime(time)
    onHoverTimeChange?.(time)
  }, [visibleStart, visibleEnd, onHoverTimeChange])

  // Scroll handler
  const handleScroll = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    setScrollOffset(prev => {
      const delta = e.deltaY * 100
      const maxOffset = maxTime - timeWindowMs
      return Math.max(0, Math.min(maxOffset, prev + delta))
    })
  }, [maxTime, timeWindowMs])

  if (agents.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-3)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        minHeight: '200px',
      }}>
        <span style={{ fontSize: '2rem', opacity: 0.5 }}>📊</span>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          No agents yet. Add agents in the playground to see their timeline.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="multi-agent-timeline"
      style={{
        padding: 'var(--space-3)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'auto',
        cursor: 'crosshair',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoverTime(null)
        onHoverTimeChange?.(null)
      }}
      onWheel={handleScroll}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-2)',
      }}>
        <span style={{ fontSize: '1rem' }}>📊</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Multi-Agent Timeline
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          {agents.length} agent{agents.length > 1 ? 's' : ''} · {timeWindowMs / 1000}s window · scroll to navigate
        </span>
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
      <div style={{
        display: 'flex',
        gap: 'var(--space-3)',
        marginTop: 'var(--space-2)',
        fontSize: '0.65rem',
        color: 'var(--text-tertiary)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} />
          BT events
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          TX
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
          RX
        </span>
        {currentHoverTime !== null && (
          <span style={{ marginLeft: 'auto', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            t={((currentHoverTime - visibleStart) / 1000).toFixed(2)}s
          </span>
        )}
      </div>
    </div>
  )
}
