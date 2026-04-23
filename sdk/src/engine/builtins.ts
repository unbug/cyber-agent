/**
 * CyberAgent SDK — Built-in Actions and Conditions
 *
 * These are the default actions and conditions registered with the
 * behavior tree engine. Characters can override or extend these.
 */

import { registerAction, registerCondition } from './executor'
import type { Blackboard, RobotAdapter, NodeStatus } from '../types'

// ─── Built-in Actions ─────────────────────────────────────────

function moveForward(bb: Blackboard, _adapter: RobotAdapter): NodeStatus {
  const rad = (bb.rotation * Math.PI) / 180
  bb.x += Math.cos(rad) * bb.speed
  bb.y += Math.sin(rad) * bb.speed
  return 'success'
}

function moveBackward(bb: Blackboard, _adapter: RobotAdapter): NodeStatus {
  const rad = (bb.rotation * Math.PI) / 180
  bb.x -= Math.cos(rad) * bb.speed
  bb.y -= Math.sin(rad) * bb.speed
  return 'success'
}

function turnLeft(bb: Blackboard, _adapter: RobotAdapter): NodeStatus {
  bb.rotation = (bb.rotation - 30 + 360) % 360
  return 'success'
}

function turnRight(bb: Blackboard, _adapter: RobotAdapter): NodeStatus {
  bb.rotation = (bb.rotation + 30 + 360) % 360
  return 'success'
}

function moveToPointer(bb: Blackboard, _adapter: RobotAdapter): NodeStatus {
  if (!bb.pointerActive) return 'failure'
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 5) return 'success'
  bb.rotation = (Math.atan2(dy, dx) * 180) / Math.PI
  bb.x += (dx / dist) * bb.speed
  bb.y += (dy / dist) * bb.speed
  return 'success'
}

function idle(bb: Blackboard, _adapter: RobotAdapter): NodeStatus {
  // No-op: agent stays still
  return 'success'
}

function setEmotion(bb: Blackboard, _adapter: RobotAdapter, args?: Record<string, unknown>): NodeStatus {
  const emotion = args?.emotion as string
  if (emotion) {
    bb.emotion = emotion as Blackboard['emotion']
  }
  return 'success'
}

// ─── Enhanced Actions ────────────────────────────────────────

function chargeAt(bb: Blackboard, _adapter: RobotAdapter, args?: Record<string, unknown>): NodeStatus {
  if (!bb.pointerActive) return 'failure'
  const speed = (args?.speed as number) ?? bb.speed * 3
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < speed) return 'success'
  bb.rotation = (Math.atan2(dy, dx) * 180) / Math.PI
  bb.x += (dx / dist) * speed
  bb.y += (dy / dist) * speed
  return 'running'
}

function retreat(bb: Blackboard, _adapter: RobotAdapter, args?: Record<string, unknown>): NodeStatus {
  const speed = (args?.speed as number) ?? bb.speed * 0.5
  const rad = (bb.rotation * Math.PI) / 180
  bb.x -= Math.cos(rad) * speed
  bb.y -= Math.sin(rad) * speed
  return 'success'
}

function circle(bb: Blackboard, _adapter: RobotAdapter, args?: Record<string, unknown>): NodeStatus {
  const cx = (args?.centerX as number) ?? bb.canvasWidth / 2
  const cy = (args?.centerY as number) ?? bb.canvasHeight / 2
  const radius = (args?.radius as number) ?? 60
  const speed = (args?.speed as number) ?? bb.speed
  const prevAngle = (bb as any)._circleAngle as number | undefined
  let angle = prevAngle ?? Math.atan2(bb.y - cy, bb.x - cx)
  angle += speed / radius
  ;(bb as any)._circleAngle = angle
  bb.x = cx + Math.cos(angle) * radius
  bb.y = cy + Math.sin(angle) * radius
  bb.rotation = (angle * 180) / Math.PI
  return 'running'
}

