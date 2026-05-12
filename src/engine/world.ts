/**
 * World — shared state container for multi-agent simulation.
 *
 * The World holds:
 *   - A shared blackboard (mutable state accessible to all agents)
 *   - A SpatialIndex for proximity queries
 *   - A pub-sub event bus for inter-agent communication
 *   - A deterministic RNG for reproducible simulation
 *   - World time and step counter
 *
 * Each agent (character) registers with the World and gets:
 *   - Its own blackboard slice (position, emotion, etc.)
 *   - Access to the shared event bus
 *   - Spatial queries via the World's SpatialIndex
 */

import { type Blackboard, createBlackboard } from './types'
import { SpatialIndex } from './spatial-index'

// ─── Types ───────────────────────────────────────────────────────

/** Event published on the bus */
export interface BusEvent {
  /** Event type (e.g. "agent.emotion", "agent.signal", "world.tick") */
  type: string
  /** Source agent ID (empty for world-level events) */
  source?: string
  /** Event payload */
  payload: Record<string, unknown>
  /** World time when event was emitted */
  t: number
}

/** Agent registered in the world */
export interface WorldAgent {
  /** Unique agent ID */
  id: string
  /** Character ID this agent represents */
  characterId: string
  /** Agent's own blackboard */
  blackboard: Blackboard
  /** Spatial position (mirrors blackboard.x/y) */
  x: number
  y: number
  /** Is the agent active (running its BT) */
  active: boolean
  /** Registered event subscriptions */
  subscriptions: string[]
}

/** World configuration */
export interface WorldConfig {
  /** World width in pixels */
  width: number
  /** World height in pixels */
  height: number
  /** Spatial index cell size in pixels */
  cellSize: number
  /** Deterministic seed for RNG (for replay parity) */
  seed?: number
}

/** Default world config */
export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  width: 800,
  height: 600,
  cellSize: 50,
  seed: 42,
}

// ─── Deterministic PRNG (Mulberry32) ────────────────────────────

/**
 * Mulberry32 — a fast, 32-bit seeded PRNG.
 * Used for deterministic simulation where replay parity matters.
 * Same seed → same sequence, every time.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Pub-Sub Bus ─────────────────────────────────────────────────

export class EventBus {
  private handlers = new Map<string, Set<() => void>>()
  private events: BusEvent[] = []
  private maxEvents = 1000

  on(type: string, callback: () => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(callback)
  }

  off(type: string, callback: () => void): void {
    const set = this.handlers.get(type)
    if (set) {
      set.delete(callback)
      if (set.size === 0) this.handlers.delete(type)
    }
  }

  emit(event: BusEvent): void {
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }

    const callbacks = this.handlers.get(event.type)
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb()
        } catch (e) {
          console.error(`[EventBus] Error in handler for "${event.type}":`, e)
        }
      }
    }
  }

  /** Get all events since the given index */
  getEvents(fromIndex = 0): BusEvent[] {
    return this.events.slice(fromIndex)
  }

  /** Get events matching a type prefix */
  getEventsByType(prefix: string): BusEvent[] {
    return this.events.filter((e) => e.type.startsWith(prefix))
  }

  clear(): void {
    this.handlers.clear()
    this.events.length = 0
  }
}

// ─── World ───────────────────────────────────────────────────────

export class World {
  private _agents = new Map<string, WorldAgent>()
  private _blackboard: Blackboard
  private _spatialIndex: SpatialIndex
  private _bus: EventBus
  private _rng: () => number
  private _time = 0
  private _step = 0
  private _config: WorldConfig

  constructor(config: Partial<WorldConfig> = {}) {
    this._config = { ...DEFAULT_WORLD_CONFIG, ...config }
    this._blackboard = createBlackboard(this._config.width, this._config.height)
    this._spatialIndex = new SpatialIndex({
      cellSize: this._config.cellSize,
    })
    this._spatialIndex.setWorldBounds(this._config.width, this._config.height)
    this._bus = new EventBus()
    this._rng = mulberry32(this._config.seed ?? 42)
  }

