/**
 * Connect — the Magic Loop page.
 *
 * Pick a character → pick a robot → deploy. The character's behavior tree
 * runs in the browser and its virtual motion is embodied on the real robot
 * through EmbodimentAdapter + a WebSocket bridge.
 *
 * Routes: /connect (picker) · /connect?character=puppy (preselected)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Ban, Plug, Power, Bot, Radar, History } from 'lucide-react'
import { characters, getCharacter, getBehavior } from '@/agents'
import { EmbodimentAdapter, LoopbackRobotAdapter, BehaviorTreeRunner } from '@/engine'
import { WebSocketAdapter } from '@/engine/websocket-adapter'
import {
  scanBridges,
  rememberBridge,
  getRecentBridges,
  forgetBridge,
  type BridgeInfo,
} from '@/engine/bridge-discovery'
import type { RunnerSnapshot } from '@/engine'
import type { AdapterCommand, Emotion } from '@/engine/types'
import type {
  RobotAdapterV2,
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
} from '@cyber-agent/sdk/adapter/contract'
import type { Blackboard } from '@/engine/types'
import { useI18n } from '@/i18n'
import styles from './Connect.module.css'

// ─── Platform catalogue ───────────────────────────────────────────

interface PlatformDef {
  id: string
  emoji: string
  name: string
  desc: string
  url: string
  loopback?: boolean
  bridgeCmd?: string
}

const PLATFORMS: PlatformDef[] = [
  {
    id: 'demo',
    emoji: '🎮',
    name: 'Demo Robot',
    desc: 'No hardware needed — watch live commands in the browser',
    url: '',
    loopback: true,
  },
  {
    id: 'cyberbrick',
    emoji: '🛞',
    name: 'CyberBrick Mini T',
    desc: 'Tracked tank · turret · blaster',
    url: 'ws://127.0.0.1:8765',
    bridgeCmd: 'python3 bridge/robot_bridge.py --platform cyberbrick',
  },
  {
    id: 'robomaster',
    emoji: '🤖',
    name: 'RoboMaster EP / S1',
    desc: 'DJI RoboMaster via SDK bridge',
    url: 'ws://127.0.0.1:8766',
    bridgeCmd: 'python3 bridge/robot_bridge.py --platform robomaster',
  },
  {
    id: 'ws',
    emoji: '🔌',
    name: 'Any WebSocket Robot',
    desc: 'JSON {type,payload} protocol — motors · led · sound · stop',
    url: 'ws://192.168.1.100:8765',
  },
]

const EMOTION_EMOJI: Record<Emotion, string> = {
  idle: '😐',
  happy: '😄',
  curious: '🧐',
  alert: '😰',
  sleepy: '😴',
  playful: '🎉',
  angry: '😡',
}

// ─── Command tee (visibility without touching adapters) ──────────

class CommandTee implements RobotAdapterV2 {
  readonly type: string
  readonly name: string
  readonly contractVersion = 'v2' as const
  readonly log: AdapterCommand[] = []

  constructor(private inner: RobotAdapterV2) {
    this.type = inner.type
    this.name = inner.name
  }

  init(bb: Blackboard): void {
    this.inner.init(bb)
  }
  update(bb: Blackboard): void {
    this.inner.update(bb)
  }
  destroy(): void {
    this.inner.destroy()
  }
  sendCommand(c: AdapterCommand): void {
    this.log.push({ ...c, payload: { ...c.payload } })
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200)
    this.inner.sendCommand(c)
  }
  capabilities(): RobotCapabilitiesV2 {
    return this.inner.capabilities()
  }
  connect(): Promise<void> {
    return this.inner.connect()
  }
  disconnect(): Promise<void> {
    return this.inner.disconnect()
  }
  onTelemetry(cb: (e: TelemetryEvent) => void): () => void {
    return this.inner.onTelemetry(cb)
  }
  selfTest(): SelfTestReport {
    return this.inner.selfTest()
  }
}

/** Mark our session so bridge child-lock (phone remotes) exempts the web app. */
export function browserRoleUrl(url: string): string {
  return url.includes('role=') ? url : url + (url.includes('?') ? '&' : '?') + 'role=browser'
}

// ─── Page ─────────────────────────────────────────────────────────

type Phase = 'idle' | 'deploying' | 'deployed' | 'error'

