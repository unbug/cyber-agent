/**
 * ShareSessionPanel — Share the current /debug session with a teammate.
 *
 * Generates a compressed URL hash containing:
 * - Character name
 * - BT tree (serialized)
 * - Blackboard snapshot
 * - Recent tracer events
 * - VAL state
 *
 * Teammate opens the URL and sees the exact same debug state at the
 * moment of capture — useful for bug reports, code reviews, and
 * collaborative debugging.
 */

import { useState, useCallback, useEffect } from 'react'
import { encodeSession, decodeSession, isShareUrl, clearShareHash } from '@/utils/session-share'
import type { SharedSessionState } from '@/utils/session-share'
import type { RuntimeNode, Blackboard } from '@/engine/types'
import type { TracerEvent } from '@/engine/tracer'
import type { ValState } from '@/affect/types'
import type { BbDiff } from '@/hooks/useDebug'
import styles from '../pages/DebugPage.module.css'

// ─── Component ──────────────────────────────────────────────────────

interface ShareSessionPanelProps {
  /** Current character name */
  character: string
  /** Current BT tree (root node) */
  btTree: RuntimeNode | null
  /** Current blackboard snapshot */
  blackboard: Blackboard | null
  /** Recent tracer events */
  recentEvents: TracerEvent[]
  /** Current VAL state */
  valState: ValState | null
  /** VAL history */
  valHistory: Array<{ t: number; valence: number; arousal: number; dominance: number }>
  /** Blackboard diffs */
  diffs: BbDiff[]
  /** Callback when a shared session is loaded */
  onSessionLoaded?: (state: SharedSessionState) => void
}

/** Serialize a runtime node tree to a compact string */
function serializeTree(node: RuntimeNode): string {
  const serialize = (n: RuntimeNode): string => {
    const def = n.def
    const children = n.children.map(serialize).join(',')
    return `${def.type}:${def.name ?? 'unnamed'}:${n.status}(${children})`
  }
  return serialize(node)
}

export function ShareSessionPanel({
  character,
  btTree,
  blackboard,
  recentEvents,
  valState,
  valHistory,
  diffs,
  onSessionLoaded,
}: ShareSessionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharedState, setSharedState] = useState<SharedSessionState | null>(null)

  // Auto-load shared session on mount
  useEffect(() => {
    if (!isShareUrl()) return
    const hash = window.location.hash
    decodeSession(hash).then((state) => {
      if (state) {
        setSharedState(state)
        onSessionLoaded?.(state)
      }
    })
  }, [])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    try {
      const state: Partial<SharedSessionState> = {
        version: 1,
        character,
      }

      // Serialize BT tree
      if (btTree) {
        state.btTree = serializeTree(btTree)
      }

      // Blackboard snapshot
      if (blackboard) {
        state.blackboard = blackboard
      }

      // Recent events (last 100)
      if (recentEvents.length > 0) {
        state.recentEvents = recentEvents.slice(-100).map(e => ({
          t: e.t,
          type: e.type,
          label: e.label,
          payload: e.payload,
        }))
      }

      // VAL state
      if (valState) {
        state.valState = valState
      }

      // VAL history
      if (valHistory.length > 0) {
        state.valHistory = valHistory.slice(-200)
      }

      // Diffs
      if (diffs.length > 0) {
        state.diffs = diffs
      }

      const url = await encodeSession(state)

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin + window.location.pathname + url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback: show URL in prompt
        prompt('Copy this URL to share your session:', window.location.origin + window.location.pathname + url)
      }
    } finally {
      setLoading(false)
    }
  }, [character, btTree, blackboard, recentEvents, valState, valHistory, diffs, onSessionLoaded])

  const handleClear = useCallback(() => {
    setSharedState(null)
    clearShareHash()
  }, [])

  if (sharedState) {
    return (
      <div className={styles.bpPanel}>
        <div className={styles.bpListHeader}>
          <span className={styles.bpListTitle}>🔗 Shared Session</span>
          <button
            className={`${styles.bpSmallBtn} ${styles.bpSmallBtnDanger}`}
            onClick={handleClear}
          >
            ✕ Close
          </button>
        </div>
        <div className={styles.bpItems}>
          <div className={styles.bpItem}>
            <span className={styles.bpIcon}>🤖</span>
            <span className={styles.bpPattern}>{sharedState.character || 'unknown'}</span>
          </div>
          <div className={styles.bpItem}>
            <span className={styles.bpIcon}>🌳</span>
            <span className={styles.bpPattern}>{sharedState.btTree?.slice(0, 80) || 'no tree'}</span>
          </div>
          {sharedState.blackboard && (
            <div className={styles.bpItem}>
              <span className={styles.bpIcon}>🧠</span>
              <span className={styles.bpPattern}>
                {Object.keys(sharedState.blackboard).length} fields
              </span>
            </div>
          )}
          {sharedState.recentEvents && (
            <div className={styles.bpItem}>
              <span className={styles.bpIcon}>📡</span>
              <span className={styles.bpPattern}>{sharedState.recentEvents.length} events</span>
            </div>
          )}
          {sharedState.valState && (
            <div className={styles.bpItem}>
              <span className={styles.bpIcon}>❤️</span>
              <span className={styles.bpPattern}>
                V:{sharedState.valState.valence.toFixed(2)} A:{sharedState.valState.arousal.toFixed(2)} D:{sharedState.valState.dominance.toFixed(2)}
              </span>
            </div>
          )}
          <div className={styles.bpItem}>
            <span className={styles.bpIcon}>📅</span>
            <span className={styles.bpPattern}>{sharedState.capturedAt}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.bpPanel}>
      <div className={styles.bpListHeader}>
        <span className={styles.bpListTitle}>🔗 Share Session</span>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0 0 var(--space-2)' }}>
        Generate a URL that captures your current debug state. Send it to a teammate
        so they can see the exact same BT tree, blackboard, and events.
      </p>
      <button
        className={styles.bpAddBtn}
        onClick={handleGenerate}
        disabled={loading || !character}
        style={{ width: '100%' }}
      >
        {loading ? '⏳ Compressing...' : copied ? '✅ Copied!' : '🔗 Generate Share URL'}
      </button>
    </div>
  )
}
