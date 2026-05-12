/**
 * SocialEventsPanel — displays multi-agent social events
 * (greet, flee, follow, signal, broadcast, mirror, roleSwap, negotiate)
 * from the tracer event stream.
 */

import { useMemo } from 'react'
import type { TracerEvent } from '@/engine/tracer'
import styles from './DebugPage.module.css'

// ─── Types ───────────────────────────────────────────────────────

export interface SocialEvent {
  type: string
  source: string
  target?: string
  payload: Record<string, unknown>
  timestamp: number
}

// ─── UI ──────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  greet: '🤝',
  flee: '💨',
  follow: '👣',
  signal: '📡',
  broadcast: '📢',
  mirror: '🪞',
  roleSwap: '🔄',
  negotiate: '🤔',
  emotion: '❤️',
}

const EVENT_COLORS: Record<string, string> = {
  greet: '#4ecdc4',
  flee: '#ff6b6b',
  follow: '#45b7d1',
  signal: '#f9ca24',
  broadcast: '#f0932b',
  mirror: '#a29bfe',
  roleSwap: '#fd79a8',
  negotiate: '#6c5ce7',
  emotion: '#e84393',
}

function formatTime(t: number): string {
  return `${(t / 1000).toFixed(2)}s`
}

export function SocialEventsPanel({ events }: { events: TracerEvent[] }) {
  const socialEvents = useMemo(
    () => events.filter((e) => e.type === 'social.event'),
    [events],
  )

  const recent = useMemo(
    () => socialEvents.slice(-50),
    [socialEvents],
  )

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const evt of socialEvents) {
      counts[evt.label] = (counts[evt.label] ?? 0) + 1
    }
    return counts
  }, [socialEvents])

  if (socialEvents.length === 0) {
    return null
  }

  return (
    <div className={styles.socialPanel}>
      <div className={styles.socialHeader}>
        <span className={styles.panelIcon}>👥</span>
        <span className={styles.panelTitle}>Social Events</span>
        <span className={styles.socialCount}>{socialEvents.length} events</span>
      </div>

      {/* Type summary */}
      <div className={styles.socialTypes}>
        {Object.entries(typeCounts).map(([type, count]) => (
          <span
            key={type}
            className={styles.socialTypeBadge}
            style={{
              backgroundColor: (EVENT_COLORS[type] ?? '#888') + '33',
              color: EVENT_COLORS[type] ?? '#888',
            }}
          >
            {EVENT_ICONS[type] ?? '·'} {type} ×{count}
          </span>
        ))}
      </div>

      {/* Recent events */}
      <div className={styles.socialList}>
        {recent.map((evt, i) => {
          const type = evt.label
          const color = EVENT_COLORS[type] ?? '#888'
          const icon = EVENT_ICONS[type] ?? '·'
          const source = String(evt.payload?.source ?? '?')
          const target = evt.payload?.target ? String(evt.payload.target) : undefined

          return (
            <div
              key={i}
              className={styles.socialEvent}
              style={{ borderLeftColor: color }}
            >
              <span className={styles.socialTime}>{formatTime(evt.t)}</span>
              <span className={styles.socialIcon}>{icon}</span>
              <span className={styles.socialType}>{type}</span>
              <span className={styles.socialSource}>[{source}]</span>
              {target && (
                <span className={styles.socialTarget}>→ [{target}]</span>
              )}
              {evt.payload && Object.keys(evt.payload).length > 2 && (
                <span className={styles.socialPayload}>
                  {JSON.stringify(evt.payload).slice(0, 60)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