/** M3 safety: speed presets → EmbodimentAdapter maxSpeed (0..1 motor fraction). */
export const SPEED_KEY = 'cyberag' + 'ent.speedPreset'
export const SPEED_PRESETS = [
  { id: 'slow', maxSpeed: 0.25, emoji: '🐢' },
  { id: 'normal', maxSpeed: 0.5, emoji: '🚶' },
  { id: 'turbo', maxSpeed: 0.9, emoji: '🐇' },
] as const

export function ConnectPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()

  const initialChar = params.get('character')
  const [characterId, setCharacterId] = useState<string | null>(
    initialChar && getCharacter(initialChar) ? initialChar : null,
  )
  const [platformId, setPlatformId] = useState('demo')
  const [urlByPlatform, setUrlByPlatform] = useState<Record<string, string>>(
    Object.fromEntries(PLATFORMS.map((p) => [p.id, p.url])),
  )
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [snapshot, setSnapshot] = useState<RunnerSnapshot | null>(null)
  const [commands, setCommands] = useState<AdapterCommand[]>([])
  const [telemetry, setTelemetry] = useState<TelemetryEvent | null>(null)
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<BridgeInfo[]>([])
  const [noResults, setNoResults] = useState(false)
  const [recent, setRecent] = useState<BridgeInfo[]>(() => getRecentBridges())
  const [speedPreset, setSpeedPreset] = useState<string>(
    () => localStorage.getItem(SPEED_KEY) || 'normal',
  )

  const runnerRef = useRef<BehaviorTreeRunner | null>(null)
  const teeRef = useRef<CommandTee | null>(null)

  const platform = PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0]!
  const character = characterId ? getCharacter(characterId) : undefined

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return characters
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }, [search])

  const hardStop = useCallback(() => {
    const tee = teeRef.current
    if (!tee) return
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        try {
          tee.sendCommand({ type: 'stop', payload: {} })
        } catch {
          /* socket already down — robot-side failsafe handles it */
        }
      }, i * 150)
    }
  }, [])

  const undeploy = useCallback(() => {
    runnerRef.current?.stop()
    runnerRef.current = null
    const tee = teeRef.current
    teeRef.current = null
    void tee?.disconnect().catch(() => undefined)
    setSnapshot(null)
    setCommands([])
    setPhase('idle')
  }, [])

  // Cleanup on unmount / page change
  useEffect(() => {
    return () => {
      runnerRef.current?.stop()
      runnerRef.current = null
    }
  }, [])

  // Poll live state while deployed
  useEffect(() => {
    if (phase !== 'deployed') return
    const iv = setInterval(() => {
      const r = runnerRef.current
      if (r) setSnapshot(r.snapshot())
      setCommands(teeRef.current?.log.slice(-8).reverse() ?? [])
    }, 350)
    return () => clearInterval(iv)
  }, [phase])

  const deploy = useCallback(async () => {
    if (!character) return
    const behavior = getBehavior(character.id)
    if (!behavior) {
      setError(`No behavior tree for "${character.id}"`)
      setPhase('error')
      return
    }

    setPhase('deploying')
    setError(null)
    setCommands([])
    setTelemetry(null)

    try {
      const inner: RobotAdapterV2 = platform.loopback
        ? new LoopbackRobotAdapter()
        : new WebSocketAdapter({
            url: browserRoleUrl(urlByPlatform[platform.id] || platform.url),
            autoConnect: false,
          })
      const tee = new CommandTee(inner)
      const preset = SPEED_PRESETS.find((p) => p.id === speedPreset) ?? SPEED_PRESETS[1]!
      const emb = new EmbodimentAdapter(tee, { maxSpeed: preset.maxSpeed })

      await emb.connect()
      tee.onTelemetry(setTelemetry)
      if (!platform.loopback) {
        rememberBridge({
          url: urlByPlatform[platform.id] || platform.url,
          platform: platform.id,
          name: platform.name,
        })
        setRecent(getRecentBridges())
      }

      const runner = new BehaviorTreeRunner(behavior, emb)
      runner.setCanvasSize(800, 600) // virtual world for the BT
      runner.start()

      runnerRef.current = runner
      teeRef.current = tee
      setPhase('deployed')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [character, platform, urlByPlatform, speedPreset])

  const scan = useCallback(async () => {
    setScanning(true)
    setNoResults(false)
    setFound([])
    const current = (urlByPlatform[platform.id] || platform.url || '').trim()
    const hits = await scanBridges(current ? [current] : [], 1200)
    setFound(hits)
    setNoResults(hits.length === 0)
    setScanning(false)
  }, [platform, urlByPlatform])

  const useBridge = useCallback((info: BridgeInfo) => {
    const match = PLATFORMS.find((p) => p.id === info.platform)
    setPlatformId(match ? match.id : 'ws')
    setUrlByPlatform((m) => ({ ...m, [match ? match.id : 'ws']: info.url }))
    rememberBridge({ url: info.url, platform: info.platform, name: info.name })
    setRecent(getRecentBridges())
  }, [])

  const estop = useCallback(() => {
    hardStop()
    runnerRef.current?.stop()
    setPhase('idle')
    setSnapshot(null)
  }, [hardStop])

  const stepState = (n: 1 | 2 | 3): 'todo' | 'active' | 'done' => {
    if (n === 1) return character ? 'done' : 'active'
    if (n === 2) return phase === 'deployed' ? 'done' : character ? 'active' : 'todo'
    return phase === 'deployed' ? 'active' : 'todo'
  }

  const chipClass = (s: 'todo' | 'active' | 'done') =>
    [styles.stepChip, s === 'active' ? styles.stepChipActive : '', s === 'done' ? styles.stepChipDone : '']
      .filter(Boolean)
      .join(' ')

  return (
    <div className={styles.page}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className={styles.title}>{t('connect.title')}</h1>
          <p className={styles.subtitle}>{t('connect.subtitle')}</p>
        </motion.div>

        <div className={styles.steps}>
          <span className={chipClass(stepState(1))}>
            <span className={styles.stepNum}>1</span> {t('connect.step_character')}
          </span>
          <span className={chipClass(stepState(2))}>
            <span className={styles.stepNum}>2</span> {t('connect.step_robot')}
          </span>
          <span className={chipClass(stepState(3))}>
            <span className={styles.stepNum}>3</span> {t('connect.step_live')}
          </span>
        </div>

        {phase !== 'deployed' ? (
          <div className={styles.grid}>
            {/* Step 1 — character */}
            <div className={styles.panel}>
              <div className={styles.panelTitle}>{t('connect.step_character')}</div>
              <input
                className={styles.search}
                placeholder={t('connect.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className={styles.charGrid}>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.charBtn} ${characterId === c.id ? styles.charBtnSelected : ''}`}
                    onClick={() => setCharacterId(c.id)}
                    title={c.description}
                  >
                    <span className={styles.charEmoji}>{c.emoji}</span>
                    <span className={styles.charName}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — robot */}
            <div className={styles.panel}>
              <div className={styles.panelTitle}>{t('connect.step_robot')}</div>
              <div className={styles.platformList}>
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.platformBtn} ${platformId === p.id ? styles.platformBtnSelected : ''}`}
                    onClick={() => setPlatformId(p.id)}
                  >
                    <span className={styles.platformEmoji}>{p.emoji}</span>
                    <span>
                      <span className={styles.platformName}>{p.name}</span>
                      <div className={styles.platformDesc}>{p.desc}</div>
                    </span>
                  </button>
                ))}
              </div>

              {!platform.loopback && (
                <>
                  <div className={styles.urlRow}>
                    <input
                      className={styles.urlInput}
                      value={urlByPlatform[platform.id] ?? ''}
                      onChange={(e) =>
                        setUrlByPlatform((m) => ({ ...m, [platform.id]: e.target.value }))
                      }
                      placeholder="ws://..."
                      spellCheck={false}
                    />
                  </div>
                  <div className={styles.scanRow}>
                    <button
                      type="button"
                      className={styles.scanBtn}
                      onClick={() => void scan()}
                      disabled={scanning}
                    >
                      <Radar size={14} style={{ verticalAlign: -2 }} />
                      {scanning ? t('connect.scanning') : t('connect.scan')}
                    </button>
                  </div>
                  {found.length > 0 && (
                    <div className={styles.foundList} data-testid="found-bridges">
                      <div className={styles.foundTitle}>{t('connect.found_robots')}</div>
                      {found.map((f) => (
                        <button
                          key={f.url}
                          type="button"
                          className={styles.foundBtn}
                          onClick={() => useBridge(f)}
                        >
                          🤖 {f.name} <code>{f.url}</code>
                        </button>
                      ))}
                    </div>
                  )}
                  {noResults && (
                    <div className={styles.noResults}>{t('connect.no_robots')}</div>
                  )}
                  {recent.length > 0 && (
                    <div className={styles.recentRow}>
                      <span className={styles.recentLabel}>
                        <History size={12} style={{ verticalAlign: -2 }} /> {t('connect.recent_robots')}
                      </span>
                      {recent.map((r) => (
                        <button
                          key={r.url}
                          type="button"
                          className={styles.recentBtn}
                          onClick={() => useBridge(r)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            forgetBridge(r.url)
                            setRecent(getRecentBridges())
                          }}
                          title={r.url}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.bridgeHint}>
                    {t('connect.bridge_hint')}
                    {platform.bridgeCmd && <code className={styles.bridgeCmd}>{platform.bridgeCmd}</code>}
                  </div>
                </>
              )}

              <div className={styles.speedRow} role="radiogroup" aria-label={t('connect.speed_label')}>
                <span className={styles.recentLabel}>{t('connect.speed_label')}</span>
                {SPEED_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={speedPreset === p.id}
                    className={`${styles.recentBtn} ${speedPreset === p.id ? styles.speedBtnActive : ''}`}
                    onClick={() => {
                      setSpeedPreset(p.id)
                      try { localStorage.setItem(SPEED_KEY, p.id) } catch { /* ignore */ }
                    }}
                  >
                    {p.emoji} {t(`connect.speed_${p.id}`)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.deployBtn}
                disabled={!character || phase === 'deploying'}
                onClick={() => void deploy()}
              >
                <Plug size={16} />
                {phase === 'deploying' ? t('connect.deploying') : t('connect.deploy')}
              </button>

              <div className={styles.statusRow}>
                <span
                  className={`${styles.dot} ${
                    phase === 'deploying'
                      ? styles.dotConnecting
                      : phase === 'error'
                        ? styles.dotError
                        : ''
                  }`}
                />
                <span>
                  {phase === 'deploying'
                    ? t('connect.status_connecting')
                    : phase === 'error'
                      ? t('connect.status_error')
                      : character
                        ? `${character.emoji} ${character.name} → ${platform.name}`
                        : t('connect.status_idle')}
                </span>
              </div>
              {error && <div className={styles.errorText}>{error}</div>}
            </div>
          </div>
        ) : (
          /* Step 3 — live */
          <motion.div
            className={`${styles.panel} ${styles.liveWrap}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ maxWidth: 640, margin: '0 auto' }}
          >
            <div className={styles.liveHero}>
              <span className={styles.liveEmoji}>{character?.emoji}</span>
              <div>
                <div className={styles.liveName}>
                  {character?.name} <Bot size={14} style={{ verticalAlign: -2 }} />
                </div>
                <div className={styles.liveMeta}>
                  {t('connect.deployed_on')} {platform.name}
                </div>
              </div>
            </div>

            <div className={styles.statRow}>
              <div className={styles.statBox}>
                <div className={styles.statVal}>
                  {snapshot ? `${snapshot.ticksPerSecond}` : '—'}
                </div>
                <div className={styles.statLabel}>{t('connect.tps')}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statVal}>
                  {snapshot ? EMOTION_EMOJI[snapshot.blackboard.emotion] : '—'}
                </div>
                <div className={styles.statLabel}>{t('connect.emotion')}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statVal}>
                  {snapshot
                    ? `${Math.round(snapshot.blackboard.x)},${Math.round(snapshot.blackboard.y)}`
                    : '—'}
                </div>
                <div className={styles.statLabel}>{t('connect.position')}</div>
              </div>
            </div>

            <div className={styles.panelTitle}>{t('connect.recent_commands')}</div>
            <div className={styles.cmdLog}>
              {commands.length === 0 ? (
                <span className={styles.cmdEmpty}>{t('connect.no_commands')}</span>
              ) : (
                commands.map((c, i) => (
                  <div key={i}>
                    <strong>{c.type}</strong> {JSON.stringify(c.payload)}
                  </div>
                ))
              )}
            </div>

            {telemetry && (
              <div className={styles.telemetry}>
                ⚡ {telemetry.type} {JSON.stringify(telemetry.payload)}
              </div>
            )}

            <button type="button" className={styles.estopBtn} onClick={estop}>
              <Ban size={20} />
              {t('connect.estop')}
            </button>
            <button type="button" className={styles.undeployBtn} onClick={undeploy}>
              <Power size={13} style={{ verticalAlign: -2 }} /> {t('connect.undeploy')}
            </button>

            <p className={styles.safetyNote}>{t('connect.safety_note')}</p>
          </motion.div>
        )}

        {!character && (
          <p className={styles.safetyNote} style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
            {t('connect.browse_hint')}{' '}
            <Link to="/gallery" style={{ color: 'var(--accent)' }}>
              {t('nav.gallery')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
