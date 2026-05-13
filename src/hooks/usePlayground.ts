/**
 * usePlayground — manages the multi-agent playground state.
 *
 * Responsibilities:
 *   - World + MultiExecutor lifecycle
 *   - Agent registration/unregistration
 *   - Simulation loop (tick all agents)
 *   - Pause/resume/reset
 *   - Share-link serialization
 *   - Canvas rendering state
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { getCharacter, getBehavior } from '@/agents'
import { hydrate } from '@/engine/executor'
import { World } from '@/engine/world'
import { MultiExecutor } from '@/engine/multi-executor'
import { requireScene, type SceneId } from '@/engine/scenes'
import type { WorldAgent } from '@/engine/world'
import type { RuntimeNode } from '@/engine/types'

// ─── Types ─────────────────────────────────────────────────────

interface PlaygroundAgent {
  agentId: string
  characterId: string
  emoji: string
  worldAgent: WorldAgent
  tree: RuntimeNode
}

interface PlaygroundState {
  sceneId: SceneId
  agents: PlaygroundAgent[]
  paused: boolean
  ghostCharacter: { characterId: string; emoji: string } | null
  ghostPos: { x: number; y: number } | null
  showProximity: boolean
}

const DEFAULT_SCENE: SceneId = 'playground'

function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** Serialize playground state to a URL-friendly string */
function serializeState(state: PlaygroundState): string {
  const data = {
    s: state.sceneId,
    a: state.agents.map((a) => ({ c: a.characterId, x: a.worldAgent.x, y: a.worldAgent.y })),
    p: state.paused,
  }
  const json = JSON.stringify(data)
  try {
    return btoa(unescape(encodeURIComponent(json)))
  } catch {
    return btoa(json)
  }
}

/** Deserialize playground state from a URL string */
function deserializeState(str: string): { sceneId: SceneId; paused: boolean; agents: Array<{ c: string; x: number; y: number }> } | null {
  try {
    const json = decodeURIComponent(escape(atob(str)))
    const data = JSON.parse(json) as { s: string; a: Array<{ c: string; x: number; y: number }>; p?: boolean }
    if (!data.s || !data.a?.length) return null

    // Validate agents exist
    const validAgents = data.a.filter((a) => getCharacter(a.c))
    if (validAgents.length === 0) return null

    return {
      sceneId: data.s as SceneId,
      paused: data.p ?? false,
      agents: validAgents,
    }
  } catch {
    return null
  }
}

// ─── Hook ──────────────────────────────────────────────────────