function zigzag(bb: Blackboard, _adapter: RobotAdapter, args?: Record<string, unknown>): NodeStatus {
  const speed = (args?.speed as number) ?? bb.speed
  const amplitude = (args?.amplitude as number) ?? 20
  const period = (args?.period as number) ?? 30
  const baseAngle = (bb as any)._zigzagAngle as number | undefined
  let angle = baseAngle ?? (Math.random() * 360)
  if (!baseAngle) (bb as any)._zigzagAngle = angle
  const offset = Math.sin((bb.tick ?? 0) / period * Math.PI * 2) * amplitude
  const rad = ((angle + offset) * Math.PI) / 180
  bb.x += Math.cos(rad) * speed
  bb.y += Math.sin(rad) * speed
  bb.rotation = angle
  return 'running'
}

function pulse(bb: Blackboard, _adapter: RobotAdapter, args?: Record<string, unknown>): NodeStatus {
  const intensity = (args?.intensity as number) ?? 1
  const duration = (args?.duration as number) ?? 500
  const totalTicks = (args?.totalTicks as number) ?? 60
  const current = (bb as any)._pulseCount as number ?? 0
  if (current >= totalTicks) {
    delete (bb as any)._pulseCount
    return 'success'
  }
  ;(bb as any)._pulseCount = current + 1
  return 'running'
}

// ─── Built-in Conditions ──────────────────────────────────────

function atBoundary(bb: Blackboard): boolean {
  return (
    bb.x < 0 ||
    bb.x > bb.canvasWidth ||
    bb.y < 0 ||
    bb.y > bb.canvasHeight
  )
}

function isPointerActive(bb: Blackboard): boolean {
  return bb.pointerActive
}

function hasLowEnergy(bb: Blackboard): boolean {
  return bb.energy < 0.2
}

function isNear(bb: Blackboard, args?: Record<string, unknown>): boolean {
  const targetX = args?.x as number ?? 0
  const targetY = args?.y as number ?? 0
  const threshold = (args?.threshold as number) ?? 50
  const dx = bb.x - targetX
  const dy = bb.y - targetY
  return Math.sqrt(dx * dx + dy * dy) < threshold
}

// ─── Enhanced Conditions ─────────────────────────────────────

function energyAt(bb: Blackboard, args?: Record<string, unknown>): boolean {
  const target = (args?.value as number) ?? 0.5
  const tolerance = (args?.tolerance as number) ?? 0.01
  return Math.abs(bb.energy - target) < tolerance
}

function excitementAt(bb: Blackboard, args?: Record<string, unknown>): boolean {
  const target = (args?.value as number) ?? 0.5
  const tolerance = (args?.tolerance as number) ?? 0.01
  return Math.abs(bb.excitement - target) < tolerance
}

function pointerFarAway(bb: Blackboard, args?: Record<string, unknown>): boolean {
  const radius = (args?.radius as number) ?? 80
  const dx = bb.pointerX - bb.x
  const dy = bb.pointerY - bb.y
  return Math.sqrt(dx * dx + dy * dy) > radius
}

function atCenter(bb: Blackboard, args?: Record<string, unknown>): boolean {
  const tolerance = (args?.tolerance as number) ?? 30
  const cx = bb.canvasWidth / 2
  const cy = bb.canvasHeight / 2
  const dx = bb.x - cx
  const dy = bb.y - cy
  return Math.sqrt(dx * dx + dy * dy) < tolerance
}

// ─── Register all builtins ────────────────────────────────────

export function registerBuiltins() {
  // Actions
  registerAction('moveForward', moveForward)
  registerAction('moveBackward', moveBackward)
  registerAction('turnLeft', turnLeft)
  registerAction('turnRight', turnRight)
  registerAction('moveToPointer', moveToPointer)
  registerAction('idle', idle)
  registerAction('setEmotion', setEmotion)

  // Conditions
  registerCondition('atBoundary', atBoundary)
  registerCondition('isPointerActive', isPointerActive)
  registerCondition('hasLowEnergy', hasLowEnergy)
  registerCondition('isNear', isNear)
  registerCondition('energyAt', energyAt)
  registerCondition('excitementAt', excitementAt)
  registerCondition('pointerFarAway', pointerFarAway)
  registerCondition('atCenter', atCenter)

  // Actions
  registerAction('chargeAt', chargeAt)
  registerAction('retreat', retreat)
  registerAction('circle', circle)
  registerAction('zigzag', zigzag)
  registerAction('pulse', pulse)
}

// Auto-register on import
registerBuiltins()
