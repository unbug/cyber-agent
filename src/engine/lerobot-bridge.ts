/**
 * CyberAgent — LeRobot Bridge (v2.2)
 *
 * Bridges CyberAgent's policy system to HuggingFace LeRobot async inference.
 *
 * Architecture:
 *   1. `LeRobotPolicyClient` opens a WebSocket to a LeRobot policy server
 *   2. On connect: handshake with robot type, camera config, task
 *   3. On predict(): send observation frames → receive action vector
 *   4. Maps CyberAgent ObservationSpec/ActionSpec ↔ LeRobot format
 *
 * Supported models: Pi0, SmolVLA, GR00T (any LeRobot-compatible checkpoint)
 *
 * ⚠️ experimental — sim-only; real-hardware transfer validation pending
 */

import type { PolicyClient, PolicyResult, PolicyConfig } from './policy'
import { registerPolicy } from './policy'

// Re-export for convenience
export { getPolicy, getAllPolicies } from './policy'

// ─── LeRobot Protocol Types ─────────────────────────────────────

/**
 * LeRobot async inference server message types.
 * Protocol spec: https://huggingface.co/docs/lerobot/en/async
 */

/** Client → Server: initial handshake */
export interface LRobotHandshake {
  type: 'handshake'
  /** Robot type (e.g. "so100_follower", "aloha", "custom") */
  robot_type: string
  /** Robot ID for calibration file lookup */
  robot_id: string
  /** Camera config matching policy expectations */
  cameras: Record<string, CameraConfig>
  /** Task description for the policy */
  task: string
  /** Policy checkpoint path or HF repo ID */
  policy_path?: string
}

/** Camera configuration for LeRobot */
export interface CameraConfig {
  type: 'opencv'
  /** Camera index or video path */
  index_or_path: number | string
  width: number
  height: number
  fps: number
}

/** Client → Server: observation frame batch */
export interface LRobotObservation {
  type: 'observation'
  /** Camera key → base64-encoded frame (jpeg/png) */
  frames: Record<string, string>
  /** Additional sensor data (joint angles, IMU, etc.) */
  sensors?: Record<string, number>
  /** Timestamp of the observation */
  timestamp: number
}

/** Server → Client: policy action result */
export interface LRobotAction {
  type: 'action'
  /** Raw action vector from the policy */
  action: number[]
  /** Confidence score (0-1) */
  confidence: number
  /** Server-side latency in ms */
  latency_ms: number
  /** Server timestamp */
  timestamp: number
}

/** Server → Client: error message */
export interface LRobotError {
  type: 'error'
  message: string
  code?: string
}

/** Server → Client: heartbeat / status */
export interface LRobotStatus {
  type: 'status'
  status: 'ready' | 'busy' | 'error'
  message?: string
}

// ─── LeRobot Policy Client ─────────────────────────────────────

/**
 * LeRobot async inference client.
 * Connects to a running `policy_server` and sends observations
 * to get policy-driven actions.
 *
 * Usage:
 *   const client = new LeRobotPolicyClient({
 *     serverUrl: 'ws://localhost:8080',
 *     modelId: 'openvla/openvla-7b',
 *     robotType: 'so100_follower',
 *     cameras: { front: { type: 'opencv', index_or_path: 0, width: 640, height: 480, fps: 30 } },
 *     task: 'move_forward',
 *   })
 *   await client.connect()
 *   const result = await client.predict({ pos_x: 0.5, pos_y: 0.3 })
 *   client.close()
 */
