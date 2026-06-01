/**
 * CyberAgent — Policy Integration Layer (v2.2)
 *
 * Provides the `RunPolicy` BT action node that delegates a motion
 * primitive to an external VLA / diffusion policy (HuggingFace model).
 *
 * Architecture:
 *   1. `PolicyClient` wraps an HF model endpoint (REST / gRPC)
 *   2. Observations are rendered from the blackboard into the policy's
 *      observation spec (tensor shape, dtype, normalization)
 *   3. The policy returns an action vector (joint angles, velocities, etc.)
 *   4. `PolicyAdapter` maps the raw action vector to robot command payloads
 *
 * This module is **experimental** — sim-only until real-hardware transfer
 * validation is complete.
 */

import { tracer } from './tracer'
import type { Blackboard, NodeStatus, RobotAdapter } from './types'

// ─── Policy Types ───────────────────────────────────────────────

/** Policy model identifier (HuggingFace model ID or local path) */
export interface PolicyConfig {
  /** HuggingFace model ID, e.g. "openvla/openvla-7b" */
  modelId: string
  /** Observation spec: what fields to extract from the blackboard */
  observationSpec: ObservationSpec
  /** Action spec: how to interpret the policy's output */
  actionSpec: ActionSpec
  /** Confidence threshold: only execute if model confidence >= this */
  confidenceThreshold?: number
  /** Max execution time (ms) before timeout */
  timeoutMs?: number
}

/** Defines which blackboard fields map to policy observations */
export interface ObservationSpec {
  /** Blackboard fields → policy input tensor */
  fields: Array<{
    /** Blackboard field name */
    from: string
    /** Policy tensor index (flattened) */
    to: number
    /** Optional: normalization applied before feeding to policy */
    normalize?: 'min-max' | 'z-score' | 'none'
    /** Min value for min-max normalization */
    min?: number
    /** Max value for min-max normalization */
    max?: number
    /** Mean for z-score normalization */
    mean?: number
    /** Std dev for z-score normalization */
    std?: number
  }>
  /** Additional raw observations (images, point clouds, etc.) */
  rawObservations?: Array<{
    name: string
    shape: number[]
    source: string  // 'camera', 'lidar', 'imu', etc.
  }>
}

/** Defines how to interpret the policy's action output */
export interface ActionSpec {
  /** Action vector → robot command mapping */
  mappings: Array<{
    /** Policy action tensor index or blackboard field name (string for sim) */
    from: number | string
    /** Robot command field path (dot-separated) */
    to: string
    /** Scaling factor applied to the raw action */
    scale?: number
    /** Offset applied after scaling */
    offset?: number
  }>
  /** Required action vector length */
  requiredLength: number
}

/** A single policy inference result */
export interface PolicyResult {
  /** HuggingFace model ID that produced this result */
  modelId: string
  /** Action vector returned by the policy */
  actionVector: number[]
  /** Model's confidence score (0-1) */
  confidence: number
  /** Inference latency in ms */
  latencyMs: number
  /** Timestamp when the result was produced */
  timestamp: number
}

/** Policy client interface — implement for different backends */
export interface PolicyClient {
  /** Run inference on the policy model */
  predict(observation: Record<string, unknown>): Promise<PolicyResult>
  /** Check if the client is healthy */
  healthCheck(): Promise<boolean>
  /** Close the client connection */
  close(): void
}

// ─── Policy Registry ────────────────────────────────────────────

const policyRegistry = new Map<string, PolicyConfig>()

/** Register a policy configuration */
export function registerPolicy(config: PolicyConfig): void {
  policyRegistry.set(config.modelId, config)
}

/** Get a registered policy by model ID */
export function getPolicy(modelId: string): PolicyConfig | undefined {
  return policyRegistry.get(modelId)
}

/** Get all registered policies */
export function getAllPolicies(): Map<string, PolicyConfig> {
  return new Map(policyRegistry)
}

/** Unregister a policy */
export function unregisterPolicy(modelId: string): boolean {
  return policyRegistry.delete(modelId)
}

// ─── Policy Client Implementations ──────────────────────────────

/**
 * REST-based policy client for HuggingFace Inference API.
 * Sends observations as a JSON payload and parses the action vector.
 */
export class RestPolicyClient implements PolicyClient {
  private baseUrl: string
  private modelId: string

  constructor(modelId: string, baseUrl?: string) {
    this.modelId = modelId
    this.baseUrl = baseUrl ?? `https://api-inference.huggingface.co/models/${modelId}`
  }

