/**
 * Built-in Actions & Conditions for the Behavior Tree Engine
 *
 * These are the standard building blocks available to all characters.
 * Characters compose these into unique behavior trees.
 */

import { registerAction, registerCondition } from './executor'
import type { Blackboard, NodeStatus } from './types'

// ═══════════════════════════════════════════════════════════════
//  CONDITIONS
// ═══════════════════════════════════════════════════════════════

registerCondition('pointerNearby', (bb, args) => {
  const radius = (args?.radius as number) ?? 80
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  return Math.sqrt(dx * dx + dy * dy) < radius
})

registerCondition('pointerActive', (bb) => bb.pointerActive)

registerCondition('energyAbove', (bb, args) => {
  const threshold = (args?.threshold as number) ?? 0.5
  return bb.energy > threshold
})

registerCondition('energyBelow', (bb, args) => {
  const threshold = (args?.threshold as number) ?? 0.3
  return bb.energy < threshold
})

registerCondition('excitementAbove', (bb, args) => {
  const threshold = (args?.threshold as number) ?? 0.6
  return bb.excitement > threshold
})

registerCondition('nearEdge', (bb, args) => {
  const margin = (args?.margin as number) ?? 30
  return (
    bb.x < margin ||
    bb.x > bb.canvasWidth - margin ||
    bb.y < margin ||
    bb.y > bb.canvasHeight - margin
  )
})

registerCondition('random', (_bb, args) => {
  const chance = (args?.chance as number) ?? 0.5
  return Math.random() < chance
})

registerCondition('emotionIs', (bb, args) => {
  return bb.emotion === (args?.emotion as string)
})

registerCondition('tickModulo', (bb, args) => {
  const mod = (args?.mod as number) ?? 10
  return bb.tick % mod === 0
})

// ═══════════════════════════════════════════════════════════════
// Robotics-specific conditions
// ═══════════════════════════════════════════════════════════════

registerCondition('energyLow', (bb) => bb.energy < 0.3)
registerCondition('energyHigh', (bb) => bb.energy > 0.7)
registerCondition('onRoughTerrain', (_bb, _args) => false)
registerCondition('balanceStable', (bb) => bb.emotion === 'idle')
registerCondition('balanceCritical', (bb) => bb.energy < 0.2)
registerCondition('isAlerted', (bb) => bb.emotion === 'alert')
registerCondition('notAlerted', (bb) => bb.emotion !== 'alert')
registerCondition('shouldMap', (bb) => bb.tick % 50 === 0)
registerCondition('anomalyDetected', (_bb, _args) => false)
registerCondition('positioningComplete', (_bb, _args) => Math.random() > 0.7)

// ═══════════════════════════════════════════════════════════════
//  Additional Conditions (character-specific aliases)
// ═══════════════════════════════════════════════════════════════

registerCondition('excitementHigh', (bb, args) => {
  const threshold = (args?.threshold as number) ?? 0.5
  return bb.excitement > threshold
})

registerCondition('isNear', (bb, args) => {
  const targetX = (args?.x as number) ?? bb.pointerX ?? bb.x
  const targetY = (args?.y as number) ?? bb.pointerY ?? bb.y
  const distance = (args?.distance as number) ?? 60
  const dx = targetX - bb.x
  const dy = targetY - bb.y
  return Math.sqrt(dx * dx + dy * dy) < distance
})

registerCondition('pauseRandomly', (bb) => {
  const pauseEnd = (bb as any)._pauseEnd as number | undefined
  if (!pauseEnd) return false
  return Date.now() >= pauseEnd
})

// ═══════════════════════════════════════════════════════════════
//  Safety conditions (v0.6)
// ═══════════════════════════════════════════════════════════════

/** Returns true when the safety supervisor has NOT triggered an e-stop. */
registerCondition('safetyOk', (bb) => !bb.eStopActive)

/** Returns true when the safety supervisor reports degraded state. */
registerCondition('safetyDegraded', (bb) => bb.safetyState === 'degraded')

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Movement
// ═══════════════════════════════════════════════════════════════

