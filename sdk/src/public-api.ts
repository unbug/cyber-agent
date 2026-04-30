/**
 * @fileoverview CyberAgent SDK — Public API Surface (v1.0 Stable)
 *
 * This file defines the EXACT public API surface for @cyber-agent/sdk@1.x.
 * All exports here are STABLE and will not change until @cyber-agent/sdk@2.0.
 *
 * Import from this file for the most complete public API:
 *   import {
 *     BehaviorTreeRunner,
 *     CanvasAdapter,
 *     WebSocketAdapter,
 *     ESP32Adapter,
 *     registerAction,
 *     registerCondition,
 *     registerBuiltins,
 *     createBlackboard,
 *     hydrate,
 *     tick,
 *     resetTree,
 *     isAdapterV2,
 *     wrapV1AsV2,
 *     DEFAULT_CAPABILITIES_V2,
 *   } from '@cyber-agent/sdk'
 *
 * Or import sub-paths for tree-shaking:
 *   import { hydrate, tick } from '@cyber-agent/sdk/engine/executor'
 *   import { TelemetryEvent } from '@cyber-agent/sdk/trace/schema'
 *
 * @stable This module is part of the v1.0 stable API surface.
 */

// ─── Core Types (frozen) ───────────────────────────────────────

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

// ─── Behavior Tree Engine (stable API) ────────────────────────

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

// ─── Adapter Contract v2 (stable interface) ───────────────────

export type {
  HealthStatus,
  SelfTestReport,
  SelfTestCheck,
  TelemetryEvent,
  RobotCapabilities,
  RobotCapabilitiesV2,
  HeartbeatPolicy,
  RobotAdapterV1,
  AdapterCommand as AdapterCommandV1,
  RobotAdapterV2,
} from './adapter/contract'

export {
  isAdapterV2,
  wrapV1AsV2,
  DEFAULT_CAPABILITIES_V2,
} from './adapter/contract'

// ─── Adapters (stable classes) ─────────────────────────────────

export { CanvasAdapter } from './adapters/canvas-adapter'

export { WebSocketAdapter, createWebSocketAdapter } from './adapters/websocket-adapter'
export type { WebSocketAdapterOptions } from './adapters/websocket-adapter'

export { ESP32Adapter, createESP32Adapter } from './adapters/esp32-adapter'
export type { ESP32AdapterConfig } from './adapters/esp32-adapter'

// ─── Trace Schema (stable) ─────────────────────────────────────

export type {
  TraceEvent,
  TraceFrame,
  TraceFile,
  TraceMetadata,
  TraceSchemaVersion,
} from './trace/schema'

export {
  TRACE_SCHEMA_VERSION,
  validateTrace,
  migrateTrace,
} from './trace/schema'

// ─── CLI Commands (stable) ─────────────────────────────────────

// CLI is a separate binary; consumers import via 'cyber-agent' bin.
// Sub-commands: record, replay, trace lint

// ─── Convenience ───────────────────────────────────────────────

export { createCanvasRunner } from './index'