  async predict(observation: Record<string, unknown>): Promise<PolicyResult> {
    const t0 = performance.now()

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: observation }),
      })

      if (!response.ok) {
        throw new Error(`Policy inference failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Parse the policy output (HF format varies by model)
      const actionVector = Array.isArray(data)
        ? data.map(Number)
        : Array.isArray(data.output)
          ? data.output.map(Number)
          : [0]
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0.5
      const latencyMs = performance.now() - t0

      return {
        modelId: this.modelId,
        actionVector,
        confidence,
        latencyMs,
        timestamp: Date.now(),
      }
    } catch (err) {
      const latencyMs = performance.now() - t0
      // Return a zero-action on failure (safe fallback)
      return {
        modelId: this.modelId,
        actionVector: [0],
        confidence: 0,
        latencyMs,
        timestamp: Date.now(),
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: 'GET' })
      return response.ok
    } catch {
      return false
    }
  }

  close(): void {
    // No-op for REST client
  }
}

/**
 * Simulated policy client for testing without a real model.
 * Returns deterministic actions based on blackboard state.
 */
export class SimPolicyClient implements PolicyClient {
  private modelId: string
  private actionSpec: ActionSpec

  constructor(modelId: string, actionSpec: ActionSpec) {
    this.modelId = modelId
    this.actionSpec = actionSpec
  }

  predict(observation: Record<string, unknown>): Promise<PolicyResult> {
    // Deterministic "policy" — generates actions based on observation
    const actionVector = this.actionSpec.mappings.map((m) => {
      // Find the source value from observation
      const fieldName = typeof m.from === 'string' ? m.from : String(m.from)
      const parts = fieldName.split('.')
      let obj: Record<string, unknown> = observation
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (part && obj && typeof obj === 'object' && part in obj) {
          obj = obj[part] as Record<string, unknown>
        } else {
          obj = {}
          break
        }
      }
      const raw = typeof obj === 'number' ? obj : 0
      const scaled = raw * (m.scale ?? 1) + (m.offset ?? 0)
      return scaled
    })

    return Promise.resolve({
      modelId: this.modelId,
      actionVector,
      confidence: 0.95,
      latencyMs: 5,
      timestamp: Date.now(),
    })
  }

  async healthCheck(): Promise<boolean> {
    return true
  }

  close(): void {
    // No-op
  }
}

/**
 * Mock policy client for unit tests — returns configurable actions.
 */
export class MockPolicyClient implements PolicyClient {
  private modelId: string
  private mockAction?: number[]
  private mockConfidence?: number
  private mockLatency?: number
  private shouldFail = false

  constructor(modelId: string) {
    this.modelId = modelId
  }

  setMockAction(action: number[]): void {
    this.mockAction = action
  }

  setMockConfidence(confidence: number): void {
    this.mockConfidence = confidence
  }

  setMockLatency(latency: number): void {
    this.mockLatency = latency
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail
  }

  async predict(_observation: Record<string, unknown>): Promise<PolicyResult> {
    const t0 = performance.now()

    if (this.shouldFail) {
      throw new Error('Mock policy failure')
    }

    const latency = this.mockLatency ?? (performance.now() - t0)
    return {
      modelId: this.modelId,
      actionVector: this.mockAction ?? [0, 0, 0, 0],
      confidence: this.mockConfidence ?? 0.9,
      latencyMs: latency,
      timestamp: Date.now(),
    }
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail
  }

  close(): void {
    // No-op
  }
}

// ─── Policy Adapter (action vector → robot command) ─────────────

/**
 * Maps a policy's action vector to robot command payloads using
 * the ActionSpec defined in the policy config.
 */
export function applyPolicyAction(
  result: PolicyResult,
  actionSpec: ActionSpec,
): Record<string, unknown> {
  const command: Record<string, unknown> = {}

  for (const mapping of actionSpec.mappings) {
    const idx = typeof mapping.from === 'number' ? mapping.from : Number(mapping.from)
    const rawAction = result.actionVector[idx] ?? 0
    const scaled = rawAction * (mapping.scale ?? 1) + (mapping.offset ?? 0)

    // Set the command field (supports dot-notation paths for nested objects)
    const parts = mapping.to.split('.')
    let target: Record<string, unknown> = command
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i] ?? ''
      if (part in target && typeof target[part] === 'object') {
        target = target[part] as Record<string, unknown>
      } else {
        target[part] = {}
        target = target[part] as Record<string, unknown>
      }
    }
    const lastPart = parts[parts.length - 1] ?? ''
    if (typeof lastPart === 'string' && lastPart) {
      target[lastPart] = scaled
    }
  }

  return command
}

// ─── BT Action Node: RunPolicy ──────────────────────────────────

/**
 * RunPolicy — delegates a motion primitive to an external VLA / diffusion policy.
 *
 * BT definition:
 *   {
 *     "type": "action",
 *     "action": "runPolicy",
 *     "args": {
 *       "modelId": "openvla/openvla-7b",
 *       "observationSpec": { ... },
 *       "actionSpec": { ... },
 *       "confidenceThreshold": 0.7
 *     }
 *   }
 *
 * Execution:
 *   1. Extract observations from blackboard per observationSpec
 *   2. Call policy client predict()
 *   3. If confidence >= threshold, map action vector to robot command
 *   4. Write action vector to blackboard for debug visibility
 *   5. Emit tracer events for policy lifecycle
 */

export function runPolicyAction(
  bb: Blackboard,
  adapter: RobotAdapter,
  args?: Record<string, unknown>,
): NodeStatus {
  const t = performance.now()

  if (!args) {
    console.warn('[Policy] RunPolicy called without args')
    return 'failure'
  }

  const modelId = args.modelId as string
  if (!modelId) {
    console.warn('[Policy] RunPolicy missing modelId')
    return 'failure'
  }

  const config = getPolicy(modelId)
  if (!config) {
    console.warn(`[Policy] Unregistered policy: ${modelId}`)
    return 'failure'
  }

  const confidenceThreshold = (args.confidenceThreshold as number) ?? config.confidenceThreshold ?? 0.5
  const observationSpec = (args.observationSpec as ObservationSpec) ?? config.observationSpec
  const actionSpec = (args.actionSpec as ActionSpec) ?? config.actionSpec

  // Extract observations from blackboard
  const observation: Record<string, unknown> = {}
  for (const field of observationSpec.fields) {
    const value = bb[field.from]
    if (value === undefined) continue

    let normalized = value as number
    if (field.normalize === 'min-max' && field.min !== undefined && field.max !== undefined) {
      normalized = (normalized - field.min) / (field.max - field.min)
    } else if (field.normalize === 'z-score' && field.mean !== undefined && field.std !== undefined) {
      normalized = (normalized - field.mean) / field.std
    }
    observation[field.from] = normalized
  }

  // Create or reuse policy client
  let client: PolicyClient
  try {
    client = new RestPolicyClient(modelId)
  } catch {
    console.warn(`[Policy] Failed to create client for ${modelId}`)
    tracer.emit({
      t,
      type: 'policy.failure',
      label: modelId,
      payload: { error: 'client_creation_failed' },
      agentId: undefined,
    })
    return 'failure'
  }

  // Note: policy inference is async — in production this would use a
  // worker thread or WebAssembly to avoid blocking the BT tick.
  // For now we log the invocation and return success (sim-only).
  // The actual inference result will be delivered via a callback.

  client.predict(observation).then((result) => {
    tracer.emit({
      t,
      type: 'policy.invoke',
      label: modelId,
      payload: {
        modelId,
        confidence: result.confidence,
        latencyMs: result.latencyMs,
        actionVector: result.actionVector,
        observation,
      },
      agentId: undefined,
    })

    if (result.confidence < confidenceThreshold) {
      tracer.emit({
        t: performance.now(),
        type: 'policy.low_confidence',
        label: modelId,
        payload: {
          confidence: result.confidence,
          threshold: confidenceThreshold,
        },
        agentId: undefined,
      })
      client.close()
      return
    }

    // Map action vector to robot command
    const command = applyPolicyAction(result, actionSpec)

    // Write action vector to blackboard for debug visibility
    bb._policyAction = result.actionVector
    bb._policyConfidence = result.confidence
    bb._policyModelId = modelId

    // Send command to robot
    if (adapter && typeof adapter.sendCommand === 'function') {
      for (const [key, val] of Object.entries(command)) {
        adapter.sendCommand({ type: key, payload: { value: val } })
      }
    }

    tracer.emit({
      t: performance.now(),
      type: 'policy.success',
      label: modelId,
      payload: {
        actionVector: result.actionVector,
        command,
      },
      agentId: undefined,
    })

    client.close()
  }).catch((err) => {
    console.warn(`[Policy] Inference failed for ${modelId}:`, err)
    tracer.emit({
      t,
      type: 'policy.failure',
      label: modelId,
      payload: { error: String(err) },
      agentId: undefined,
    })
    client.close()
  })

  // Return success — the actual command delivery is async
  return 'success'
}

// ─── BT Condition: WhenPolicyConfident ──────────────────────────

/**
 * WhenPolicyConfident — selector branch that only executes children
 * when the last policy inference was sufficiently confident.
 *
 * BT definition:
 *   {
 *     "type": "condition",
 *     "condition": "whenPolicyConfident",
 *     "args": {
 *       "threshold": 0.7
 *     }
 *   }
 */

export function whenPolicyConfidentCondition(
  bb: Blackboard,
  args?: Record<string, unknown>,
): boolean {
  const threshold = (args?.threshold as number) ?? 0.7
  const confidence = (bb as any)._policyConfidence as number ?? 0
  return confidence >= threshold
}

// ─── Registration ───────────────────────────────────────────────

/**
 * Register the policy action and condition with the BT engine.
 * Call this once at startup or when loading a policy-enabled character.
 */
export function registerPolicyNodes(): void {
  // Dynamic import to avoid circular dependency
  import('./executor').then(({ registerAction, registerCondition }: any) => {
    registerAction('runPolicy', runPolicyAction)
    registerCondition('whenPolicyConfident', whenPolicyConfidentCondition)
  })
}
