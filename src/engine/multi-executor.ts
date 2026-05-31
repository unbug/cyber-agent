/**
 * MultiExecutor — deterministic parallel tick engine for multi-agent.
 *
 * Runs N behavior trees in a fixed, deterministic order each tick.
 * Supports:
 *   - Per-agent BT execution
 *   - Shared world access
 *   - Deterministic RNG (seeded, replay-safe)
 *   - Tick scheduling (all-at-once vs phased)
 *   - Integration with the World's event bus
 */

import type { RuntimeNode, Blackboard } from './types'
import { tick as btTick, resetTree, setAgentContext } from './executor'
import type { World } from './world'
import type { ValEngine } from '../affect/engine'

// ─── Types ───────────────────────────────────────────────────────

/** Agent's BT execution context */
export interface AgentContext {
  /** Agent ID in the world */
  agentId: string
  /** Hydrated behavior tree */
  tree: RuntimeNode
  /** Agent's local blackboard */
  blackboard: Blackboard
  /** Is this agent currently running its BT? */
  active: boolean
  /** Last tick result */
  lastStatus?: 'success' | 'failure' | 'running'
}

/** Scheduling mode for multi-agent ticks */
export type TickSchedule = 'all-at-once' | 'phased'

/** MultiExecutor configuration */
export interface MultiExecutorConfig {
  /** Tick scheduling mode */
  schedule?: TickSchedule
  /** Phased order: array of agent IDs in execution order */
  phaseOrder?: string[]
}

/** Default config */
export const DEFAULT_MULTI_EXECUTOR_CONFIG: MultiExecutorConfig = {
  schedule: 'all-at-once',
}

// ─── MultiExecutor ───────────────────────────────────────────────

export class MultiExecutor {
  private _contexts = new Map<string, AgentContext>()
  private _config: MultiExecutorConfig
  private _world: World
  private _valEngine: ValEngine | null = null
  private _activeAgents = 0

  constructor(world: World, config: Partial<MultiExecutorConfig> = {}) {
    this._world = world
    this._config = { ...DEFAULT_MULTI_EXECUTOR_CONFIG, ...config }
  }

  // ── Config ────────────────────────────────────────────────

  get config(): MultiExecutorConfig {
    return this._config
  }

  setConfig(patch: Partial<MultiExecutorConfig>): void {
    this._config = { ...this._config, ...patch }
  }

  // ── Agent management ──────────────────────────────────────

  registerAgent(
    agentId: string,
    tree: RuntimeNode,
    blackboard: Blackboard,
  ): AgentContext {
    const ctx: AgentContext = {
      agentId,
      tree,
      blackboard,
      active: true,
    }
    this._contexts.set(agentId, ctx)
    this._activeAgents++
    return ctx
  }

  unregisterAgent(agentId: string): void {
    this._contexts.delete(agentId)
    this._activeAgents = Math.max(0, this._activeAgents - 1)
  }

  getAgent(agentId: string): AgentContext | undefined {
    return this._contexts.get(agentId)
  }

  getContexts(): AgentContext[] {
    return Array.from(this._contexts.values())
  }

  getContextCount(): number {
    return this._contexts.size
  }

  getActiveAgentCount(): number {
    return this._activeAgents
  }

  // ── Tick execution ────────────────────────────────────────

  /**
   * Tick all registered agents.
   * Uses the configured scheduling mode.
   * Returns an array of tick results per agent.
   */
  tickAll(): { agentId: string; status: 'success' | 'failure' | 'running' | 'skipped' }[] {
    const results: { agentId: string; status: 'success' | 'failure' | 'running' | 'skipped' }[] = []

    if (this._config.schedule === 'phased' && this._config.phaseOrder) {
      // Phased: execute agents in order
      for (const agentId of this._config.phaseOrder) {
        const ctx = this._contexts.get(agentId)
        if (!ctx || !ctx.active) {
          results.push({ agentId, status: 'skipped' })
          continue
        }
        const status = this._tickAgent(ctx)
        results.push({ agentId, status })
      }
    } else {
      // All-at-once: execute all agents in map iteration order (deterministic)
      for (const [agentId, ctx] of this._contexts) {
        if (!ctx.active) {
          results.push({ agentId, status: 'skipped' })
          continue
        }
        const status = this._tickAgent(ctx)
        results.push({ agentId, status })
      }
    }

    return results
  }

  /**
   * Tick a single agent.
   */
  tickAgent(agentId: string): 'success' | 'failure' | 'running' | 'skipped' {
    const ctx = this._contexts.get(agentId)
    if (!ctx || !ctx.active) return 'skipped'
    return this._tickAgent(ctx)
  }

  /**
   * Tick all active agents.
   */
  tickActive(): { agentId: string; status: 'success' | 'failure' | 'running' }[] {
    const results: { agentId: string; status: 'success' | 'failure' | 'running' }[] = []

    for (const [agentId, ctx] of this._contexts) {
      if (!ctx.active) continue
      const status = this._tickAgent(ctx)
      results.push({ agentId, status })
    }

    return results
  }

  /**
   * Tick one agent and update the world's spatial index.
   */
  private _tickAgent(ctx: AgentContext): 'success' | 'failure' | 'running' {
    // Set agent context for tracer events
    setAgentContext(ctx.agentId)

    // Sync agent position from blackboard to world
    const worldAgent = this._world.getAgent(ctx.agentId)
    if (worldAgent) {
      worldAgent.x = ctx.blackboard.x
      worldAgent.y = ctx.blackboard.y
    }

    // Tick the behavior tree
    const status = btTick(ctx.tree, ctx.blackboard, null as any, this._valEngine)

    // Clear agent context
    setAgentContext(undefined)
    ctx.lastStatus = status

    // Emit action events to the world bus
    if (ctx.blackboard.emotion !== undefined) {
      this._world.emitEvent(
        `agent.emotion.${ctx.blackboard.emotion}`,
        ctx.agentId,
        { emotion: ctx.blackboard.emotion, tick: ctx.blackboard.tick },
      )
    }

    return status
  }

  // ── VAL engine ────────────────────────────────────────────

  setValEngine(valEngine: ValEngine | null | undefined): void {
    this._valEngine = valEngine ?? null
  }

  getValEngine(): ValEngine | null {
    return this._valEngine
  }

  // ── Simulation step ───────────────────────────────────────

  /**
   * Run the multi-agent simulation for N steps.
   * Returns the final world snapshot.
   */
  run(steps: number): ReturnType<World['run']> {
    for (let i = 0; i < steps; i++) {
      this._world.tick()
      this.tickAll()
    }
    return this._world.snapshot()
  }

  // ── Lifecycle ─────────────────────────────────────────────

  reset(): void {
    for (const ctx of this._contexts.values()) {
      resetTree(ctx.tree)
    }
    this._activeAgents = this._contexts.size
  }

  destroy(): void {
    this._contexts.clear()
    this._activeAgents = 0
  }
}