registerAction('moveToPointer', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? bb.speed
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < speed) {
    bb.x = bb.pointerX
    bb.y = bb.pointerY
    return 'success'
  }

  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('wander', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? bb.speed * 0.5

  // Pick a new wander target every N ticks
  if (!bb._wanderTargetX || bb.tick % 60 === 0) {
    const margin = 40
    bb._wanderTargetX = margin + Math.random() * (bb.canvasWidth - margin * 2)
    bb._wanderTargetY = margin + Math.random() * (bb.canvasHeight - margin * 2)
  }

  const tx = bb._wanderTargetX as number
  const ty = bb._wanderTargetY as number
  const dx = tx - bb.x
  const dy = ty - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < speed) {
    bb._wanderTargetX = undefined // pick new target next time
    return 'success'
  }

  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('patrol', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? bb.speed * 0.8
  const margin = 30

  // Patrol waypoints: rectangle around the canvas
  if (!bb._patrolIdx) bb._patrolIdx = 0
  const waypoints = [
    { x: margin, y: margin },
    { x: bb.canvasWidth - margin, y: margin },
    { x: bb.canvasWidth - margin, y: bb.canvasHeight - margin },
    { x: margin, y: bb.canvasHeight - margin },
  ]

  const idx = (bb._patrolIdx as number) % waypoints.length
  const wp = waypoints[idx]!
  const dx = wp.x - bb.x
  const dy = wp.y - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < speed * 2) {
    bb._patrolIdx = idx + 1
    return 'success'
  }

  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('moveToCenter', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? bb.speed * 0.3
  const cx = bb.canvasWidth / 2
  const cy = bb.canvasHeight / 2
  const dx = cx - bb.x
  const dy = cy - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < speed) return 'success'

  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('bounceFromEdge', (bb): NodeStatus => {
  const margin = 20
  let bounced = false

  if (bb.x < margin) { bb.x = margin; bb.rotation = 0; bounced = true }
  if (bb.x > bb.canvasWidth - margin) { bb.x = bb.canvasWidth - margin; bb.rotation = 180; bounced = true }
  if (bb.y < margin) { bb.y = margin; bb.rotation = 90; bounced = true }
  if (bb.y > bb.canvasHeight - margin) { bb.y = bb.canvasHeight - margin; bb.rotation = -90; bounced = true }

  return bounced ? 'success' : 'failure'
})

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Emotion / State
// ═══════════════════════════════════════════════════════════════

registerAction('setEmotion', (bb, _adapter, args): NodeStatus => {
  bb.emotion = (args?.emotion as Blackboard['emotion']) ?? 'idle'
  return 'success'
})

registerAction('drainEnergy', (bb, _adapter, args): NodeStatus => {
  const rate = (args?.rate as number) ?? 0.001
  bb.energy = Math.max(0, bb.energy - rate)
  return 'success'
})

registerAction('restoreEnergy', (bb, _adapter, args): NodeStatus => {
  const rate = (args?.rate as number) ?? 0.005
  bb.energy = Math.min(1, bb.energy + rate)
  return bb.energy >= 1 ? 'success' : 'running'
})

registerAction('increaseExcitement', (bb, _adapter, args): NodeStatus => {
  const amount = (args?.amount as number) ?? 0.1
  bb.excitement = Math.min(1, bb.excitement + amount)
  return 'success'
})

registerAction('decayExcitement', (bb): NodeStatus => {
  bb.excitement = Math.max(0, bb.excitement * 0.98)
  return 'success'
})

registerAction('idle', (): NodeStatus => {
  // Do nothing — useful as a placeholder or rest action
  return 'success'
})

registerAction('stayStill', (bb, _adapter, args): NodeStatus => {
  const duration = (args?.duration as number) ?? 1000
  const tickIntervalMs = (bb as any).tickIntervalMs ?? 50
  const elapsed = bb.tick * tickIntervalMs
  if (elapsed >= duration) {
    delete (bb as any)._stayStillStart
    return 'success'
  }
  if (!(bb as any)._stayStillStart) (bb as any)._stayStillStart = elapsed
  return 'running'
})

