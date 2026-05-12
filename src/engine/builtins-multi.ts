/**
 * Multi-agent Social BT Primitives
 *
 * BT conditions and actions that operate across the shared World
 * to enable inter-agent perception and interaction.
 */

import { registerAction, registerCondition } from './executor'
import { emitSocialEvent } from './tracer'

// ─── Helpers ────────────────────────────────────────────────────

function getWorld(bb: any): any {
  const w = bb.world
  if (!w || typeof w.findNearestAgent !== 'function') return null
  return w
}

function findTarget(bb: any, targetId: string): { x: number; y: number } | null {
  if (bb._targetId === targetId) {
    return { x: bb._targetX ?? bb.x, y: bb._targetY ?? bb.y }
  }
  const targets = bb._targets as Map<string, { x: number; y: number }> | undefined
  if (targets?.has(targetId)) return targets.get(targetId)!
  return null
}

// ─── Conditions ─────────────────────────────────────────────────

registerCondition('isCloseTo', (bb, args) => {
  const a = bb as any
  const world = getWorld(a)
  if (!world) return false

  const distance = (args?.distance as number) ?? 80
  const targetId = (args?.targetId as string) ?? undefined
  const target = targetId
    ? findTarget(a, targetId)
    : world.findNearestAgent(a.x, a.y)

  if (!target) return false

  const dx = target.x - a.x
  const dy = target.y - a.y
  return dx * dx + dy * dy <= distance * distance
})

registerCondition('isFarFrom', (bb, args) => {
  const a = bb as any
  const world = getWorld(a)
  if (!world) return false

  const distance = (args?.distance as number) ?? 80
  const targetId = (args?.targetId as string) ?? undefined
  const target = targetId
    ? findTarget(a, targetId)
    : world.findNearestAgent(a.x, a.y)

  if (!target) return true

  const dx = target.x - a.x
  const dy = target.y - a.y
  return dx * dx + dy * dy > distance * distance
})

registerCondition('agentHasSignal', (bb, args) => {
  const a = bb as any
  const topic = (args?.topic as string) ?? ''
  const maxAge = (args?.maxAge as number) ?? 30
  const signals = a._signals as Array<{ topic: string; tick: number }> | undefined
  if (!signals) return false

  for (let i = signals.length - 1; i >= 0; i--) {
    const s = signals[i]!
    if (s.topic === topic && a.tick - s.tick <= maxAge) {
      return true
    }
    if (a.tick - s.tick > maxAge) break
  }
  return false
})

registerCondition('agentHasEmotion', (bb, args) => {
  const a = bb as any
  const targetId = (args?.targetId as string) ?? undefined
  const emotion = (args?.emotion as string) ?? undefined
  if (!targetId || !emotion) return false

  const targets = a._targets as Map<string, any> | undefined
  if (!targets?.has(targetId)) return false
  const target = targets.get(targetId)
  return target.emotion === emotion || target.emotion === 'happy'
})

registerCondition('agentIsAlert', (bb, _args) => {
  const a = bb as any
  const world = getWorld(a)
  if (!world) return false

  const neighbors = world.findAgentNeighbors(a.id ?? 'unknown')
  for (const n of neighbors) {
    const agent = world.agents.get(n.id)
    if (agent && agent.blackboard?.emotion === 'alert') {
      return true
    }
  }
  return false
})

// ─── Actions ────────────────────────────────────────────────────

registerAction('findNearestAgent', (bb, _adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const world = getWorld(a)
  if (!world) return 'failure'

  const maxRadius = (args?.maxRadius as number) ?? 200
  const tx = (args?.x as number) ?? a.x
  const ty = (args?.y as number) ?? a.y

  const nearest = world.findNearestAgent(tx, ty)
  if (!nearest) {
    a._targetId = null
    a._targetX = a.x
    a._targetY = a.y
    a._targetDist = Infinity
    return 'failure'
  }

  const dx = nearest.x - tx
  const dy = nearest.y - ty
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > maxRadius) {
    a._targetId = null
    a._targetX = a.x
    a._targetY = a.y
    a._targetDist = Infinity
    return 'failure'
  }

  a._targetId = nearest.id
  a._targetX = nearest.x
  a._targetY = nearest.y
  a._targetDist = dist
  return 'success'
})

