/**
 * CyberAgent SDK — Robot Adapter Contract v2
 *
 * v2 introduces explicit connect/disconnect lifecycle, typed telemetry
 * callbacks, and a selfTest() health report.
 *
 * Migration from v1:
 *   - init() → connect() + init()
 *   - destroy() → disconnect() + destroy()
 *   - New: onTelemetry(callback), selfTest()
 *   - adapters emit a deprecation warning when used via v1 compat layer
 *
 * Grace period: v1 adapters (implementing only RobotAdapterV1) are
 * supported for 1 minor version after v0.6 ships.
 */

// ─── Types ───────────────────────────────────────────────────────

/** Adapter health status */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/** Structured self-test report */
export interface SelfTestReport {
  ok: boolean
  status: HealthStatus
  /** Human-readable summary */
  summary: string
  /** Per-check results */
  checks: SelfTestCheck[]
  /** Timestamp (ms since epoch) */
  timestamp: number
  /** Adapter version */
  version: string
}

export interface SelfTestCheck {
  name: string
  ok: boolean
  message: string
}

/** Telemetry event emitted by the robot */
export interface TelemetryEvent {
  /** Event type (e.g. 'battery', 'imu', 'bump', 'distance') */
  type: string
  /** Event payload */
  payload: Record<string, unknown>
  /** Timestamp when the event was generated (ms since epoch) */
  t: number
}

/**
 * Base robot capabilities — what the adapter can do.
 * Used by the BT editor to grey out incompatible nodes.
 */
export interface RobotCapabilities {
  movement: boolean
  rotation: boolean
  speed: boolean
  led: boolean
  sound: boolean
  gesture: boolean
  maxSpeed: number
  maxRotationSpeed: number
}

/**
 * Extended capabilities for v2.
 * Adds diagnostic and safety information.
 */
export interface RobotCapabilitiesV2 extends RobotCapabilities {
  /** Can report battery level */
  batteryReporting: boolean
  /** Can report distance / obstacle data */
  distanceReporting: boolean
  /** Can report IMU (accelerometer / gyroscope) */
  imuReporting: boolean
  /** Can perform a self-test */
  selfTestable: boolean
  /** Maximum battery voltage (V) */
  maxBatteryVoltage?: number
  /** Minimum safe battery voltage (V) */
  minBatteryVoltage?: number
  /** Whether the adapter supports hardware e-stop */
  hardwareEStop: boolean
}

/**
 * Heartbeat loss policy for the safety supervisor.
 */
export interface HeartbeatPolicy {
  /** Max allowed gap between heartbeats (ms). Default: 200 */
  maxGapMs: number
  /** Action when heartbeat is lost: 'warn' | 'pause' | 'e-stop' */
  onLoss: 'warn' | 'pause' | 'e-stop'
  /** Number of consecutive missed heartbeats before action triggers */
  missThreshold: number
}

// ─── v1 compat (existing interface) ─────────────────────────────

/**
 * v1 RobotAdapter — the original interface.
 * Supported for 1 minor version grace period after v0.6.
 */
export interface RobotAdapterV1 {
  readonly type: string
  readonly name: string
  init(bb: Blackboard): void
  update(bb: Blackboard): void
  destroy(): void
  sendCommand(command: AdapterCommand): void
  capabilities(): RobotCapabilities
}

/** v1 command type */
export interface AdapterCommand {
  type: string
  payload: Record<string, unknown>
}

// ─── v2 interface ────────────────────────────────────────────────

/**
 * v2 RobotAdapter — the new contract.
 *
 * Lifecycle:
 *   1. constructor(options)
 *   2. connect() — establish connection to robot
 *   3. init(bb) — initialize with blackboard
 *   4. update(bb) — called every tick
 *   5. sendCommand(cmd) — send discrete commands
 *   6. disconnect() — close connection
 *   7. destroy() — cleanup resources
 *
 * Telemetry:
 *   - onTelemetry(callback) registers a handler for incoming robot data
 *   - The adapter MUST call this callback whenever telemetry arrives
 *
 * Self-test:
 *   - selfTest() returns a structured health report
 *   - Called before first use and periodically by the safety supervisor
 */
export interface RobotAdapterV2 {
  /** Adapter type identifier (e.g. 'websocket', 'mbot', 'robomaster') */
  readonly type: string

  /** Human-readable name */
  readonly name: string

  /** Adapter contract version */
  readonly contractVersion: 'v2'