export class LeRobotPolicyClient implements PolicyClient {
  private ws: WebSocket | null = null
  private modelId: string
  private serverUrl: string
  private robotType: string
  private robotId: string
  private cameras: Record<string, CameraConfig>
  private task: string
  private policyPath?: string
  private _connected = false
  private _ready = false
  private _pendingResolve: ((result: PolicyResult) => void) | null = null
  private _pendingReject: ((err: Error) => void) | null = null
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _reconnectDelay = 1000
  private readonly maxReconnectDelay = 30000
  private _reconnectCount = 0
  private _maxReconnects = 5
  private _healthCheckTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    config: {
      modelId: string
      serverUrl: string
      robotType?: string
      robotId?: string
      cameras?: Record<string, CameraConfig>
      task: string
      policyPath?: string
    },
  ) {
    this.modelId = config.modelId
    this.serverUrl = config.serverUrl
    this.robotType = config.robotType ?? 'custom'
    this.robotId = config.robotId ?? 'cyberagent'
    this.cameras = config.cameras ?? {}
    this.task = config.task
    this.policyPath = config.policyPath
  }

  get connected(): boolean {
    return this._connected && this.ws?.readyState === WebSocket.OPEN
  }

  get ready(): boolean {
    return this._ready
  }

  /**
   * Connect to the LeRobot policy server and perform handshake.
   */
  async connect(): Promise<void> {
    if (this.connected) return

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl)

      this.ws.onopen = () => {
        // Send handshake
        const handshake: LRobotHandshake = {
          type: 'handshake',
          robot_type: this.robotType,
          robot_id: this.robotId,
          cameras: this.cameras,
          task: this.task,
          ...(this.policyPath && { policy_path: this.policyPath }),
        }

        this.ws!.send(JSON.stringify(handshake))
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string)

          switch (msg.type) {
            case 'status': {
              if (msg.status === 'ready') {
                this._ready = true
                this._connected = true
                this._reconnectCount = 0
                this._reconnectDelay = 1000
                resolve()
                // Start health check
                this._startHealthCheck()
              } else if (msg.status === 'error') {
                reject(new Error(msg.message ?? 'LeRobot server error'))
              }
              break
            }
            case 'action': {
              if (this._pendingResolve) {
                const result: PolicyResult = {
                  modelId: this.modelId,
                  actionVector: msg.action,
                  confidence: msg.confidence ?? 0,
                  latencyMs: msg.latency_ms ?? 0,
                  timestamp: msg.timestamp ?? Date.now(),
                }
                this._pendingResolve(result)
                this._pendingResolve = null
                this._pendingReject = null
              }
              break
            }
            case 'error': {
              if (this._pendingReject) {
                this._pendingReject(new Error(msg.message))
                this._pendingResolve = null
                this._pendingReject = null
              }
              break
            }
          }
        } catch (err) {
          console.warn('[LeRobotBridge] Failed to parse message:', event.data, err)
        }
      }

      this.ws.onclose = (event: CloseEvent) => {
        this._connected = false
        this._ready = false
        this._stopHealthCheck()

        if (event.code !== 1000 && this._reconnectCount < this._maxReconnects) {
          // Auto-reconnect with exponential backoff
          this._reconnectCount++
          const delay = Math.min(
            this._reconnectDelay * Math.pow(1.5, this._reconnectCount),
            this.maxReconnectDelay,
          )
          this._reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {})
          }, delay)
        }
      }

      this.ws.onerror = () => {
        // Errors are handled in onclose
      }
    })
  }

  /**
   * Run inference: send observation and get action vector.
   * Automatically connects if not yet connected.
   */
  async predict(observation: Record<string, unknown>): Promise<PolicyResult> {
    if (!this.connected) {
      await this.connect()
    }

    if (!this._ready) {
      throw new Error('LeRobot policy server not ready')
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not open')
    }

    // Convert CyberAgent observation to LeRobot format
    const leRobotObs: LRobotObservation = {
      type: 'observation',
      frames: {},
      sensors: {},
      timestamp: performance.now(),
    }

    // Extract sensor data from observation
    for (const [key, value] of Object.entries(observation)) {
      if (typeof value === 'number') {
        leRobotObs.sensors![key] = value
      }
      // Note: image frames would be base64-encoded; handled by caller
    }

    // Send observation to server
    return new Promise((resolve, reject) => {
      this._pendingResolve = resolve
      this._pendingReject = reject

      this.ws!.send(JSON.stringify(leRobotObs))

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this._pendingResolve) {
          this._pendingResolve = null
          this._pendingReject = null
          reject(new Error('LeRobot policy inference timeout (10s)'))
        }
      }, 10000)
    })
  }

  /**
   * Send camera frames to the policy server.
   * Call this before predict() if using camera-based policies.
   */
  async sendFrames(frames: Record<string, string>): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to LeRobot server')
    }

    this.ws.send(JSON.stringify({
      type: 'frames',
      frames,
      timestamp: performance.now(),
    }))
  }

  /**
   * Set the current task (for task-conditioned policies like Pi0).
   */
  async setTask(task: string): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to LeRobot server')
    }

    this.task = task
    this.ws.send(JSON.stringify({
      type: 'task',
      task,
    }))
  }

  /**
   * Check if the LeRobot server is healthy.
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connected) {
        await this.connect()
      }
      return this._ready
    } catch {
      return false
    }
  }

  /**
   * Close the WebSocket connection and clean up.
   */
  close(): void {
    this._stopHealthCheck()
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, 'CyberAgent cleanup')
      this.ws = null
    }
    this._connected = false
    this._ready = false
  }

  /** Start periodic health check */
  private _startHealthCheck(): void {
    this._healthCheckTimer = setInterval(async () => {
      if (!this.connected) {
        try {
          await this.connect()
        } catch {
          // Will be retried by onclose handler
        }
      }
    }, 5000)
  }

  /** Stop health check timer */
  private _stopHealthCheck(): void {
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer)
      this._healthCheckTimer = null
    }
  }
}

