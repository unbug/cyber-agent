/**
 * MemoriesPanel — /debug panel for browsing episodic memory.
 *
 * Displays:
 *   - Memory count stats
 *   - Forgetting curve visualization (relevance histogram)
 *   - Searchable memory list with relevance scores
 *   - Purge forgotten memories button
 */

import { useMemo, useState, useCallback } from 'react'
import type { EpisodicMemory, MemoryStats } from '@/memory/types'
import styles from './DebugPage.module.css'

// ─── Memory Detail Display ────────────────────────────────────────

interface MemoryDetailProps {
  memory: EpisodicMemory
}

function MemoryDetail({ memory }: MemoryDetailProps) {
  const ageMs = Date.now() - memory.timestamp
  const ageStr = formatDuration(ageMs)

  return (
    <div className={styles.memoryItem}>
      <div className={styles.memoryHeader}>
        <span className={styles.memoryIcon}>🧩</span>
        <span className={styles.memoryLabel}>{memory.label}</span>
        <span
          className={styles.memoryRelevance}
          style={{ color: relevanceColor(memory.relevance) }}
        >
          {(memory.relevance * 100).toFixed(0)}%
        </span>
      </div>
      <div className={styles.memoryMeta}>
        <span className={styles.memoryCategory}>[{memory.event.category}]</span>
        <span className={styles.memorySource}>{memory.event.source}</span>
        <span className={styles.memoryAge}>{ageStr}</span>
      </div>
      <div className={styles.memoryEmotion}>
        <span title={`Valence: ${memory.emotion.valence.toFixed(2)}`}>
          V:{memory.emotion.valence.toFixed(1)}
        </span>
        <span title={`Arousal: ${memory.emotion.arousal.toFixed(2)}`}>
          A:{memory.emotion.arousal.toFixed(1)}
        </span>
        <span title={`Dominance: ${memory.emotion.dominance.toFixed(2)}`}>
          D:{memory.emotion.dominance.toFixed(1)}
        </span>
      </div>
      <div className={styles.memoryTags}>
        {memory.tags.map((tag) => (
          <span key={tag} className={styles.memoryTag}>
            {tag}
          </span>
        ))}
      </div>
      <div className={styles.memoryDetails}>
        <span className={styles.memoryRecallCount}>↺ {memory.recallCount} recalls</span>
        <span className={styles.memorySalience}>S:{memory.salience.toFixed(2)}</span>
        <span className={styles.memoryId}>{memory.id.slice(0, 20)}…</span>
      </div>
    </div>
  )
}