export function usePlayground() {
  const [state, setState] = useState<PlaygroundState>(() => ({
    sceneId: DEFAULT_SCENE,
    agents: [],
    paused: false,
    ghostCharacter: null,
    ghostPos: null,
    showProximity: false,
  }))

  // Load from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#playground=')) {
      const serialized = hash.slice(12)
      const loaded = deserializeState(serialized)
      if (loaded) {
        // Initialize world with the loaded scene
        const scene = requireScene(loaded.sceneId)
        const world = new World({
          width: scene.bounds.width,
          height: scene.bounds.height,
          cellSize: scene.cellSize ?? 50,
          seed: 42,
        })
        const executor = new MultiExecutor(world)

        // Place agents from serialized state
        const placedAgents: PlaygroundAgent[] = []
        for (const a of loaded.agents) {
          const character = getCharacter(a.c)
          if (!character) continue
          const behavior = getBehavior(a.c)
          if (!behavior) continue

          const agentId = generateAgentId()
          const worldAgent = world.registerAgent(agentId, a.c, a.x, a.y)
          const tree = hydrate(behavior.tree)
          executor.registerAgent(agentId, tree, worldAgent.blackboard)

          placedAgents.push({
            agentId,
            characterId: a.c,
            emoji: character.emoji,
            worldAgent,
            tree,
          })
        }

        worldRef.current = world
        executorRef.current = executor

        setState((prev) => ({
          ...prev,
          sceneId: loaded.sceneId,
          agents: placedAgents,
          paused: loaded.paused,
        }))

        // Clear hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [])

  const worldRef = useRef<World | null>(null)
  const executorRef = useRef<MultiExecutor | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)

  // ── Add agent ──
  const addAgent = useCallback((characterId: string, x: number, y: number) => {
    const world = worldRef.current
    const executor = executorRef.current
    if (!world || !executor) return null

    const character = getCharacter(characterId)
    if (!character) return null

    const behavior = getBehavior(characterId)
    if (!behavior) return null

    // Register agent in world
    const agentId = generateAgentId()
    const worldAgent = world.registerAgent(agentId, characterId, x, y)

    // Hydrate behavior tree
    const tree = hydrate(behavior.tree)

    // Register agent in executor
    executor.registerAgent(agentId, tree, worldAgent.blackboard)

    const playgroundAgent: PlaygroundAgent = {
      agentId,
      characterId,
      emoji: character.emoji,
      worldAgent,
      tree,
    }

    setState((prev) => ({
      ...prev,
      agents: [...prev.agents, playgroundAgent],
    }))

    return playgroundAgent
  }, [])

  // ── Remove agent ──
  const removeAgent = useCallback((agentId: string) => {
    const executor = executorRef.current
    const world = worldRef.current
    if (executor) executor.unregisterAgent(agentId)
    if (world) world.unregisterAgent(agentId)

    setState((prev) => ({
      ...prev,
      agents: prev.agents.filter((a) => a.agentId !== agentId),
    }))
  }, [])

  // ── Simulation loop ──
  useEffect(() => {
    if (state.paused) {
      cancelAnimationFrame(animFrameRef.current)
      return
    }

    let running = true
    const tick = (now: number) => {
      if (!running) return
      animFrameRef.current = requestAnimationFrame(tick)

      const delta = now - lastTickRef.current
      if (delta < 16) return // ~60 FPS cap

      lastTickRef.current = now

      const world = worldRef.current
      const executor = executorRef.current
      if (!world || !executor) return

      // Tick world
      world.tick()

      // Tick all agents
      const results = executor.tickAll()

      // Update world agent positions from blackboard
      for (const result of results) {
        const ctx = executor.getAgent(result.agentId)
        if (ctx?.blackboard) {
          const wa = world.getAgent(result.agentId)
          if (wa) {
            wa.x = ctx.blackboard.x
            wa.y = ctx.blackboard.y
          }
        }
      }

      // Update state for rendering
      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) => {
          const wa = world.getAgent(a.agentId)
          return wa ? { ...a, worldAgent: wa } : a
        }),
      }))
    }

    lastTickRef.current = performance.now()
    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [state.paused])

  // ── Controls ──
  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, paused: !prev.paused }))
  }, [])

  const reset = useCallback(() => {
    // Reset world + executor
    const world = worldRef.current
    const executor = executorRef.current
    if (world) world.reset()
    if (executor) executor.destroy()

    // Clear agents
    setState((prev) => ({
      ...prev,
      agents: [],
      paused: false,
      ghostCharacter: null,
      ghostPos: null,
    }))
  }, [])

  const setScene = useCallback((sceneId: SceneId) => {
    // Reset everything
    const world = worldRef.current
    const executor = executorRef.current
    if (world) world.reset()
    if (executor) executor.destroy()

    setState((prev) => ({
      ...prev,
      sceneId,
      agents: [],
      paused: false,
      ghostCharacter: null,
      ghostPos: null,
    }))
  }, [])

  const share = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#playground=${serializeState(state)}`
    navigator.clipboard?.writeText(url).catch(() => {})
    window.open(url, '_blank')
  }, [state])

  // ── Drag handlers ──
  const handleDragStart = useCallback((character: { id: string; emoji: string }) => {
    setState((prev) => ({
      ...prev,
      ghostCharacter: { characterId: character.id, emoji: character.emoji },
    }))
  }, [])

  const handleCanvasDrop = useCallback((x: number, y: number) => {
    if (!state.ghostCharacter) return

    const character = getCharacter(state.ghostCharacter.characterId)
    if (!character) return

    addAgent(state.ghostCharacter.characterId, x, y)

    setState((prev) => ({
      ...prev,
      ghostCharacter: null,
      ghostPos: null,
    }))
  }, [state.ghostCharacter, addAgent])

  const handleCanvasMove = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      ghostPos: { x, y },
    }))
  }, [])

  const handleCanvasLeave = useCallback(() => {
    setState((prev) => ({
      ...prev,
      ghostPos: null,
    }))
  }, [])

  const toggleProximity = useCallback(() => {
    setState((prev) => ({ ...prev, showProximity: !prev.showProximity }))
  }, [])

  const placedIds = new Set(state.agents.map((a) => a.characterId))

  return {
    state,
    worldRef,
    executorRef,
    addAgent,
    removeAgent,
    togglePause,
    reset,
    setScene,
    share,
    handleDragStart,
    handleCanvasDrop,
    handleCanvasMove,
    handleCanvasLeave,
    toggleProximity,
    placedIds,
  }
}