// ─── LeRobot Bridge Factory ─────────────────────────────────────

/**
 * Create a LeRobotPolicyClient from a CyberAgent PolicyConfig.
 *
 * Maps CyberAgent observation/action specs to LeRobot protocol format.
 */
export function createLeRobotClient(
  config: PolicyConfig,
  options?: {
    serverUrl?: string
    robotType?: string
    robotId?: string
  },
): LeRobotPolicyClient {
  const serverUrl = options?.serverUrl ?? 'ws://localhost:8080'
  const robotType = options?.robotType ?? 'custom'
  const robotId = options?.robotId ?? 'cyberagent'

  // Derive task from model ID
  const task = config.modelId.split('/').pop() ?? 'default'

  // Build camera config from observation spec rawObservations
  const cameras: Record<string, CameraConfig> = {}
  if (config.observationSpec?.rawObservations) {
    for (const obs of config.observationSpec.rawObservations) {
      if (obs.source === 'camera') {
        const key = obs.name ?? `camera_${Object.keys(cameras).length}`
        cameras[key] = {
          type: 'opencv',
          index_or_path: Object.keys(cameras).length,
          width: 640,
          height: 480,
          fps: 30,
        }
      }
    }
  }

  return new LeRobotPolicyClient({
    modelId: config.modelId,
    serverUrl,
    robotType,
    robotId,
    cameras,
    task,
    policyPath: config.modelId,
  })
}

// ─── Model Registry ─────────────────────────────────────────────

/**
 * Pre-configured LeRobot model definitions for common policies.
 */
export const LEROBOT_MODELS: Record<string, Partial<PolicyConfig>> = {
  /**
   * Pi0 — OpenVLA policy from HuggingFace.
   * Vision-language-action model for robot manipulation.
   */
  'pi0': {
    modelId: 'openvla/openvla-7b',
    observationSpec: {
      fields: [
        { from: 'pos_x', to: 0, normalize: 'min-max', min: -1, max: 1 },
        { from: 'pos_y', to: 1, normalize: 'min-max', min: -1, max: 1 },
        { from: 'pos_z', to: 2, normalize: 'min-max', min: -1, max: 1 },
      ],
      rawObservations: [
        { name: 'front_camera', shape: [480, 640, 3], source: 'camera' },
      ],
    },
    actionSpec: {
      mappings: [
        { from: 0, to: 'base_velocity.x', scale: 1.0 },
        { from: 1, to: 'base_velocity.y', scale: 1.0 },
        { from: 2, to: 'base_velocity.z', scale: 1.0 },
        { from: 3, to: 'gripper.open', scale: 1.0 },
      ],
      requiredLength: 4,
    },
    confidenceThreshold: 0.6,
  },

  /**
   * SmolVLA — Lightweight VLA model for resource-constrained robots.
   */
  'smolvla': {
    modelId: 'lerobot/smolvla-3b',
    observationSpec: {
      fields: [
        { from: 'pos_x', to: 0, normalize: 'z-score', mean: 0, std: 1 },
        { from: 'pos_y', to: 1, normalize: 'z-score', mean: 0, std: 1 },
      ],
      rawObservations: [
        { name: 'front_camera', shape: [320, 320, 3], source: 'camera' },
      ],
    },
    actionSpec: {
      mappings: [
        { from: 0, to: 'base_velocity.x', scale: 2.0 },
        { from: 1, to: 'base_velocity.y', scale: 2.0 },
      ],
      requiredLength: 2,
    },
    confidenceThreshold: 0.5,
  },

  /**
   * GR00T — Google's General Robot OT policy.
   * Multi-modal policy for general-purpose robot manipulation.
   */
  'gr00t': {
    modelId: 'google/gr00t-nano',
    observationSpec: {
      fields: [
        { from: 'pos_x', to: 0, normalize: 'min-max', min: -1, max: 1 },
        { from: 'pos_y', to: 1, normalize: 'min-max', min: -1, max: 1 },
        { from: 'pos_z', to: 2, normalize: 'min-max', min: -1, max: 1 },
        { from: 'imu_pitch', to: 3, normalize: 'none' },
        { from: 'imu_roll', to: 4, normalize: 'none' },
      ],
      rawObservations: [
        { name: 'front_camera', shape: [480, 640, 3], source: 'camera' },
        { name: 'wrist_camera', shape: [240, 320, 3], source: 'camera' },
      ],
    },
    actionSpec: {
      mappings: [
        { from: 0, to: 'base_velocity.x', scale: 1.5 },
        { from: 1, to: 'base_velocity.y', scale: 1.5 },
        { from: 2, to: 'base_velocity.z', scale: 1.5 },
        { from: 3, to: 'gripper.open', scale: 1.0 },
        { from: 4, to: 'gripper.force', scale: 10.0 },
      ],
      requiredLength: 5,
    },
    confidenceThreshold: 0.65,
  },
}

