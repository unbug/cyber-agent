/**
 * CyberAgent Behavior Tree Engine — Public API
 */

// Core types
export type {
  NodeStatus,
  Blackboard,
  Emotion,
  BehaviorNodeDef,
  RuntimeNode,
  ActionFn,
  ConditionFn,
  RobotAdapter,
  AdapterCommand,
  CharacterBehavior,
} from './types'

export { createBlackboard } from './types'

// Executor
export {
  hydrate,
  tick,
  resetTree,
  registerAction,
  registerCondition,
} from './executor'

// Runner
export { BehaviorTreeRunner } from './runner'
export type { RunnerState, RunnerSnapshot } from './runner'

// Canvas adapter
export { CanvasAdapter } from './canvas-adapter'

// Character behaviors
export { getBehavior, getAllBehaviors } from './behaviors'