registerAction('greet', (bb, adapter, _args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const targetId = a._targetId as string | undefined
  if (!targetId) return 'failure'

  const target = findTarget(a, targetId)
  if (!target) return 'failure'

  const spd = (_args?.speed as number) ?? a.speed ?? 5
  const dx = target.x - a.x
  const dy = target.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < spd) {
    const world = getWorld(a)
    if (world) {
      world.emitEvent('agent.greet', a.id ?? 'unknown', {
        targetId,
        tick: a.tick,
      })
    }
    if (a._targets?.has(targetId)) {
      const targetBB = a._targets.get(targetId)
      targetBB._receivedGreet = true
    }
    emitSocialEvent({
      type: 'greet',
      source: a.id ?? 'unknown',
      target: targetId,
      payload: { tick: a.tick },
      timestamp: a.totalMs,
    })
    return 'success'
  }

  a.x += (dx / dist) * spd
  a.y += (dy / dist) * spd
  a.rotation = Math.atan2(dy, dx) * (180 / Math.PI)

  if (adapter) {
    adapter.sendCommand({ type: 'move', payload: { x: a.x, y: a.y } })
  }
  return 'running'
})

registerAction('follow', (bb, adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const targetId = a._targetId as string | undefined
  if (!targetId) return 'failure'

  const target = findTarget(a, targetId)
  if (!target) return 'failure'

  const spd = (args?.speed as number) ?? a.speed ?? 5
  const keepDistance = (args?.keepDistance as number) ?? 60
  const dx = target.x - a.x
  const dy = target.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist <= keepDistance) return 'success'

  a.x += (dx / dist) * spd
  a.y += (dy / dist) * spd
  a.rotation = Math.atan2(dy, dx) * (180 / Math.PI)

  if (adapter) {
    adapter.sendCommand({ type: 'move', payload: { x: a.x, y: a.y } })
  }
  return 'running'
})

registerAction('flee', (bb, adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const targetId = a._targetId as string | undefined
  if (!targetId) return 'failure'

  const target = findTarget(a, targetId)
  if (!target) return 'failure'

  const spd = (args?.speed as number) ?? a.speed * 1.5
  const fleeDistance = (args?.fleeDistance as number) ?? 150
  const dx = a.x - target.x
  const dy = a.y - target.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist >= fleeDistance) return 'success'

  a.x += (dx / dist) * spd
  a.y += (dy / dist) * spd
  a.rotation = Math.atan2(dy, dx) * (180 / Math.PI)

  const world = getWorld(a)
  if (world) {
    a.x = Math.max(10, Math.min(world.config.width - 10, a.x))
    a.y = Math.max(10, Math.min(world.config.height - 10, a.y))
  }

  if (adapter) {
    adapter.sendCommand({ type: 'move', payload: { x: a.x, y: a.y } })
  }
  return 'running'
})

registerAction('broadcastEmotion', (bb, _adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const world = getWorld(a)
  if (!world) return 'failure'

  const emotion = (args?.emotion as string) ?? a.emotion
  const radius = (args?.radius as number) ?? 200

  world.emitEvent('agent.emotion.broadcast', a.id ?? 'unknown', {
    emotion,
    radius,
    x: a.x,
    y: a.y,
    tick: a.tick,
  })

  a._lastBroadcast = { emotion, tick: a.tick }
  emitSocialEvent({
    type: 'broadcast',
    source: a.id ?? 'unknown',
    payload: { emotion, radius },
    timestamp: a.totalMs,
  })
  return 'success'
})

registerAction('onSignal', (bb, _adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const topic = (args?.topic as string) ?? ''
  const signals = a._signals as Array<{ topic: string; payload: Record<string, unknown>; tick: number }> | undefined
  if (!signals || signals.length === 0) return 'failure'

  let idx = -1
  for (let i = 0; i < signals.length; i++) {
    if (signals[i]!.topic === topic) {
      idx = i
      break
    }
  }

  if (idx === -1) return 'failure'

  const signal = signals.splice(idx, 1)[0]!
  a._signalPayload = signal.payload
  a._signalTick = signal.tick
  return 'success'
})

