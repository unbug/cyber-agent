/**
 * Room — M5 multi-robot rooms.
 *
 * Two or more characters share one virtual World (they can see each other,
 * exchange signals) while each is embodied on its own robot. Add members,
 * start the room, and watch personalities play out across physical robots —
 * or entirely in the browser with demo members.
 *
 * Deep link: /room?a=puppy&b=cat pre-adds members.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Ban, Play, Square, Plus, X, Users } from 'lucide-react'
import { characters, getCharacter, getBehavior } from '@/agents'
import { RoomSession, type RoomSnapshot } from '@/engine'
import type { Emotion } from '@/engine/types'
import { useI18n } from '@/i18n'
import styles from './Room.module.css'

const EMOTION_EMOJI: Record<Emotion, string> = {
  idle: '😐',
  happy: '😄',
  curious: '🧐',
  alert: '😰',
  sleepy: '😴',
  playful: '🎉',
  angry: '😡',
}

export function RoomPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const sessionRef = useRef<RoomSession | null>(null)
  const [snap, setSnap] = useState<RoomSnapshot | null>(null)
  const [pickChar, setPickChar] = useState('puppy')
  const [transport, setTransport] = useState<'demo' | 'bridge'>('demo')
  const [url, setUrl] = useState('ws://127.0.0.1:8765')
  const [addError, setAddError] = useState<string | null>(null)

  const getSession = useCallback((): RoomSession => {
    if (!sessionRef.current) {
      sessionRef.current = new RoomSession()
    }
    return sessionRef.current
  }, [])

  const addMember = useCallback(
    (characterId: string, bridgeUrl?: string): void => {
      const character = getCharacter(characterId)
      const behavior = getBehavior(characterId)
      if (!character || !behavior) {
        setAddError(`No behavior tree for "${characterId}"`)
        return
      }
      setAddError(null)
      getSession().addMember({
        characterId,
        emoji: character.emoji,
        tree: behavior.tree,
        url: bridgeUrl,
      })
    },
    [getSession],
  )

  // Deep-link pre-add (?a=&b=)
  useEffect(() => {
    const ids = [params.get('a'), params.get('b')].filter(Boolean) as string[]
    for (const id of ids) addMember(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll snapshots while a session exists
  useEffect(() => {
    const iv = setInterval(() => {
      if (sessionRef.current) setSnap(sessionRef.current.snapshot())
    }, 350)
    return () => clearInterval(iv)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void sessionRef.current?.destroy()
      sessionRef.current = null
    }
  }, [])

  const members = snap?.members ?? []
  const sortedChars = [...characters].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className={styles.page}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className={styles.title}>
            <Users size={22} style={{ verticalAlign: -3 }} /> {t('room.title')}
          </h1>
          <p className={styles.subtitle}>{t('room.subtitle')}</p>
        </motion.div>

        {/* Roster controls */}
        <div className={styles.controlBar}>
          <select
            className={styles.select}
            value={pickChar}
            onChange={(e) => setPickChar(e.target.value)}
            aria-label={t('room.character')}
          >
            {sortedChars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <div className={styles.seg}>
            <button
              type="button"
              className={`${styles.segBtn} ${transport === 'demo' ? styles.segActive : ''}`}
              onClick={() => setTransport('demo')}
            >
              {t('room.demo')}
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${transport === 'bridge' ? styles.segActive : ''}`}
              onClick={() => setTransport('bridge')}
            >
              {t('room.bridge')}
            </button>
          </div>
          {transport === 'bridge' && (
            <input
              className={styles.urlInput}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://192.168.1.50:8765"
              spellCheck={false}
            />
          )}
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => addMember(pickChar, transport === 'bridge' ? url : undefined)}
          >
            <Plus size={15} /> {t('room.add')}
          </button>
        </div>
        {addError && <div className={styles.errorText}>{addError}</div>}

        {/* Room controls */}
        <div className={styles.roomBar}>
          {!snap?.running ? (
            <button
              type="button"
              className={styles.startBtn}
              disabled={members.length < 1}
              onClick={() => getSession().start()}
            >
              <Play size={15} /> {t('room.start')}
            </button>
          ) : (
            <button type="button" className={styles.stopBtn} onClick={() => sessionRef.current?.stop()}>
              <Square size={14} /> {t('room.stop')}
            </button>
          )}
          <button
            type="button"
            className={styles.estopBtn}
            onClick={() => sessionRef.current?.estopAll()}
          >
            <Ban size={18} /> {t('room.estop')}
          </button>
          {snap && (
            <span className={styles.tps}>
              {snap.running ? `${snap.tps} tps · ${snap.ticks} ticks` : t('room.idle')}
            </span>
          )}
        </div>

        {/* Members */}
        {members.length === 0 ? (
          <p className={styles.empty}>{t('room.empty')}</p>
        ) : (
          <div className={styles.grid}>
            {members.map((m) => (
              <div key={m.id} className={styles.memberCard}>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label="remove"
                  onClick={() => sessionRef.current?.removeMember(m.id)}
                >
                  <X size={13} />
                </button>
                <div className={styles.memberHead}>
                  <span className={styles.memberEmoji}>{m.emoji}</span>
                  <span className={styles.memberName}>
                    {getCharacter(m.characterId)?.name ?? m.characterId}
                  </span>
                  <span
                    className={`${styles.linkDot} ${
                      m.link === 'ok' ? styles.linkOk : m.link === 'error' ? styles.linkErr : styles.linkPend
                    }`}
                    title={m.lastError ?? m.link}
                  />
                </div>
                <div className={styles.memberMeta}>
                  <span>{EMOTION_EMOJI[m.emotion]}</span>
                  <span>
                    x {m.x} · y {m.y}
                  </span>
                </div>
                <div className={styles.memberCmds}>
                  {m.recentCommands.length === 0 ? (
                    <span className={styles.cmdDim}>—</span>
                  ) : (
                    m.recentCommands.map((c, i) => (
                      <div key={i} className={styles.cmdLine}>
                        <strong>{c.type}</strong> {JSON.stringify(c.payload)}
                      </div>
                    ))
                  )}
                </div>
                {m.lastError && <div className={styles.memberErr}>{m.lastError}</div>}
              </div>
            ))}
          </div>
        )}

        <p className={styles.hint}>{t('room.hint')}</p>
      </div>
    </div>
  )
}
