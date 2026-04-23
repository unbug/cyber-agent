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
}

// Auto-register on import
registerBuiltins()
