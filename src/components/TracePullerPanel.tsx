/**
 * TracePullerPanel — Connect to a real device over WebSocket and
 * pull trace events for live /debug viewing.
 *
 * Provides:
 * - URL input for the device WebSocket endpoint
 * - Start/stop pull controls
 * - Live event count + buffer indicator
 * - Export to .cybertrace file
 * - Load pulled trace directly into the /debug scrubber
 */

import { useState, useCallback, useEffect } from 'react'
import { tracePuller, type TracePullSession } from '@/engine/trace-puller'
import styles from '../pages/DebugPage.module.css'

// ─── Component ──────────────────────────────────────────

interface TracePullerPanelProps {
  onEventCountChange?: (count: number) => void
  /** Called when user clicks "Load into Scrubber" — injects buffered events */
  onLoadScrubber?: (events: { header: Record<string, unknown>; events: unknown[] }) => void
}

export function TracePullerPanel({ onEventCountChange, onLoadScrubber }: TracePullerPanelProps) {
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('')
  const [character, setCharacter] = useState('')
  const [tickRate, setTickRate] = useState(30)
  const [sessions, setSessions] = useState<TracePullSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = tracePuller.subscribe(() => {
      setSessions(tracePuller.getSessions())
      // Find active session by property, not array index
      const active = tracePuller.getSessions().find(s => s.active)
      if (active) {
        // Find the session ID that matches this active session
        const all = tracePuller.getSessions()
        for (const s of all) {
          if (s === active) {
            setActiveSessionId(s.url)
            break
          }
        }
      } else {
        setActiveSessionId(null)
      }
    })
    setSessions(tracePuller.getSessions())
    return unsubscribe
  }, [])

  // Notify parent of event count changes
  useEffect(() => {
    const active = sessions.find(s => s.active)
    if (onEventCountChange) {
      onEventCountChange(active?.eventCount ?? 0)
    }
  }, [sessions, onEventCountChange])

  const handleStart = useCallback(() => {
    if (!url.trim()) return
    const meta = {
      platform: platform.trim() || undefined,
      character: character.trim() || undefined,
      tickRate,
    }
    const id = tracePuller.start(url.trim(), meta)
    setActiveSessionId(id)
  }, [url, platform, character, tickRate])

  const handleStop = useCallback((sessionId: string) => {
    tracePuller.stop(sessionId)
    setActiveSessionId(null)
  }, [])

  const handleRemove = useCallback((sessionId: string) => {
    tracePuller.removeSession(sessionId)
    if (activeSessionId === sessionId) setActiveSessionId(null)
  }, [activeSessionId])

  const handleExport = useCallback((sessionId: string) => {
    tracePuller.downloadTrace(sessionId)
  }, [])

  const handleClearAll = useCallback(() => {
    tracePuller.clear()
    setActiveSessionId(null)
  }, [])

  const handleLoadScrubber = useCallback(() => {
    if (!activeSessionId) return
    const session = tracePuller.getSession(activeSessionId)
    if (!session) return
    // Build header from session meta
    const header: Record<string, unknown> = {
      $schema: 'cybertrace/v1',
      $version: 1,
      meta: {
        platform: session.meta.platform,
        character: session.meta.character,
        startedAt: session.meta.startedAt,
        stoppedAt: new Date().toISOString(),
        eventCount: session.eventCount,
        source: 'websocket_pull',
      },
    }
    onLoadScrubber?.({ header, events: session.buffer })
  }, [activeSessionId, onLoadScrubber])

  const activeSession = sessions.find(s => s.active)

  return (
    <div className={styles.bpPanel}>
      <div className={styles.bpListHeader}>
        <span className={styles.bpListTitle}>📡 Trace Pull (Real Device)</span>
        {sessions.length > 0 && (
          <button
            className={`${styles.bpSmallBtn} ${styles.bpSmallBtnDanger}`}
            onClick={handleClearAll}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Connection form */}
      <div className={styles.bpForm}>
        <input
          className={styles.bpPatternInput}
          type="text"
          placeholder="ws://robot.local:8080/trace"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <input
          className={styles.bpPatternInput}
          type="text"
          placeholder="Platform (e.g. RoboMaster S1)"
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <input
          className={styles.bpPatternInput}
          type="text"
          placeholder="Character (e.g. fox)"
          value={character}
          onChange={e => setCharacter(e.target.value)}
          style={{ maxWidth: 120 }}
        />
        <select
          className={styles.bpPhaseSelect}
          value={tickRate}
          onChange={e => setTickRate(Number(e.target.value))}
        >
          <option value={10}>10 Hz</option>
          <option value={20}>20 Hz</option>
          <option value={30}>30 Hz</option>
          <option value={60}>60 Hz</option>
        </select>
        <button
          className={styles.bpAddBtn}
          onClick={handleStart}
          disabled={!url.trim()}
        >
          ▶ Start Pull
        </button>
      </div>

      {/* Active session banner */}
      {activeSession && (
        <div className={styles.bpBanner}>
          <span className={styles.bpBannerIcon}>📡</span>
          <div className={styles.bpBannerContent}>
            <span className={styles.bpBannerTitle}>
              Pulling from {activeSession.url}
            </span>
            <span className={styles.bpBannerDetail}>
              {activeSession.eventCount} events · {activeSession.buffer.length} buffered
              {activeSession.meta.platform && ` · ${activeSession.meta.platform}`}
            </span>
          </div>
          <button
            className={styles.bpSmallBtn}
            onClick={() => handleExport(activeSessionId ?? '')}
          >
            💾 Export
          </button>
          <button
            className={styles.bpSmallBtn}
            onClick={handleLoadScrubber}
            title="Load pulled trace directly into the scrubber"
          >
            🔍 Scrubber
          </button>
          <button
            className={`${styles.bpSmallBtn} ${styles.bpSmallBtnDanger}`}
            onClick={() => handleStop(activeSessionId ?? '')}
          >
            ⏹ Stop
          </button>
        </div>
      )}

      {/* Disconnected session list */}
      {sessions.filter(s => !s.active).length > 0 && (
        <div className={styles.bpItems}>
          {sessions.filter(s => !s.active).map(s => (
            <div key={s.url} className={styles.bpItem}>
              <span className={styles.bpIcon}>📋</span>
              <span className={styles.bpPattern} title={s.url}>{s.url}</span>
              <span className={styles.bpHitCount}>{s.eventCount} events</span>
              <button
                className={styles.bpSmallBtn}
                onClick={() => handleExport(s.url)}
              >
                💾
              </button>
              <button
                className={styles.bpSmallBtnDanger}
                onClick={() => handleRemove(s.url)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error display */}
      {sessions.some(s => s.errorMsg) && (
        <div className={styles.errorLog}>
          <div className={styles.errorLogHeader}>
            <span className={styles.errorLogTitle}>⚠ Pull Errors</span>
          </div>
          <div className={styles.errorList}>
            {sessions
              .filter(s => s.errorMsg)
              .map((s, i) => (
                <div key={i} className={styles.errorItem}>
                  <span className={styles.errorMsg}>{s.errorMsg}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

