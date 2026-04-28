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

// Tracer
export { tracer } from './tracer'
export type { TracerEvent, TracerEventType } from './tracer'

// Canvas adapter
export { CanvasAdapter } from './canvas-adapter'

// WebSocket adapter
export { WebSocketAdapter, createWebSocketAdapter } from './websocket-adapter'

// RoboMaster motion adapter
export { RoboMasterMotionAdapter, createRoboMasterAdapter, createRoboMasterWebSocketAdapter, motionPrimitive } from './robomaster-robot-adaptor'

// Character behaviors (re-exported from agents module)
export { getBehavior, getAllBehaviors } from '../agents'

// Safety Supervisor
export { SafetySupervisor } from './safety-supervisor'
export type { SafetyEvent, SafetyState, SafetyPolicy, SafetyOptions } from './safety-supervisor'