  /**
   * Establish connection to the robot.
   * Returns a promise that resolves when connected.
   * May throw if connection fails.
   */
  connect(): Promise<void>

  /**
   * Initialize the adapter with blackboard state.
   * Called after connect() succeeds.
   */
  init(bb: Blackboard): void

  /**
   * Called every tick with the current blackboard state.
   * The adapter should use this to send state updates or update internal state.
   */
  update(bb: Blackboard): void

  /**
   * Send a discrete command to the robot.
   * Commands are queued if not connected and flushed on reconnect.
   */
  sendCommand(command: AdapterCommand): void

  /**
   * Register a telemetry event callback.
   * The adapter calls this callback whenever robot telemetry arrives.
   * Returns an unsubscribe function.
   */
  onTelemetry(callback: (event: TelemetryEvent) => void): () => void

  /**
   * Run a self-test and return a structured health report.
   * For simulated adapters (CanvasAdapter), returns a synthetic report.
   */
  selfTest(): SelfTestReport

  /**
   * Report what this adapter can do (extended v2 capabilities).
   */
  capabilities(): RobotCapabilitiesV2

  /**
   * Graceful disconnect.
   * Called before destroy().
   */
  disconnect(): Promise<void>

  /**
   * Cleanup all resources.
   * Called when the behavior tree stops or the adapter is destroyed.
   */
  destroy(): void
}

// ─── Blackboard (re-export for convenience) ──────────────────────

export interface Blackboard {
  pointerX: number
  pointerY: number
  pointerActive: boolean
  canvasWidth: number
  canvasHeight: number
  x: number
  y: number
  rotation: number
  speed: number
  emotion: Emotion
  energy: number
  excitement: number
  tick: number
  deltaMs: number
  totalMs: number
  [key: string]: unknown
}

export type Emotion = 'idle' | 'happy' | 'curious' | 'alert' | 'sleepy' | 'playful' | 'angry'

// ─── v1 → v2 compatibility shim ─────────────────────────────────

/**
 * Type guard: check if an adapter implements v2.
 */
export function isAdapterV2(adapter: RobotAdapterV1 | RobotAdapterV2): adapter is RobotAdapterV2 {
  return 'contractVersion' in adapter && adapter.contractVersion === 'v2'
}

/**
 * Wrap a v1 adapter as v2 for the compatibility layer.
 * Used internally by the engine to support both versions.
 */
export function wrapV1AsV2(v1: RobotAdapterV1): RobotAdapterV2 {
  let connected = false
  let commandQueue: AdapterCommand[] = []

  return {
    type: v1.type,
    name: v1.name,
    contractVersion: 'v2',

    async connect() {
      // v1 adapters use init() for connection
      console.warn(`[Adapter] ${v1.type} is a v1 adapter — use wrapV1AsV2 shim`)
      connected = true
    },

    init(bb: Blackboard) {
      v1.init(bb)
    },

    update(bb: Blackboard) {
      v1.update(bb)
    },

    sendCommand(command: AdapterCommand) {
      if (connected) {
        v1.sendCommand(command)
      } else {
        commandQueue.push(command)
      }
    },

    onTelemetry(_callback: (event: TelemetryEvent) => void): () => void {
      // v1 adapters don't emit telemetry; callback is a no-op
      return () => {}
    },

    selfTest(): SelfTestReport {
      return {
        ok: true,
        status: 'healthy',
        summary: `v1 shim — ${v1.name} (unverified)`,
        checks: [{ name: 'shim', ok: true, message: 'v1 adapter wrapped in v2 shim' }],
        timestamp: Date.now(),
        version: 'v1-shim',
      }
    },

    capabilities(): RobotCapabilitiesV2 {
      const base = v1.capabilities()
      return {
        ...base,
        batteryReporting: false,
        distanceReporting: false,
        imuReporting: false,
        selfTestable: false,
        hardwareEStop: false,
      }
    },

    async disconnect() {
      connected = false
      commandQueue = []
    },

    destroy() {
      v1.destroy()
      connected = false
      commandQueue = []
    },
  }
}

// ─── Default capabilities (v2) ───────────────────────────────────

export const DEFAULT_CAPABILITIES_V2: RobotCapabilitiesV2 = {
  movement: true,
  rotation: true,
  speed: true,
  led: false,
  sound: false,
  gesture: false,
  maxSpeed: 100,
  maxRotationSpeed: 180,
  batteryReporting: false,
  distanceReporting: false,
  imuReporting: false,
  selfTestable: false,
  hardwareEStop: false,
}