function relevanceColor(relevance: number): string {
  if (relevance > 0.7) return '#22c55e'
  if (relevance > 0.3) return '#eab308'
  if (relevance > 0.1) return '#f97316'
  return '#ef4444'
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`
  return `${Math.round(ms / 86_400_000)}d ago`
}

// ─── Relevance Histogram ──────────────────────────────────────────

interface RelevanceHistogramProps {
  memories: EpisodicMemory[]
}

function RelevanceHistogram({ memories }: RelevanceHistogramProps) {
  const buckets = useMemo(() => {
    const b = { high: 0, mid: 0, low: 0, forgotten: 0 }
    for (const m of memories) {
      if (m.relevance > 0.7) b.high++
      else if (m.relevance > 0.3) b.mid++
      else if (m.relevance > 0.1) b.low++
      else b.forgotten++
    }
    return b
  }, [memories])

  const max = Math.max(buckets.high, buckets.mid, buckets.low, buckets.forgotten, 1)

  const bars = [
    { label: 'Strong (>70%)', count: buckets.high, color: '#22c55e', pct: buckets.high / max },
    { label: 'Active (30-70%)', count: buckets.mid, color: '#eab308', pct: buckets.mid / max },
    { label: 'Fading (10-30%)', count: buckets.low, color: '#f97316', pct: buckets.low / max },
    { label: 'Forgotten (<10%)', count: buckets.forgotten, color: '#ef4444', pct: buckets.forgotten / max },
  ]

  return (
    <div className={styles.histogram}>
      {bars.map((bar) => (
        <div key={bar.label} className={styles.histogramBar}>
          <span className={styles.histogramLabel}>{bar.label}</span>
          <div className={styles.histogramTrack}>
            <div
              className={styles.histogramFill}
              style={{
                width: `${Math.max(bar.pct * 100, bar.count > 0 ? 8 : 0)}%`,
                backgroundColor: bar.color,
              }}
            />
          </div>
          <span className={styles.histogramCount}>{bar.count}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Memories Panel ───────────────────────────────────────────────

interface MemoriesPanelProps {
  memories: EpisodicMemory[]
  stats: MemoryStats
  onPurge: () => void
  onForget: (elapsedMs: number) => void
}

export function MemoriesPanel({ memories = [], stats, onPurge, onForget }: MemoriesPanelProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'recency'>('relevance')

  const filtered = useMemo(() => {
    let result = [...memories]
    if (search.trim()) {
      const kw = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(kw) ||
          m.event.category.includes(kw) ||
          m.event.source.toLowerCase().includes(kw) ||
          m.tags.some((t) => t.toLowerCase().includes(kw)),
      )
    }
    result.sort((a, b) => {
      if (sortBy === 'recency') return b.timestamp - a.timestamp
      return b.relevance - a.relevance
    })
    return result
  }, [memories, search, sortBy])

  const handlePurge = useCallback(() => {
    if (window.confirm('Purge all forgotten memories? This cannot be undone.')) {
      onPurge()
    }
  }, [onPurge])

  const handleForget = useCallback(() => {
    const elapsed = 3_600_000 // simulate 1 hour passing
    onForget(elapsed)
    // Re-render happens via parent state update
  }, [onForget])

  if (memories.length === 0) {
    return null
  }

  return (
    <div className={styles.memoriesPanel}>
      <div className={styles.memoriesHeader}>
        <span className={styles.panelIcon}>🧠</span>
        <span className={styles.panelTitle}>Memories</span>
        <span className={styles.memoriesCount}>{stats.active} active · {stats.pruned} pruned</span>
      </div>

      {/* Stats row */}
      <div className={styles.memoriesStats}>
        <div className={styles.memoriesStat}>
          <span className={styles.memoriesStatLabel}>Avg Relevance</span>
          <span className={styles.memoriesStatValue}>{(stats.avgRelevance * 100).toFixed(1)}%</span>
        </div>
        <div className={styles.memoriesStat}>
          <span className={styles.memoriesStatLabel}>Avg Salience</span>
          <span className={styles.memoriesStatValue}>{(stats.avgSalience * 100).toFixed(1)}%</span>
        </div>
        <div className={styles.memoriesStat}>
          <span className={styles.memoriesStatLabel}>Recalled</span>
          <span className={styles.memoriesStatValue}>{stats.recalledCount}</span>
        </div>
      </div>

      {/* Forgetting curve histogram */}
      <RelevanceHistogram memories={memories} />

      {/* Search + sort */}
      <div className={styles.memoriesControls}>
        <input
          className={styles.memoriesSearch}
          type="text"
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.memoriesSort}>
          <button
            className={`${styles.memoriesSortBtn} ${sortBy === 'relevance' ? styles.memoriesSortBtnActive : ''}`}
            onClick={() => setSortBy('relevance')}
          >
            Relevance
          </button>
          <button
            className={`${styles.memoriesSortBtn} ${sortBy === 'recency' ? styles.memoriesSortBtnActive : ''}`}
            onClick={() => setSortBy('recency')}
          >
            Recency
          </button>
        </div>
      </div>

      {/* Memory list */}
      <div className={styles.memoriesList}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔍</span>
            <p>No matching memories</p>
          </div>
        )}
        {filtered.map((mem) => (
          <MemoryDetail key={mem.id} memory={mem} />
        ))}
      </div>

      {/* Actions */}
      <div className={styles.memoriesActions}>
        <button className={styles.btn} onClick={handleForget}>
          ⏳ Simulate Forgetting (1h)
        </button>
        <button
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={handlePurge}
        >
          🗑 Purge Forgotten
        </button>
      </div>
    </div>
  )
}