  // ── Config ────────────────────────────────────────────────

  get config(): WorldConfig {
    return this._config
  }

  setConfig(patch: Partial<WorldConfig>): void {
    this._config = { ...this._config, ...patch }
  }

  // ── Time ──────────────────────────────────────────────────

  get time(): number {
    return this._time
  }

  get step(): number {
    return this._step
  }

  get agents(): Map<string, WorldAgent> {
    return this._agents
  }

  // ── RNG ───────────────────────────────────────────────────

  /**
   * Get a deterministic random number in [0, 1).
   * Same seed → same sequence → 100% replay parity.
   */
  random(): number {
    return this._rng()
  }

  /**
   * Reseed the RNG (for replay or fresh simulation).
   */
  reseed(seed: number): void {
    this._rng = mulberry32(seed)
  }

  // ── Shared Blackboard ─────────────────────────────────────

  get blackboard(): Blackboard {
    return this._blackboard
  }

  setBlackboard(patch: Partial<Blackboard>): void {
    Object.assign(this._blackboard, patch)
  }

  getSharedState<K extends keyof Blackboard>(key: K): Blackboard[K] {
    return this._blackboard[key]
  }

  setSharedState<K extends keyof Blackboard>(key: K, value: Blackboard[K]): void {
    this._blackboard[key] = value
  }

  // ── Agent management ──────────────────────────────────────

  registerAgent(
    id: string,
    characterId: string,
    x = 400,
    y = 300,
  ): WorldAgent {
    const bb = createBlackboard(this._config.width, this._config.height)
    bb.x = x
    bb.y = y
    const agent: WorldAgent = {
      id,
      characterId,
      blackboard: bb,
      x,
      y,
      active: true,
      subscriptions: [],
    }
    this._agents.set(id, agent)
    this._spatialIndex.add({ id, x, y })
    this._bus.emit({
      type: 'agent.register',
      source: id,
      payload: { characterId, x, y },
      t: this._time,
    })
    return agent
  }

  unregisterAgent(id: string): void {
    const agent = this._agents.get(id)
    if (!agent) return
    this._spatialIndex.remove(id)
    this._agents.delete(id)
    this._bus.emit({
      type: 'agent.unregister',
      source: id,
      payload: { characterId: agent.characterId },
      t: this._time,
    })
  }

  getAgent(id: string): WorldAgent | undefined {
    return this._agents.get(id)
  }

  getAgents(): WorldAgent[] {
    return Array.from(this._agents.values())
  }

  getAgentCount(): number {
    return this._agents.size
  }

  /** Find agents near a position within a radius */
  findNearbyAgents(x: number, y: number, radius: number): WorldAgent[] {
    const result = this._spatialIndex.queryRadius(x, y, radius)
    return result.points
      .map((p) => this._agents.get(p.id))
      .filter((a): a is WorldAgent => a !== undefined)
  }

  /** Find agents near a specific agent */
  findAgentNeighbors(agentId: string): WorldAgent[] {
    const result = this._spatialIndex.queryNeighbors(agentId)
    return result.points
      .map((p) => this._agents.get(p.id))
      .filter((a): a is WorldAgent => a !== undefined)
  }

  /** Check if an agent is near another agent (within radius) */
  isNear(agentId: string, targetId: string, radius: number): boolean {
    const a = this._agents.get(agentId)
    const b = this._agents.get(targetId)
    if (!a || !b) return false
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy <= radius * radius
  }

