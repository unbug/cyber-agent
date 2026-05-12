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

// Multi-agent infrastructure (v2.1)
export { World, EventBus, subscribeToWorld } from './world'
export type { BusEvent, WorldAgent, WorldConfig } from './world'
export { SpatialIndex } from './spatial-index'
export type { SpatialPoint, SpatialQueryResult, SpatialIndexConfig } from './spatial-index'
export { MultiExecutor } from './multi-executor'
export type { AgentContext, MultiExecutorConfig } from './multi-executor'

// Scene library (v2.1)
export {
  sceneRegistry,
  getScene,
  getSceneIds,
  getAllScenes,
  validateScene,
  requireScene,
  importTiledMap,
  createDefaultScene,
} from './scenes'
export type {
  Scene,
  ScenePOI,
  SpawnPoint,
  SceneRegistry,
  PoiType,
  SceneId,
  TiledMap,
  ImportOptions,
} from './scenes'
