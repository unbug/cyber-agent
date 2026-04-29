/**
 * CyberAgent SDK — Public API
 *
 * Import the full SDK:
 *   import {
 *     BehaviorTreeRunner,
 *     CanvasAdapter,
 *     WebSocketAdapter,
 *     registerAction,
 *     registerCondition,
 *     createBlackboard,
 *   } from '@cyber-agent/sdk'
 *
 * Or import individual modules:
 *   import { hydrate, tick } from '@cyber-agent/sdk/engine/executor'
 *   import { registerBuiltins } from '@cyber-agent/sdk/engine/builtins'
 */

// ─── Core Types ───────────────────────────────────────────────

export type {
  NodeStatus,
  Emotion,
  Blackboard,
  BehaviorNodeDef,
  RuntimeNode,
  ActionFn,
  ConditionFn,
  RobotAdapter,
  AdapterCommand,
  CharacterBehavior,
  SequenceDef,
  SelectorDef,
  ParallelDef,
  InverterDef,
  RepeaterDef,
  CooldownDef,
  ConditionDef,
  ActionDef,
  WaitDef,
} from './types'

export { createBlackboard } from './types'

// ─── Behavior Tree Engine ─────────────────────────────────────

export {
  hydrate,
  tick,
  resetTree,
  registerAction,
  registerCondition,
} from './engine/executor'

export { BehaviorTreeRunner } from './engine/runner'
export type { RunnerState, RunnerSnapshot } from './engine/runner'

export { registerBuiltins } from './engine/builtins'

// ─── Adapters ─────────────────────────────────────────────────

export { CanvasAdapter } from './adapters/canvas-adapter'

export { WebSocketAdapter, createWebSocketAdapter } from './adapters/websocket-adapter'
export type { WebSocketAdapterOptions } from './adapters/websocket-adapter'

export { ESP32Adapter, createESP32Adapter } from './adapters/esp32-adapter'
export type { ESP32AdapterConfig } from './adapters/esp32-adapter'

// ─── Convenience ──────────────────────────────────────────────

/**
 * Quick start: create a runner with a CanvasAdapter for browser demos.
 *
 * Usage:
 *   const runner = createCanvasRunner(characterBehavior, canvasElement)
 *   runner.start()
 */
export function createCanvasRunner(
  behavior: { tree: any; characterId: string; tickIntervalMs?: number; defaults?: Partial<any> },
  canvas: HTMLCanvasElement,
) {
  const adapter = new CanvasAdapter(canvas)
  return new BehaviorTreeRunner(behavior, adapter)
}