registerAction('erraticMove', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? (bb.speed as number) ?? 2
  const jitter = (args?.jitter as number) ?? 0.3
  const target = args?.target as string | undefined

  let dx: number, dy: number
  if (target === 'pointer') {
    dx = bb.pointerX - bb.x
    dy = bb.pointerY - bb.y
  } else {
    // Erratic random target
    const margin = 30
    const tx = margin + Math.random() * (bb.canvasWidth - margin * 2)
    const ty = margin + Math.random() * (bb.canvasHeight - margin * 2)
    dx = tx - bb.x + (Math.random() - 0.5) * jitter * 100
    dy = ty - bb.y + (Math.random() - 0.5) * jitter * 100
  }

  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < speed) {
    bb.x += (dx / dist) * speed + (Math.random() - 0.5) * jitter * 20
    bb.y += (dy / dist) * speed + (Math.random() - 0.5) * jitter * 20
    return 'success'
  }
  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('moveAwayFromPointer', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? bb.speed
  const dx = bb.x - bb.pointerX
  const dy = bb.y - bb.pointerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < speed) return 'success'
  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('pauseRandomly', (bb, _adapter, args): NodeStatus => {
  const minMs = (args?.minMs as number) ?? 1000
  const maxMs = (args?.maxMs as number) ?? 3000
  const pauseEnd = (bb as any)._pauseEnd as number | undefined
  if (!pauseEnd) {
    (bb as any)._pauseEnd = Date.now() + minMs + Math.random() * (maxMs - minMs)
  }
  return Date.now() >= ((bb as any)._pauseEnd as number) ? 'success' : 'running'
})

// ═══════════════════════════════════════════════════════════════
// Robotics-specific Actions (heartbeat, balance, terrain adaptation)
// ═══════════════════════════════════════════════════════════

registerAction('heartbeat', (_bb, _adapter, _args): NodeStatus => {
  // Simulates heartbeat/sensor update — always succeeds
  return 'success'
})

registerAction('followWithBalanceCheck', (bb, _adapter, _args): NodeStatus => {
  // Follow action with balance check — safe follow for quadrupeds
  const speed = (_args?.speed as number) ?? (bb.speed * 0.5)
  if (bb.energy < 0.2) return 'failure' // Don't follow if critically low
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < speed) {
    bb.x = bb.pointerX
    bb.y = bb.pointerY
    return 'success'
  }
  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return 'running'
})

registerAction('adaptToTerrain', (_bb, _adapter, _args): NodeStatus => {
  // Simulates terrain adaptation — adjusts speed based on roughness
  // Always succeeds in simulation (real robots would query sensors)
  return 'success'
})

registerAction('walkOnTerrain', (_bb, _adapter, _args): NodeStatus => {
  // Simulates terrain-aware walking for scouting/mapping
  // Adjusts gait based on simulation of terrain type
  return 'running'
})

// ══════════════════════════════════════════════════════════════════
//  Actions — Robot Commands (forwarded to adapter)
// ═══════════════════════════════════════════════════════════════════

registerAction('sendCommand', (_bb, adapter, args): NodeStatus => {
  const cmdType = (args?.type as string) ?? 'noop'
  const payload = (args?.payload as Record<string, unknown>) ?? {}
  adapter.sendCommand({ type: cmdType, payload })
  return 'success'
})

// ════════════════════════════════════════════════════════════════════
//  ACTIONS — Enhanced Movement (spiral, patrol with randomization)
// ═════════════════════════════════════════════════════════════════════

registerAction('spiralInward', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? (bb.speed ?? 2)
  const cx = bb.canvasWidth / 2
  const cy = bb.canvasHeight / 2
  const dx = cx - bb.x
  const dy = cy - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) + (bb.tick * 0.1)
  // Spiral: combine radial movement with rotation
  const spiralX = Math.cos(angle) * speed
  const spiralY = Math.sin(angle) * speed
  bb.x += spiralX
  bb.y += spiralY
  bb.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  return dist < speed * 3 ? 'success' : 'running'
})