registerAction('emitSignal', (bb, _adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const world = getWorld(a)
  if (!world) return 'failure'

  const topic = (args?.topic as string) ?? 'default'
  const payload = (args?.payload as Record<string, unknown>) ?? {}

  world.emitEvent(`agent.signal.${topic}`, a.id ?? 'unknown', {
    ...payload,
    tick: a.tick,
  })

  a._lastSignal = { topic, payload, tick: a.tick }
  emitSocialEvent({
    type: 'signal',
    source: a.id ?? 'unknown',
    payload: { topic, ...payload },
    timestamp: a.totalMs,
  })
  return 'success'
})

registerAction('mirror', (bb, _adapter, _args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const targetId = a._targetId as string | undefined
  if (!targetId) return 'failure'

  const targets = a._targets as Map<string, any> | undefined
  const target = targets?.get(targetId)
  const mirroredEmotion = target?.emotion ?? 'happy'

  a.emotion = mirroredEmotion

  const world = getWorld(a)
  if (world) {
    world.emitEvent('agent.mirror', a.id ?? 'unknown', {
      targetId,
      mirroredEmotion,
      tick: a.tick,
    })
  }
  emitSocialEvent({
    type: 'mirror',
    source: a.id ?? 'unknown',
    target: targetId,
    payload: { mirroredEmotion },
    timestamp: a.totalMs,
  })
  return 'success'
})

registerAction('roleSwap', (bb, _adapter, _args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const targetId = a._targetId as string | undefined
  if (!targetId) return 'failure'

  const world = getWorld(a)
  if (!world) return 'failure'

  world.emitEvent('agent.roleSwap.propose', a.id ?? 'unknown', {
    targetId,
    tick: a.tick,
  })

  a._roleSwapTarget = targetId
  a._roleSwapPending = true

  world.emitEvent('agent.roleSwap.request', targetId, {
    proposerId: a.id,
    tick: a.tick,
  })

  emitSocialEvent({
    type: 'roleSwap',
    source: a.id ?? 'unknown',
    target: targetId,
    payload: { tick: a.tick },
    timestamp: a.totalMs,
  })
  return 'success'
})

registerAction('negotiate', (bb, _adapter, args): 'success' | 'failure' | 'running' => {
  const a = bb as any
  const targetId = a._targetId as string | undefined
  if (!targetId) return 'failure'

  const world = getWorld(a)
  if (!world) return 'failure'

  const phase = (args?.phase as string) ?? 'propose'

  if (phase === 'propose') {
    world.emitEvent('agent.negotiate.propose', a.id ?? 'unknown', {
      targetId,
      tick: a.tick,
    })
    emitSocialEvent({
      type: 'negotiate',
      source: a.id ?? 'unknown',
      target: targetId,
      payload: { phase: 'propose' },
      timestamp: a.totalMs,
    })
    a._negotiatePhase = 'waiting'
    return 'running'
  }

  if (phase === 'accept') {
    world.emitEvent('agent.negotiate.accept', a.id ?? 'unknown', {
      targetId,
      tick: a.tick,
    })
    emitSocialEvent({
      type: 'negotiate',
      source: a.id ?? 'unknown',
      target: targetId,
      payload: { phase: 'accept' },
      timestamp: a.totalMs,
    })
    a._negotiatePhase = 'complete'
    return 'success'
  }

  if (phase === 'reject') {
    world.emitEvent('agent.negotiate.reject', a.id ?? 'unknown', {
      targetId,
      tick: a.tick,
    })
    emitSocialEvent({
      type: 'negotiate',
      source: a.id ?? 'unknown',
      target: targetId,
      payload: { phase: 'reject' },
      timestamp: a.totalMs,
    })
    a._negotiatePhase = 'failed'
    return 'failure'
  }

  return 'failure'
})

// ─── Export ─────────────────────────────────────────────────────

export const SOCIAL_BUILTINS = {
  conditions: [
    'isCloseTo',
    'isFarFrom',
    'agentHasSignal',
    'agentHasEmotion',
    'agentIsAlert',
  ],
  actions: [
    'findNearestAgent',
    'greet',
    'follow',
    'flee',
    'broadcastEmotion',
    'onSignal',
    'emitSignal',
    'mirror',
    'roleSwap',
    'negotiate',
  ],
} as const
