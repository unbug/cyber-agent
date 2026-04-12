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

// ═══════════════════════════════════════════════════════════════
//  ACTIONS — Robot Commands (forwarded to adapter)
// ═══════════════════════════════════════════════════════════════

registerAction('sendCommand', (_bb, adapter, args): NodeStatus => {
  const cmdType = (args?.type as string) ?? 'noop'
  const payload = (args?.payload as Record<string, unknown>) ?? {}
  adapter.sendCommand({ type: cmdType, payload })
  return 'success'
})