registerAction('orbit', (bb, _adapter, args): NodeStatus => {
  const speed = (args?.speed as number) ?? (bb.speed ?? 2)
  const cx = (args?.centerX as number) ?? bb.canvasWidth / 2
  const cy = (args?.centerY as number) ?? bb.canvasHeight / 2
  const prevRadius = (bb as any).orbitRadius as number | undefined
  const prevAngle = (bb as any).orbitAngle as number | undefined
  let radius = prevRadius ?? (args?.radius as number) ?? 60
  let angle = prevAngle ?? Math.atan2(bb.y - cy, bb.x - cx)
  angle += speed / radius
  ;(bb as any).orbitRadius = radius
  ;(bb as any).orbitAngle = angle
  bb.x = cx + Math.cos(angle) * radius
  bb.y = cy + Math.sin(angle) * radius
  bb.rotation = (angle * 180) / Math.PI
  return 'running'
})

// ═══════════════════════════════════════════════════════════════════════════
//  ACTIONS — Sound & Response
// ═══════════════════════════════════════════════════════════════════════════

registerAction('speakPhrase', (_bb, adapter, args): NodeStatus => {
  const phrase = (args?.text as string) ?? 'hello'
  adapter.sendCommand({ type: 'speak', payload: { text: phrase } })
  return 'success'
})

registerAction('playSound', (_bb, adapter, args): NodeStatus => {
  const freq = (args?.frequency as number) ?? 440
  const dur = (args?.duration as number) ?? 500
  adapter.sendCommand({ type: 'sound', payload: { frequency: freq, duration: dur } })
  return 'success'
})

registerAction('flashLED', (_bb, adapter, args): NodeStatus => {
  const _color = (args?.color as string) ?? '#ffffff'
  adapter.sendCommand({ type: 'led', payload: { r: parseInt(_color.slice(1, 3), 16), g: parseInt(_color.slice(3, 5), 16), b: parseInt(_color.slice(5, 7), 16) } })
  return 'success'
})

// ════════════════════════════════════════════════════════════════════
//  ACTIONS — Emotion & State (extended)
// ═════════════════════════════════════════════════════════════════════

registerAction('randomEmotion', (bb): NodeStatus => {
  const emotions: NonNullable<Blackboard['emotion']>[] = ['happy', 'curious', 'playful', 'alert', 'idle']
  const e = emotions[Math.floor(Math.random() * emotions.length)] ?? 'idle'
  bb.emotion = e
  return 'success'
})

registerAction('setExcitement', (bb, _adapter, args): NodeStatus => {
  const target = (args?.level as number) ?? 0
  bb.excitement = Math.max(0, Math.min(1, target))
  return 'success'
})

// ════════════════════════════════════════════════════════════════════
//  CONDITIONS — Extended (spatial, temporal, state-based)
// ════════════════════════════════════════════════════════════════════

registerCondition('pointerFarAway', (bb, args) => {
  const radius = (args?.radius as number) ?? 80
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  return Math.sqrt(dx * dx + dy * dy) > radius
})

registerCondition('energyEqual', (bb, args) => {
  const value = (args?.value as number) ?? 0.5
  return Math.abs(bb.energy - value) < 0.01
})

registerCondition('emotionNot', (bb, args) => {
  return bb.emotion !== (args?.emotion as string)
})

registerCondition('excitementBelow', (bb, args) => {
  const threshold = (args?.threshold as number) ?? 0.3
  return bb.excitement < threshold
})

registerCondition('atEdge', (bb, args) => {
  const margin = (args?.margin as number) ?? 30
  return (
    bb.x <= margin ||
    bb.x >= bb.canvasWidth - margin ||
    bb.y <= margin ||
    bb.y >= bb.canvasHeight - margin
  )
})

registerCondition('atCenter', (bb, args) => {
  const tolerance = (args?.tolerance as number) ?? 30
  const cx = bb.canvasWidth / 2
  const cy = bb.canvasHeight / 2
  const dx = bb.x - cx
  const dy = bb.y - cy
  return Math.sqrt(dx * dx + dy * dy) < tolerance
})

registerCondition('notNearEdge', (bb, args) => {
  const margin = (args?.margin as number) ?? 30
  return (
    bb.x > margin &&
    bb.x < bb.canvasWidth - margin &&
    bb.y > margin &&
    bb.y < bb.canvasHeight - margin
  )
})
