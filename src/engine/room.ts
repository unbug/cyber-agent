/**
 * RoomSession — M5 multi-robot rooms.
 *
 * Several characters share one virtual World (positions, spatial queries,
 * signal bus) while each character is embodied on its OWN robot (a bridge
 * URL) or on a loopback demo adapter. Characters meet in the world; robots
 * move in the living room.
 *
 * The engine layer stays React-free and transport-injected so it can be
 * unit-tested with fake adapters.
 */

import { World } from './world'
import type { WorldAgent } from './world'
import { MultiExecutor } from './multi-executor'
import { hydrate } from './executor'
import type { RuntimeNode } from './types'
import { EmbodimentAdapter, LoopbackRobotAdapter } from './embodiment'
import { WebSocketAdapter } from './websocket-adapter'
import { getTuningFor, resolveEmbodimentConfig } from './drive-tuning'
import { CommandTee } from './command-tee'
import type { RobotAdapterV2 } from '@cyber-agent/sdk/adapter/contract'
import type { AdapterCommand, BehaviorNodeDef, Emotion } from './types'

export type RoomTransport = (url: string) => RobotAdapterV2

export interface RoomMemberOptions {
  /** Character id (for drive-tuning lookup + display). */
  characterId: string
  /** Behavior tree definition to hydrate. */
  tree: BehaviorNodeDef
  emoji?: string
  /** Bridge URL; omit for an in-browser demo member. */
  url?: string
  x?: number
  y?: number
}

export type RoomLinkState = 'connecting' | 'ok' | 'error'

export interface RoomMemberSnapshot {
  id: string
  characterId: string
  emoji: string
  x: number
  y: number
  emotion: Emotion
  link: RoomLinkState
  lastError?: string
  recentCommands: AdapterCommand[]
}

export interface RoomSnapshot {
  running: boolean
  ticks: number
  tps: number
  members: RoomMemberSnapshot[]
}

interface Member extends Omit<RoomMemberOptions, 'tree'> {
  id: string
  worldAgent: WorldAgent
  tree: RuntimeNode
  tee: CommandTee
  emb: EmbodimentAdapter
  link: RoomLinkState
  lastError?: string
}

const TICK_MS = 40

let roomCounter = 0

export class RoomSession {
  readonly world: World
  readonly executor: MultiExecutor
  private members = new Map<string, Member>()
  private timer: ReturnType<typeof setInterval> | null = null
  private ticks = 0
  private lastTickAt = 0
  private lastTps = 0
  private destroyed = false

  constructor(private transport: RoomTransport = (url) =>
    new WebSocketAdapter({ url, autoConnect: false }),
  ) {
    this.world = new World()
    this.executor = new MultiExecutor(this.world)
  }

  get memberCount(): number {
    return this.members.size
  }

  /**
   * Add a character (+ its robot). Synchronous registration; the robot
   * connection resolves in the background and is reflected in snapshots.
   * Throws if the character has no behavior tree.
   */
  addMember(opts: RoomMemberOptions): string {
    if (this.destroyed) throw new Error('room destroyed')
    const id = `m${++roomCounter}`
    const worldAgent = this.world.registerAgent(
      id,
      opts.characterId,
      opts.x ?? 100 + (roomCounter % 6) * 100,
      opts.y ?? 300,
    )
    // Give the BT the shared world so social primitives work
    // (isCloseTo / emitSignal / agentHasSignal read bb.world).
    ;(worldAgent.blackboard as Record<string, unknown>).world = this.world

    const tree = hydrate(opts.tree)
    this.executor.registerAgent(id, tree, worldAgent.blackboard)

    const inner = opts.url
      ? this.transport(opts.url)
      : new LoopbackRobotAdapter()
    const tee = new CommandTee(inner)
    const platformKey = opts.url ? 'ws' : 'demo'
    const emb = new EmbodimentAdapter(
      tee,
      resolveEmbodimentConfig(0.5, getTuningFor(opts.characterId, platformKey)),
    )

    const member: Member = {
      ...opts,
      id,
      worldAgent,
      tree,
      tee,
      emb,
      link: opts.url ? 'connecting' : 'ok',
    }
    this.members.set(id, member)

    // Fire-and-forget: connect errors are surfaced in the snapshot; the
    // bridge-side failsafe protects the robot if a link drops mid-run.
    tee.init(worldAgent.blackboard)
    void tee
      .connect()
      .then(() => {
        member.link = 'ok'
      })
      .catch((e: unknown) => {
        member.link = 'error'
        member.lastError = e instanceof Error ? e.message : String(e)
      })

    return id
  }

  removeMember(id: string): void {
    const m = this.members.get(id)
    if (!m) return
    this.members.delete(id)
    this.executor.unregisterAgent(id)
    this.world.unregisterAgent(id)
    try {
      m.tee.sendCommand({ type: 'stop', payload: {} })
    } catch {
      /* link already down — bridge failsafe handles it */
    }
    void m.tee.disconnect().catch(() => undefined).then(() => m.tee.destroy())
  }

  start(): void {
    if (this.timer || this.destroyed) return
    this.lastTickAt = Date.now()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  get running(): boolean {
    return this.timer !== null
  }

  private tick(): void {
    this.executor.tickAll()
    for (const m of this.members.values()) {
      m.emb.update(m.worldAgent.blackboard)
      // keep world spatial position in sync (executor does it for
      // registered world agents too — this is cheap and idempotent)
      m.worldAgent.x = m.worldAgent.blackboard.x
      m.worldAgent.y = m.worldAgent.blackboard.y
    }
    this.ticks++
    const dt = Date.now() - this.lastTickAt
    if (dt >= 1000) {
      this.lastTps = Math.round(((this.ticks % 100000) / dt) * 1000)
      this.lastTickAt = Date.now()
    }
  }

  /** Emergency: 3× stop to every member (mirrors /connect E-STOP). */
  estopAll(): void {
    this.stop()
    const send = () => {
      for (const m of this.members.values()) {
        try {
          m.tee.sendCommand({ type: 'stop', payload: {} })
        } catch {
          /* ignore */
        }
      }
    }
    for (let i = 0; i < 3; i++) setTimeout(send, i * 150)
  }

  snapshot(): RoomSnapshot {
    return {
      running: this.running,
      ticks: this.ticks,
      tps: this.running ? this.lastTps : 0,
      members: [...this.members.values()].map((m) => ({
        id: m.id,
        characterId: m.characterId,
        emoji: m.emoji ?? '🤖',
        x: Math.round(m.worldAgent.blackboard.x),
        y: Math.round(m.worldAgent.blackboard.y),
        emotion: m.worldAgent.blackboard.emotion,
        link: m.link,
        lastError: m.lastError,
        recentCommands: m.tee.log.slice(-3).reverse(),
      })),
    }
  }

  async destroy(): Promise<void> {
    this.destroyed = true
    this.stop()
    const ids = [...this.members.keys()]
    for (const id of ids) {
      const m = this.members.get(id)
      if (!m) continue
      try {
        m.tee.sendCommand({ type: 'stop', payload: {} })
      } catch {
        /* ignore */
      }
      this.removeMember(id)
    }
  }
}
