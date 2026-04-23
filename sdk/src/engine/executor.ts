/**
 * CyberAgent SDK — Behavior Tree Executor
 *
 * Hydrates a BehaviorNodeDef tree into RuntimeNodes, then ticks
 * through the tree each frame applying standard BT semantics.
 */

import type {
  BehaviorNodeDef,
  RuntimeNode,
  NodeStatus,
  Blackboard,
  RobotAdapter,
  ActionFn,
  ConditionFn,
} from '../types'

// ─── Built-in Action & Condition Registries ───────────────────

const actionRegistry = new Map<string, ActionFn>()
const conditionRegistry = new Map<string, ConditionFn>()

export function registerAction(name: string, fn: ActionFn) {
  actionRegistry.set(name, fn)
}

export function registerCondition(name: string, fn: ConditionFn) {
  conditionRegistry.set(name, fn)
}

// ─── Hydrate: Def → RuntimeNode ──────────────────────────────

export function hydrate(def: BehaviorNodeDef): RuntimeNode {
  const children: RuntimeNode[] = []

  if ('children' in def && Array.isArray(def.children)) {
    for (const childDef of def.children) {
      children.push(hydrate(childDef))
    }
  }
  if ('child' in def && def.child) {
    children.push(hydrate(def.child))
  }

  return { def, status: 'idle', state: {}, children }
}

// ─── Reset all nodes to idle ─────────────────────────────────

export function resetTree(node: RuntimeNode) {
  node.status = 'idle'
  node.state = {}
  for (const child of node.children) {
    resetTree(child)
  }
}

// ─── Tick: evaluate one frame ─────────────────────────────────

export function tick(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  const { def } = node

  switch (def.type) {
    case 'sequence':
      return tickSequence(node, bb, adapter)
    case 'selector':
      return tickSelector(node, bb, adapter)
    case 'parallel':
      return tickParallel(node, bb, adapter)
    case 'inverter':
      return tickInverter(node, bb, adapter)
    case 'repeater':
      return tickRepeater(node, bb, adapter)
    case 'cooldown':
      return tickCooldown(node, bb, adapter)
    case 'condition':
      return tickCondition(node, bb)
    case 'action':
      return tickAction(node, bb, adapter)
    case 'wait':
      return tickWait(node, bb)
    default:
      return 'failure'
  }
}

// ─── Composite: Sequence ──────────────────────────────────────
// Runs children left→right. Fails on first failure. Succeeds when all succeed.

function tickSequence(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  for (const child of node.children) {
    const result = tick(child, bb, adapter)
    if (result === 'running' || result === 'failure') {
      node.status = result
      return result
    }
  }
  node.status = 'success'
  return 'success'
}

// ─── Composite: Selector ──────────────────────────────────────
// Runs children left→right. Succeeds on first success. Fails when all fail.

function tickSelector(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  for (const child of node.children) {
    const result = tick(child, bb, adapter)
    if (result === 'running' || result === 'success') {
      node.status = result
      return result
    }
  }
  node.status = 'failure'
  return 'failure'
}

// ─── Composite: Parallel ──────────────────────────────────────
// Ticks ALL children every frame. Succeeds when threshold met.

function tickParallel(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  const threshold =
    (node.def as { successThreshold?: number }).successThreshold ??
    node.children.length
  let successes = 0
  let failures = 0

  for (const child of node.children) {
    const result = tick(child, bb, adapter)
    if (result === 'success') successes++
    if (result === 'failure') failures++
  }

  if (successes >= threshold) {
    node.status = 'success'
    return 'success'
  }
  if (failures > node.children.length - threshold) {
    node.status = 'failure'
    return 'failure'
  }
  node.status = 'running'
  return 'running'
}

// ─── Decorator: Inverter ──────────────────────────────────────

function tickInverter(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  const result = tick(node.children[0]!, bb, adapter)
  if (result === 'success') {
    node.status = 'failure'
    return 'failure'
  }
  if (result === 'failure') {
    node.status = 'success'
    return 'success'
  }
  node.status = 'running'
  return 'running'
}

// ─── Decorator: Repeater ──────────────────────────────────────

function tickRepeater(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  const count = (node.def as { count: number }).count
  const current = (node.state.iteration as number) ?? 0

  if (count !== -1 && current >= count) {
    node.status = 'success'
    return 'success'
  }

  const result = tick(node.children[0]!, bb, adapter)
  if (result === 'running') {
    node.status = 'running'
    return 'running'
  }

  // Child finished — increment and keep going
  node.state.iteration = current + 1
  resetTree(node.children[0]!)

  if (count !== -1 && current + 1 >= count) {
    node.status = 'success'
    return 'success'
  }
  node.status = 'running'
  return 'running'
}

// ─── Decorator: Cooldown ──────────────────────────────────────

function tickCooldown(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  const durationMs = (node.def as { durationMs: number }).durationMs
  const lastRun = (node.state.lastRunAt as number) ?? 0
  const now = bb.totalMs

  if (now - lastRun < durationMs) {
    node.status = 'failure'
    return 'failure'
  }

  const result = tick(node.children[0]!, bb, adapter)
  if (result === 'success' || result === 'failure') {
    node.state.lastRunAt = now
  }
  node.status = result
  return result
}

// ─── Leaf: Condition ──────────────────────────────────────────

function tickCondition(node: RuntimeNode, bb: Blackboard): NodeStatus {
  const def = node.def as { check: string; args?: Record<string, unknown> }
  const fn = conditionRegistry.get(def.check)
  if (!fn) {
    console.warn(`[BT] Unknown condition: ${def.check}`)
    node.status = 'failure'
    return 'failure'
  }
  const result = fn(bb, def.args) ? 'success' : 'failure'
  node.status = result
  return result
}

// ─── Leaf: Action ─────────────────────────────────────────────

function tickAction(
  node: RuntimeNode,
  bb: Blackboard,
  adapter: RobotAdapter,
): NodeStatus {
  const def = node.def as { action: string; args?: Record<string, unknown> }
  const fn = actionRegistry.get(def.action)
  if (!fn) {
    console.warn(`[BT] Unknown action: ${def.action}`)
    node.status = 'failure'
    return 'failure'
  }
  const result = fn(bb, adapter, def.args)
  node.status = result
  return result
}

// ─── Leaf: Wait ───────────────────────────────────────────────

function tickWait(node: RuntimeNode, bb: Blackboard): NodeStatus {
  const durationMs = (node.def as { durationMs: number }).durationMs
  const startAt = (node.state.startAt as number) ?? bb.totalMs
  if (!node.state.startAt) node.state.startAt = bb.totalMs

  if (bb.totalMs - startAt >= durationMs) {
    node.state.startAt = undefined
    node.status = 'success'
    return 'success'
  }
  node.status = 'running'
  return 'running'
}