  /** Check if an agent is in the same or adjacent cell as another */
  isAdjacent(agentId: string, targetId: string): boolean {
    const a = this._agents.get(agentId)
    const b = this._agents.get(targetId)
    if (!a || !b) return false
    const cellSize = this._config.cellSize
    const cxA = Math.floor(a.x / cellSize)
    const cyA = Math.floor(a.y / cellSize)
    const cxB = Math.floor(b.x / cellSize)
    const cyB = Math.floor(b.y / cellSize)
    return Math.abs(cxA - cxB) <= 1 && Math.abs(cyA - cyB) <= 1
  }

  /** Find the nearest agent to a position */
  findNearestAgent(x: number, y: number, excludeId?: string): WorldAgent | null {
    let nearest: WorldAgent | null = null
    let nearestDist = Infinity

    for (const agent of this._agents.values()) {
      if (agent.id === excludeId) continue
      const dx = agent.x - x
      const dy = agent.y - y
      const dist = dx * dx + dy * dy
      if (dist < nearestDist) {
        nearest = agent
        nearestDist = dist
      }
    }

    return nearest
  }

  /** Find the nearest agent to another agent */
  findNearestToAgent(agentId: string, excludeId?: string): WorldAgent | null {
    const agent = this._agents.get(agentId)
    if (!agent) return null
    return this.findNearestAgent(agent.x, agent.y, excludeId ?? agent.id)
  }

  // ── Event Bus ─────────────────────────────────────────────

  get bus(): EventBus {
    return this._bus
  }

  emitEvent(
    type: string,
    source: string,
    payload: Record<string, unknown>,
  ): void {
    this._bus.emit({ type, source, payload, t: this._time })
  }

  onEvent(type: string, callback: () => void): void {
    this._bus.on(type, callback)
  }

  offEvent(type: string, callback: () => void): void {
    this._bus.off(type, callback)
  }

  getRecentEvents(fromIndex = 0): BusEvent[] {
    return this._bus.getEvents(fromIndex)
  }

  // ── Simulation step ───────────────────────────────────────

  /**
   * Advance the world by one tick.
   * Updates shared time, notifies agents, emits tick event.
   */
  tick(): void {
    this._step++
    this._time += 16 // ~60 FPS

    this._blackboard.tick = this._step
    this._blackboard.deltaMs = 16
    this._blackboard.totalMs = this._time

    this._bus.emit({
      type: 'world.tick',
      source: 'world',
      payload: { step: this._step, time: this._time },
      t: this._time,
    })
  }

  /**
   * Run the world for a number of steps.
   * Returns the final state snapshot.
   */
  run(steps: number): { time: number; step: number; agents: { id: string; x: number; y: number }[] } {
    for (let i = 0; i < steps; i++) {
      this.tick()
    }
    return this.snapshot()
  }

  /** Take a snapshot of the current world state */
  snapshot(): {
    time: number
    step: number
    agents: { id: string; characterId: string; x: number; y: number; active: boolean }[]
    spatialStats: { totalCells: number; totalPoints: number; avgPerCell: number; maxPerCell: number }
  } {
    return {
      time: this._time,
      step: this._step,
      agents: this.getAgents().map((a) => ({
        id: a.id,
        characterId: a.characterId,
        x: a.x,
        y: a.y,
        active: a.active,
      })),
      spatialStats: this._spatialIndex.getStats(),
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────

  reset(): void {
    this._agents.clear()
    this._time = 0
    this._step = 0
    this._blackboard = createBlackboard(this._config.width, this._config.height)
    this._spatialIndex.clear()
    this._bus.clear()
    this._rng = mulberry32(this._config.seed ?? 42)
  }

  destroy(): void {
    this.reset()
  }
}

// ─── Subscribers (for React / UI integration) ────────────────────

/**
 * Subscribe to world state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToWorld(world: World, callback: () => void): () => void {
  world.bus.on('world.tick', callback)
  world.bus.on('agent.register', callback)
  world.bus.on('agent.unregister', callback)
  return () => {
    world.bus.off('world.tick', callback)
    world.bus.off('agent.register', callback)
    world.bus.off('agent.unregister', callback)
  }
}
