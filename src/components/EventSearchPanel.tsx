/**
 * EventSearchPanel — Unified event search across all tracer events.
 *
 * Provides keyword search, type filtering, and time-range filtering
 * across the full tracer event stream (breadcrumb + adapter events +
 * perception + social + policy + errors).
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { tracer, type TracerEvent, type TracerEventType } from '@/engine/tracer'
import styles from './EventSearchPanel.module.css'

// ─── Type filter presets ────────────────────────────────────────

const ALL_TYPES: TracerEventType[] = [
  'tick.start',
  'node.enter',
  'node.exit',
  'action.dispatch',
  'bb.set',
  'adapter.tx',
  'adapter.rx',
  'error',
  'breakpoint.triggered',
  'perception',
  'val.update',
  'social.event',
  'policy.invoke',
  'policy.success',
  'policy.failure',
  'policy.low_confidence',
]

const TYPE_GROUPS: Record<string, TracerEventType[]> = {
  'Core': ['tick.start', 'node.enter', 'node.exit', 'action.dispatch'],
  'State': ['bb.set'],
  'Hardware': ['adapter.tx', 'adapter.rx'],
  'AI & Perception': ['perception', 'val.update', 'policy.invoke', 'policy.success', 'policy.failure', 'policy.low_confidence'],
  'Social': ['social.event'],
  'Errors': ['error', 'breakpoint.triggered'],
}

const TYPE_COLORS: Record<TracerEventType, string> = {
  'tick.start': '#3b82f6',
  'node.enter': '#3b82f6',
  'node.exit': '#8b5cf6',
  'action.dispatch': '#f97316',
  'bb.set': '#06b6d4',
  'adapter.tx': '#22c55e',
  'adapter.rx': '#a855f7',
  'error': '#ef4444',
  'breakpoint.triggered': '#f59e0b',
  'perception': '#4ecdc4',
  'val.update': '#ec4899',
  'social.event': '#6366f1',
  'policy.invoke': '#f97316',
  'policy.success': '#22c55e',
  'policy.failure': '#ef4444',
  'policy.low_confidence': '#f59e0b',
}

const TYPE_ICONS: Record<TracerEventType, string> = {
  'tick.start': '⏱',
  'node.enter': '▶',
  'node.exit': '■',
  'action.dispatch': '!',
  'bb.set': '📝',
  'adapter.tx': '↑',
  'adapter.rx': '↓',
  'error': '⚠',
  'breakpoint.triggered': '🔒',
  'perception': '👁',
  'val.update': '💗',
  'social.event': '👥',
  'policy.invoke': '🧠',
  'policy.success': '✅',
  'policy.failure': '❌',
  'policy.low_confidence': '⚡',
}

// ─── Type filter state ──────────────────────────────────────────

interface TypeFilter {
  selected: Set<TracerEventType>
  allSelected: boolean
}

function createTypeFilter(): TypeFilter {
  return {
    selected: new Set(ALL_TYPES),
    allSelected: true,
  }
}

// ─── Main Component ─────────────────────────────────────────────

export function EventSearchPanel() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(createTypeFilter)
  const [showTypes, setShowTypes] = useState(false)
  const [liveMode, setLiveMode] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const liveSubscribedRef = useRef(false)
  const eventsArrRef = useRef<TracerEvent[]>([])

  // Live event stream subscription — only when in live mode
  useEffect(() => {
    if (!liveMode || liveSubscribedRef.current) return

    const unsub = tracer.subscribe((event: TracerEvent) => {
      eventsArrRef.current.push(event)
      // Keep only last 2000 live events
      if (eventsArrRef.current.length > 2000) {
        eventsArrRef.current.splice(0, eventsArrRef.current.length - 2000)
      }
      forceUpdate(n => n + 1)
    })

    // Also capture any events that were emitted before subscription
    const snapshot = tracer.snapshot()
    if (snapshot.length > 0) {
      eventsArrRef.current.push(...snapshot)
      if (eventsArrRef.current.length > 2000) {
        eventsArrRef.current.splice(0, eventsArrRef.current.length - 2000)
      }
      forceUpdate(n => n + 1)
    }

    liveSubscribedRef.current = true

    return () => {
      unsub()
      liveSubscribedRef.current = false
    }
  }, [liveMode])

  const [, forceUpdate] = useState(0)

  // Build combined event list from live mode or snapshot
  const allEvents = useMemo(() => {
    if (liveMode) {
      return eventsArrRef.current.slice(-2000)
    }
    return tracer.snapshot().slice(-2000)
  }, [liveMode, forceUpdate])

  // Filter and search
  const results = useMemo(() => {
    let filtered = allEvents

    // Type filter
    if (!typeFilter.allSelected) {
      filtered = filtered.filter(e => typeFilter.selected.has(e.type))
    }

    // Keyword search (case-insensitive, matches label + payload)
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      filtered = filtered.filter(e => {
        // Match against label
        if (e.label.toLowerCase().includes(q)) return true
        // Match against payload values
        if (e.payload) {
          for (const val of Object.values(e.payload)) {
            if (typeof val === 'string' && val.toLowerCase().includes(q)) return true
            if (typeof val === 'number') {
              if (String(val).toLowerCase().includes(q)) return true
            }
            if (Array.isArray(val)) {
              for (const item of val) {
                if (typeof item === 'string' && item.toLowerCase().includes(q)) return true
              }
            }
          }
        }
        // Match against agentId
        if (e.agentId?.toLowerCase().includes(q)) return true
        return false
      })
    }

    return filtered.slice(-200)
  }, [allEvents, query, typeFilter])

  // Event counts by type for the summary bar
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of allEvents) {
      counts[e.type] = (counts[e.type] ?? 0) + 1
    }
    return counts
  }, [allEvents])

  // Toggle a single type filter
  const toggleType = useCallback((type: TracerEventType) => {
    setTypeFilter(prev => {
      const next = new Set(prev.selected)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return {
        selected: next,
        allSelected: next.size === ALL_TYPES.length,
      }
    })
  }, [])

  // Toggle "select all" / "deselect all"
  const toggleAllTypes = useCallback(() => {
    setTypeFilter({
      selected: new Set(ALL_TYPES),
      allSelected: true,
    })
  }, [])

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setTypeFilter(createTypeFilter())
  }, [])

  // Format timestamp relative to first event
  const formatTime = useCallback((t: number) => {
    if (allEvents.length === 0) return '0.00s'
    const delta = t - allEvents[0]!.t
    return `${(delta / 1000).toFixed(2)}s`
  }, [allEvents])

  // Format payload for display
  const formatPayload = useCallback((payload: Record<string, unknown> | undefined): string => {
    if (!payload) return ''
    const entries = Object.entries(payload)
      .filter(([k]) => k !== 'confidence' && k !== 'source') // hide common fields already shown elsewhere
      .slice(0, 3)
    if (entries.length === 0) return ''
    return entries.map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v).slice(0, 40)
      return `${k}=${val}`
    }).join(' ')
  }, [])

  // Highlight matching text in a string
  const highlightMatch = useCallback((text: string): React.ReactNode => {
    if (!query.trim()) return text
    const q = query.toLowerCase().trim()
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text

    // Simple highlighting: wrap match in <mark> tags
    const before = text.slice(0, idx)
    const match = text.slice(idx, idx + q.length)
    const after = text.slice(idx + q.length)
    return (
      <>
        {before}
        <mark className={styles.mark}>{match}</mark>
        {after}
      </>
    )
  }, [query])

  // Export results as JSON
  const handleExport = useCallback(() => {
    const json = JSON.stringify(results.map(e => ({
      t: e.t,
      type: e.type,
      label: e.label,
      payload: e.payload,
      agentId: e.agentId,
    })), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-search-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  // Keyboard shortcuts: / to focus search, Esc to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when user is already in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        handleClear()
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClear])

  return (
    <div className={styles.panel}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <input
          ref={searchInputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search events by keyword, label, or payload value... (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className={styles.clearBtn} onClick={handleClear}>✕</button>
        )}

        {/* Type filter toggle */}
        <div className={styles.typeFilterWrap}>
          <button
            className={`${styles.filterBtn} ${showTypes ? styles.filterBtnOpen : ''}`}
            onClick={() => setShowTypes(!showTypes)}
          >
            {typeFilter.allSelected ? 'All Types' : `${typeFilter.selected.size}/${ALL_TYPES.length}`}
          </button>

          {/* Type filter dropdown */}
          {showTypes && (
            <div className={styles.typeDropdown}>
              <div className={styles.typeGroupHeader}>
                <span>Type Filters</span>
                <button className={styles.selectAllBtn} onClick={toggleAllTypes}>
                  Select All
                </button>
              </div>

              {Object.entries(TYPE_GROUPS).map(([groupName, types]) => (
                <div key={groupName} className={styles.typeGroup}>
                  <span className={styles.typeGroupName}>{groupName}</span>
                  <div className={styles.typeCheckboxes}>
                    {types.map(type => (
                      <label
                        key={type}
                        className={`${styles.typeCheckbox} ${
                          typeFilter.selected.has(type) ? styles.typeChecked : ''
                        }`}
                        style={{ borderLeftColor: TYPE_COLORS[type] }}
                      >
                        <input
                          type="checkbox"
                          checked={typeFilter.selected.has(type)}
                          onChange={() => toggleType(type)}
                        />
                        <span className={styles.typeIcon}>{TYPE_ICONS[type]}</span>
                        <span className={styles.typeLabel}>{type}</span>
                        {typeCounts[type] !== undefined && (
                          <span className={styles.typeCount}>×{typeCounts[type]}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live mode toggle */}
        <button
          className={`${styles.liveBtn} ${liveMode ? styles.liveActive : ''}`}
          onClick={() => setLiveMode(!liveMode)}
        >
          {liveMode ? '● Live' : '○ Snapshot'}
        </button>

        {/* Export button */}
        <button className={styles.exportBtn} onClick={handleExport}>
          📥 Export
        </button>
      </div>

      {/* Summary bar */}
      <div className={styles.summaryBar}>
        <span className={styles.resultCount}>
          {results.length} event{results.length !== 1 ? 's' : ''} found
          {query && ` for "${highlightMatch(query)}"`}
        </span>

        {/* Type distribution mini-bar */}
        <div className={styles.typeDistribution}>
          {Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([type, count]) => (
              <span
                key={type}
                className={styles.distBar}
                style={{
                  width: `${Math.max(2, (count / Math.max(...Object.values(typeCounts))) * 100)}%`,
                  backgroundColor: TYPE_COLORS[type as TracerEventType] ?? '#888',
                }}
                title={`${type}: ${count}`}
              />
            ))}
        </div>

        {/* Total events */}
        <span className={styles.totalEvents}>
          {allEvents.length.toLocaleString()} total events in view
        </span>
      </div>

      {/* Results list */}
      <div className={styles.resultsList}>
        {results.length === 0 ? (
          <div className={styles.emptyResult}>
            <span className={styles.emptyIcon}>🔍</span>
            <p>No events match your search criteria.</p>
            <p className={styles.hint}>Try a different keyword or adjust the type filters.</p>
          </div>
        ) : (
          results.map((evt, i) => {
            const color = TYPE_COLORS[evt.type] ?? '#888'
            return (
              <div
                key={i}
                className={styles.resultItem}
                style={{ borderLeftColor: color }}
              >
                <span className={styles.resultTime}>{formatTime(evt.t)}</span>
                <span
                  className={styles.resultType}
                  style={{ color }}
                >
                  {TYPE_ICONS[evt.type] ?? '·'} {evt.type}
                </span>
                <span className={styles.resultLabel}>
                  {highlightMatch(evt.label)}
                </span>
                {evt.payload && (
                  <span className={styles.resultPayload}>
                    {formatPayload(evt.payload)}
                  </span>
                )}
                {evt.agentId && (
                  <span className={styles.resultAgentId}>[{evt.agentId}]</span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <div className={styles.hints}>
        <span>Press <kbd>/</kbd> to focus search · <kbd>Esc</kbd> to clear</span>
      </div>
    </div>
  )
}
