/**
 * EventTimelinePanel — Unified event timeline for the CyberAgent debugger.
 *
 * Shows ALL tracer events on a single time axis, color-coded by type:
 *   tick.start     → indigo    (◆)
 *   node.enter     → blue      (→)
 *   node.exit      → green     (✓)
 *   action.dispatch→ orange    (!)
 *   bb.set         → cyan      (⚙)
 *   adapter.tx     → purple    (↑)
 *   adapter.rx     → teal      (↓)
 *   error          → red       (✗)
 *   perception     → lime      (👁)
 *   policy.*       → pink      (🧠)
 *   social.event   → amber     (👥)
 *   val.update     → violet    (💓)
 *   breakpoint     → white     (⏸)
 *
 * Features:
 * - Zoomable time window with pan controls
 * - Click any event to see full details in a side panel
 * - Filter by type, keyword, or agent ID
 * - Auto-scroll follows live events when enabled
 * - Export filtered events as JSON
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { tracer, type TracerEvent, type TracerEventType } from '@/engine/tracer'
import styles from './EventTimelinePanel.module.css'

// ─── Type metadata ──────────────────────────────────────────────

interface EventTypeMeta {
  color: string
  icon: string
  category: 'bt' | 'adapter' | 'perception' | 'policy' | 'social' | 'val' | 'system'
}

const EVENT_TYPE_META: Record<TracerEventType, EventTypeMeta> = {
  'tick.start':     { color: '#6366f1', icon: '◆', category: 'bt' },
  'node.enter':     { color: '#3b82f6', icon: '→', category: 'bt' },
  'node.exit':      { color: '#22c55e', icon: '✓', category: 'bt' },
  'action.dispatch':{ color: '#f97316', icon: '!', category: 'bt' },
  'bb.set':         { color: '#06b6d4', icon: '⚙', category: 'bt' },
  'adapter.tx':     { color: '#8b5cf6', icon: '↑', category: 'adapter' },
  'adapter.rx':     { color: '#14b8a6', icon: '↓', category: 'adapter' },
  'error':          { color: '#ef4444', icon: '✗', category: 'system' },
  'breakpoint.triggered': { color: '#f5f5f5', icon: '⏸', category: 'system' },
  'perception':     { color: '#84cc16', icon: '👁', category: 'perception' },
  'val.update':     { color: '#a855f7', icon: '💓', category: 'val' },
  'social.event':   { color: '#eab308', icon: '👥', category: 'social' },
  'policy.invoke':  { color: '#ec4899', icon: '🧠', category: 'policy' },
  'policy.success': { color: '#ec4899', icon: '✓', category: 'policy' },
  'policy.failure': { color: '#f43f5e', icon: '✗', category: 'policy' },
  'policy.low_confidence': { color: '#fb923c', icon: '?', category: 'policy' },
}

const ALL_TYPES = Object.keys(EVENT_TYPE_META) as TracerEventType[]

// ─── Category filter options ────────────────────────────────────

interface CategoryOption {
  label: string
  types: TracerEventType[]
  color: string
}

const CATEGORIES: Record<string, CategoryOption> = {
  all:       { label: 'All Events',   types: ALL_TYPES,           color: '#8b5cf6' },
  bt:        { label: 'Behavior Tree', types: ['tick.start','node.enter','node.exit','action.dispatch','bb.set'], color: '#3b82f6' },
  adapter:   { label: 'Adapter',       types: ['adapter.tx','adapter.rx'], color: '#8b5cf6' },
  perception:{ label: 'Perception',    types: ['perception'],      color: '#84cc16' },
  policy:    { label: 'Policy',        types: ['policy.invoke','policy.success','policy.failure','policy.low_confidence'], color: '#ec4899' },
  social:    { label: 'Social',        types: ['social.event'],    color: '#eab308' },
  val:       { label: 'VAL',           types: ['val.update'],      color: '#a855f7' },
  system:    { label: 'System',        types: ['error','breakpoint.triggered'], color: '#ef4444' },
}

// ─── Component state ────────────────────────────────────────────

interface TimelineState {
  zoomLevel: number      // events per visible pixel (higher = more zoomed out)
  scrollOffset: number   // horizontal scroll offset in event indices
  autoScroll: boolean    // follow live events
  selectedEventIndex: number | null
  activeCategories: Set<string>
  keywordFilter: string
  agentIdFilter: string
}

// ─── Main component ─────────────────────────────────────────────

export function EventTimelinePanel() {
  const [state, setState] = useState<TimelineState>({
    zoomLevel: 3,
    scrollOffset: 0,
    autoScroll: true,
    selectedEventIndex: null,
    activeCategories: new Set(Object.keys(CATEGORIES)),
    keywordFilter: '',
    agentIdFilter: '',
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const eventsRef = useRef<TracerEvent[]>([])
  const [events, setEvents] = useState<TracerEvent[]>([])
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 })

  // Subscribe to tracer events
  useEffect(() => {
    const unsubscribe = tracer.subscribe((event) => {
      eventsRef.current.push(event)
      // Keep ring buffer size in sync
      if (eventsRef.current.length > 1000) {
        eventsRef.current.shift()
      }
      setEvents([...eventsRef.current])
    })

    // Initial load from existing events
    const initial = tracer.snapshot()
    eventsRef.current = [...initial]
    setEvents(initial)

    return unsubscribe
  }, [])

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(400, rect.width), height: 300 })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Auto-scroll to end when new events arrive
  useEffect(() => {
    if (state.autoScroll && events.length > 0) {
      const visibleCount = Math.floor(dimensions.width / state.zoomLevel)
      setState(prev => ({
        ...prev,
        scrollOffset: Math.max(0, events.length - visibleCount),
      }))
    }
  }, [events.length, state.autoScroll, dimensions.width, state.zoomLevel])

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = events

    // Category filter
    if (state.activeCategories.size < Object.keys(CATEGORIES).length) {
      const allowedTypes = new Set(
        Array.from(state.activeCategories).flatMap(cat => CATEGORIES[cat]?.types ?? [])
      )
      result = result.filter(e => allowedTypes.has(e.type))
    }

    // Keyword filter (search label and payload)
    if (state.keywordFilter.trim()) {
      const kw = state.keywordFilter.toLowerCase()
      result = result.filter(e =>
        e.label.toLowerCase().includes(kw) ||
        JSON.stringify(e.payload ?? '').toLowerCase().includes(kw)
      )
    }

    // Agent ID filter
    if (state.agentIdFilter.trim()) {
      const aid = state.agentIdFilter.trim()
      result = result.filter(e => e.agentId === aid)
    }

    return result
  }, [events, state.activeCategories, state.keywordFilter, state.agentIdFilter])

  // Visible window of events
  const visibleCount = Math.max(10, Math.floor(dimensions.width / state.zoomLevel))
  const startIdx = Math.max(0, Math.min(state.scrollOffset, filteredEvents.length - visibleCount))
  const endIdx = Math.min(filteredEvents.length, startIdx + visibleCount)
  const visibleEvents = filteredEvents.slice(startIdx, endIdx)

  // Event click handler
  const handleEventClick = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedEventIndex: index }))
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setState(prev => ({ ...prev, zoomLevel: Math.max(1, prev.zoomLevel - 1) }))
  }, [])
  const handleZoomOut = useCallback(() => {
    setState(prev => ({ ...prev, zoomLevel: Math.min(20, prev.zoomLevel + 1) }))
  }, [])

  // Pan controls
  const handlePanLeft = useCallback(() => {
    setState(prev => ({ ...prev, scrollOffset: Math.max(0, prev.scrollOffset - visibleCount / 3) }))
  }, [visibleCount])
  const handlePanRight = useCallback(() => {
    setState(prev => ({ ...prev, scrollOffset: Math.min(filteredEvents.length - visibleCount, prev.scrollOffset + visibleCount / 3) }))
  }, [filteredEvents.length, visibleCount])

  // Export filtered events
  const handleExport = useCallback(() => {
    const json = JSON.stringify(filteredEvents.map(e => ({
      t: e.t, type: e.type, label: e.label, payload: e.payload, agentId: e.agentId,
    })), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-timeline-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filteredEvents])

  // Category toggle
  const handleCategoryToggle = useCallback((cat: string) => {
    setState(prev => {
      const next = new Set(prev.activeCategories)
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat)
      } else {
        next.add(cat)
      }
      return { ...prev, activeCategories: next }
    })
  }, [])

  // Selected event details
  const selectedEvent = state.selectedEventIndex !== null && state.selectedEventIndex >= startIdx && state.selectedEventIndex < endIdx
    ? filteredEvents[state.selectedEventIndex]
    : null

  // Time range
  const firstVisible = visibleEvents[0]
  const lastVisible = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : null
  const timeRange = firstVisible && lastVisible
    ? `${(firstVisible.t / 1000).toFixed(2)}s — ${(lastVisible.t / 1000).toFixed(2)}s`
    : 'No events'

  // Event type counts for legend
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of filteredEvents) {
      counts[e.type] = (counts[e.type] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [filteredEvents])

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarSection}>
          <span className={styles.toolbarLabel}>Categories:</span>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              className={`${styles.catBtn} ${state.activeCategories.has(key) ? styles.catBtnActive : ''}`}
              style={{ borderColor: state.activeCategories.has(key) ? cat.color : undefined }}
              onClick={() => handleCategoryToggle(key)}
              title={`Show/hide ${cat.label}`}
            >
              {cat.label} ({filteredEvents.filter(e => cat.types.includes(e.type)).length})
            </button>
          ))}
        </div>

        <div className={styles.toolbarSection}>
          <input
            type="text"
            placeholder="🔍 Keyword filter..."
            value={state.keywordFilter}
            onChange={e => setState(prev => ({ ...prev, keywordFilter: e.target.value }))}
            className={styles.searchInput}
          />
          <input
            type="text"
            placeholder="Agent ID filter..."
            value={state.agentIdFilter}
            onChange={e => setState(prev => ({ ...prev, agentIdFilter: e.target.value }))}
            className={styles.agentInput}
          />
        </div>

        <div className={styles.toolbarSection}>
          <button className={styles.ctrlBtn} onClick={handleZoomOut} title="Zoom out">−</button>
          <span className={styles.zoomLabel}>{state.zoomLevel}x</span>
          <button className={styles.ctrlBtn} onClick={handleZoomIn} title="Zoom in">+</button>
          <button className={styles.ctrlBtn} onClick={handlePanLeft} title="Scroll left">◀</button>
          <button className={styles.ctrlBtn} onClick={handlePanRight} title="Scroll right">▶</button>
          <button
            className={`${styles.ctrlBtn} ${state.autoScroll ? styles.ctrlBtnActive : ''}`}
            onClick={() => setState(prev => ({ ...prev, autoScroll: !prev.autoScroll }))}
            title={state.autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
          >
            {state.autoScroll ? '⏸ Live' : '▶ Live'}
          </button>
          <button className={styles.ctrlBtn} onClick={handleExport} title="Export filtered events">📥</button>
        </div>

        <div className={styles.toolbarSection}>
          <span className={styles.eventCount}>{filteredEvents.length} events · {timeRange}</span>
        </div>
      </div>

      {/* Timeline canvas */}
      <div ref={containerRef} className={styles.timelineContainer}>
        <svg width={dimensions.width} height={dimensions.height} className={styles.timelineSvg}>
          {/* Background grid lines at 1-second intervals */}
          {visibleEvents.length > 0 && (() => {
            const firstEvent = visibleEvents[0]
            const lastEvent = visibleEvents[visibleEvents.length - 1]
            if (!firstEvent || !lastEvent) return null
            const firstT = firstEvent.t
            const lastT = lastEvent.t
            const startSec = Math.floor(firstT / 1000)
            const endSec = Math.ceil(lastT / 1000)
            const gridLines: React.ReactNode[] = []

            for (let sec = startSec; sec <= endSec; sec++) {
              // Find the event closest to this second mark
              const targetT = sec * 1000
              const idx = visibleEvents.findIndex(e => e.t >= targetT)
              if (idx === -1 || idx < 0 || idx >= visibleEvents.length) continue
              const evtAtSec = visibleEvents[idx]
              if (!evtAtSec) continue

              const x = ((filteredEvents.indexOf(evtAtSec) - startIdx) / Math.max(1, endIdx - startIdx)) * dimensions.width
              gridLines.push(
                <line key={sec} x1={x} y1={0} x2={x} y2={dimensions.height} stroke="#333" strokeWidth="0.5" />
              )
            }
            return gridLines
          })()}

          {/* Event dots */}
          {visibleEvents.map((event, i) => {
            const globalIdx = startIdx + i
            const x = (i / Math.max(1, endIdx - startIdx)) * dimensions.width
            const meta = EVENT_TYPE_META[event.type] ?? { color: '#888', icon: '?', category: 'system' }
            const isSelected = state.selectedEventIndex === globalIdx

            return (
              <g key={globalIdx} className={styles.eventGroup}>
                <circle
                  cx={x}
                  cy={dimensions.height / 2}
                  r={isSelected ? 6 : 4}
                  fill={meta.color}
                  stroke={isSelected ? '#fff' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                  className={styles.eventDot}
                  onClick={() => handleEventClick(globalIdx)}
                />
              </g>
            )
          })}

          {/* Selected event tooltip */}
          {selectedEvent && state.selectedEventIndex !== null && (
            <foreignObject x={Math.min(
              dimensions.width - 280,
              ((state.selectedEventIndex! - startIdx) / Math.max(1, endIdx - startIdx)) * dimensions.width + 15
            )} y={dimensions.height - 160} width={270} height={150}>
              <div className={styles.eventTooltip}>
                <div className={styles.tooltipType}>{selectedEvent.type}</div>
                <div className={styles.tooltipLabel}>{selectedEvent.label}</div>
                <div className={styles.tooltipTime}>{(selectedEvent.t / 1000).toFixed(3)}s</div>
                {selectedEvent.agentId && (
                  <div className={styles.tooltipAgent}>🤖 {selectedEvent.agentId}</div>
                )}
                {selectedEvent.payload && Object.keys(selectedEvent.payload).length > 0 && (
                  <pre className={styles.tooltipPayload}>
                    {JSON.stringify(selectedEvent.payload, null, 2).slice(0, 300)}
                  </pre>
                )}
              </div>
            </foreignObject>
          )}
        </svg>
      </div>

      {/* Type legend */}
      <div className={styles.legend}>
        {typeCounts.map(([type, count]) => (
          <span key={type} className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: EVENT_TYPE_META[type as TracerEventType]?.color ?? '#888' }} />
            {EVENT_TYPE_META[type as TracerEventType]?.icon} {type} ×{count}
          </span>
        ))}
      </div>

      {/* Selected event detail panel */}
      {selectedEvent && (
        <div className={styles.detailPanel}>
          <button className={styles.closeBtn} onClick={() => setState(prev => ({ ...prev, selectedEventIndex: null }))}>✕</button>
          <h4 className={styles.detailTitle}>{selectedEvent.type}</h4>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Time:</span>
            <span>{(selectedEvent.t / 1000).toFixed(3)}s</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Label:</span>
            <span>{selectedEvent.label}</span>
          </div>
          {selectedEvent.agentId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Agent:</span>
              <span>{selectedEvent.agentId}</span>
            </div>
          )}
          {selectedEvent.payload && Object.keys(selectedEvent.payload).length > 0 && (
            <details className={styles.detailPayload}>
              <summary className={styles.detailSummary}>Payload ({Object.keys(selectedEvent.payload).length} fields)</summary>
              <pre>{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