/**
 * Register all pre-configured LeRobot models with the policy registry.
 */
export function registerLeRobotModels(): void {
  for (const [, partialConfig] of Object.entries(LEROBOT_MODELS)) {
    const config: PolicyConfig = {
      modelId: partialConfig.modelId!,
      observationSpec: partialConfig.observationSpec!,
      actionSpec: partialConfig.actionSpec!,
      confidenceThreshold: partialConfig.confidenceThreshold ?? 0.6,
      timeoutMs: partialConfig.timeoutMs ?? 10000,
    }
    registerPolicy(config)
  }
}

// ─── HIL Checklist Generator ────────────────────────────────────

/**
 * Generate a LeRobot HIL checklist for the current adapter.
 * Returns markdown text for docs/hil/lerobot-bridge/CHECKLIST.md
 */
export function generateLeRobotHILChecklist(): string {
  return `# LeRobot Bridge HIL Checklist

> Hardware-in-Loop verification for \`@cyber-agent/sdk-lerobot\` bridge.

## Prerequisites

- [ ] LeRobot policy server running: \`python -m lerobot.scripts.server.policy_server --host 0.0.0.0 --port 8080\`
- [ ] Policy checkpoint loaded (Pi0 / SmolVLA / GR00T)
- [ ] Robot connected and calibrated
- [ ] Camera(s) accessible (OpenCV or RTSP)

## Verification Steps

1. **Connect handshake**
   - [ ] WebSocket connects to policy server
   - [ ] Handshake response: \`{type: "status", status: "ready"}\`
   - [ ] Latency < 50 ms for handshake round-trip

2. **Observation send**
   - [ ] Send observation with sensor data
   - [ ] Server responds with \`{type: "action"}\` within timeout
   - [ ] Action vector length matches expected output dim

3. **Camera frames**
   - [ ] Send camera frames (base64 encoded)
   - [ ] Server processes frames without error
   - [ ] Action reflects camera input (compare with sensor-only)

4. **Task switching**
   - [ ] Send \`{type: "task", task: "new_task"}\`
   - [ ] Server acknowledges task change
   - [ ] New task produces different actions for same observation

5. **Error handling**
   - [ ] Disconnect server → client auto-reconnects
   - [ ] Invalid frame → server returns \`{type: "error"}\`
   - [ ] Timeout → client returns zero-action fallback

6. **Performance**
   - [ ] End-to-end latency < 200 ms (sensor → action)
   - [ ] No memory leaks after 1000 inference cycles
   - [ ] No cross-talk in multi-robot setup

## Known Limitations

- Requires Python LeRobot server (not pure browser inference)
- Camera frames must be pre-encoded (no native browser camera access in bridge)
- Policy model must be loaded on server before first inference

## Notes

- This bridge is **experimental** — sim-only until real-hardware transfer validation
- For production use, consider direct HuggingFace Inference API (RestPolicyClient)
`
}
