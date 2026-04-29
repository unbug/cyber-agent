/**
 * Unitree Go1 / Go2 Adapter — High-Level SDK
 *
 * Controls Unitree Go1 (SDK v3.x, UDP) and Go2 (SDK2, DDS) robots
 * via a local relay server that bridges WebSocket ↔ robot protocol.
 *
 * Architecture:
 *   Browser → WebSocket (ws://localhost:8081) → Relay Server → UDP/DDS → Robot
 *
 * The relay server handles:
 *   - Go1: unitree_legged_sdk C++ UDP HighCmd/HighState protocol
 *   - Go2: unitree_sdk2 DDS high-level client API
 *
 * Protocol (WebSocket relay):
 *   { "type": "connect", "payload": { "robot": "go1" | "go2" } }
 *   { "type": "move", "payload": { "direction": "forward"|"backward"|"left"|"right"|"stop", "speed": 0-100 } }
 *   { "type": "body_height", "payload": { "height": -0.18..0.28 } }
 *   { "type": "gait", "payload": { "gaitType": 0-4 } }
 *   { "type": "pose", "payload": { "yaw": -3.14..3.14, "pitch": -0.52..0.52, "roll": -0.35..0.35 } }
 *   { "type": "damp" } — damping mode (all motors release)
 *   { "type": "stand_up" }
 *   { "type": "stand_down" }
 *   { "type": "sit" } — crouch/sit down
 *   { "type": "dance", "payload": { "pattern": "dance1"|"dance2" } }
 *   { "type": "jump", "payload": { "yaw": 0 } }
 *   { "type": "flip" } — backflip (Go2 only)
 *   { "type": "emergency_stop" }
 *   { "type": "custom", "payload": { "cmd": "<string>", "args": {} } }
 *
 * Telemetry (relay → browser):
 *   { "type": "battery", "payload": { "voltage": 25.2, "percentage": 78 } }
 *   { "type": "imu", "payload": { "ax", "ay", "az", "gx", "gy", "gz" } }
 *   { "type": "joint_state", "payload": { "q": [12 values], "qd": [12], "tau": [12] } }
 *   { "type": "terrain", "payload": { "type": "flat"|"stairs"|"rough", "confidence": 0.9 } }
 *   { "type": "foot_force", "payload": { "FL", "FR", "RL", "RR": [0-100 N] } }
 *   { "type": "state", "payload": { "mode": 0-13, "gaitType": 0-4, "speedLevel": 0-2 } }
 *   { "type": "position", "payload": { "x": 0.0, "y": 0.0, "yaw": 0.0 } }
 *   { "type": "heartbeat", "payload": { "uptime_ms": 123456 } }
 *   { "type": "ack", "payload": { "command_id": 123, "status": "ok"|"error" } }
 *
 * Usage:
 *   const unitree = new UnitreeGo1Adapter({ relayUrl: 'ws://localhost:8081', robot: 'go1' })
 *   await unitree.connect()
 *   agent.start(unitree)
 *
 * Safety envelope (see docs/hil/unitree-go1/SAFETY.md):
 *   - Max speed: 1.5 m/s (Go1), 2.0 m/s (Go2)
 *   - Max stair incline: 30°
 *   - Min battery: 22.0V (Go1) / 21.6V (Go2) — auto e-stop below
 *   - Max drop height: 0.20m
 *   - Surface requirements: flat/rough ground for trot, stairs for stair gait
 */

import type { Blackboard, AdapterCommand } from '../engine/types'
import type {
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
  RobotAdapterV2,
} from '@cyber-agent/sdk/adapter/contract'
import { emitAdapterTx, emitAdapterRx } from '../engine/tracer'

// ─── Constants ────────────────────────────────────────────────────

/** Default relay server URL */
export const DEFAULT_RELAY_URL = 'ws://localhost:8081'

/** Protocol version */
export const PROTOCOL_VERSION = 'v2'

/** Default heartbeat interval (ms) */
export const DEFAULT_HEARTBEAT_INTERVAL = 1000

/** Default reconnect interval (ms) */
export const DEFAULT_RECONNECT_INTERVAL = 3000

/** Max reconnect attempts (-1 = infinite) */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10

/** Command queue max size */
export const DEFAULT_QUEUE_MAX_SIZE = 100

/** Maximum speed percentage (0–100) */
export const MAX_SPEED = 100

/** Go1 battery thresholds (V) */
export const GO1_MIN_BATTERY_VOLTAGE = 22.0
export const GO1_MAX_BATTERY_VOLTAGE = 25.2

/** Go2 battery thresholds (V) */
export const GO2_MIN_BATTERY_VOLTAGE = 21.6
export const GO2_MAX_BATTERY_VOLTAGE = 25.2

/** Maximum body height adjustment (m) */
export const MAX_BODY_HEIGHT = 0.28

/** Minimum body height adjustment (m) */
export const MIN_BODY_HEIGHT = -0.18

/** Maximum yaw angle (rad) */
export const MAX_YAW = Math.PI

/** Maximum pitch angle (rad) */
export const MAX_PITCH = 0.52

/** Maximum roll angle (rad) */
export const MAX_ROLL = 0.35

/** Number of joints (3 DOF × 4 legs) */
export const NUM_JOINTS = 12

/** Default motor speed limit (rad/s) */
export const DEFAULT_MOTOR_SPEED_LIMIT = 21.0

// ─── Robot Types ─────────────────────────────────────────────────

export type RobotModel = 'go1' | 'go2'

// ─── Gait Types (Unitree SDK) ─────────────────────────────────────

export enum GaitType {
  Idle = 0,
  TrotWalk = 1,
  TrotRun = 2,
  StairsClimb = 3,
  TrotObstacle = 4,
}

// ─── Motion Modes (Unitree SDK HighCmd) ───────────────────────────

export enum MotionMode {
  Idle = 0,
  Standing = 1,
  Walking = 2,
  Position = 3,
  PathPlanning = 4,
  StandDown = 5,
  StandUp = 6,
  Damping = 7,
  Recovery = 8,
  Backflip = 9,
  JumpYaw = 10,
  StraightHand = 11,
  Dance1 = 12,
  Dance2 = 13,
}

// ─── Speed Levels ─────────────────────────────────────────────────

export enum SpeedLevel {
  Low = 0,
  Medium = 1,
  High = 2,
}

// ─── Terrain Types ────────────────────────────────────────────────

export type TerrainType = 'flat' | 'stairs' | 'rough' | 'unknown'

// ─── UnitreeGo1AdapterConfig ──────────────────────────────────────

export interface UnitreeGo1AdapterConfig {
  /** WebSocket relay server URL. Default: ws://localhost:8081 */
  relayUrl?: string
  /** Robot model: 'go1' or 'go2'. Default: 'go1' */
  robot?: RobotModel
  /** Heartbeat interval in ms. Default: 1000 */
  heartbeatIntervalMs?: number
  /** Reconnect interval in ms. Default: 3000 */
  reconnectIntervalMs?: number
  /** Max reconnect attempts. Default: 10 */
  maxReconnectAttempts?: number
  /** Command queue max size. Default: 100 */
  queueMaxSize?: number
  /** Auto-connect on construction. Default: false */
  autoConnect?: boolean
  /** Protocol version. Default: 'v2' */
  protocolVersion?: string
  /** Motor speed limit (rad/s). Default: 21.0 */
  motorSpeedLimit?: number
}

// ─── Protocol Message Types ───────────────────────────────────────

export interface ProtocolMessage {
  type: string
  payload: Record<string, unknown>
  t: number
}

// ─── Telemetry Types ──────────────────────────────────────────────

export type UnitreeTelemetryType =
  | 'battery'
  | 'imu'
  | 'joint_state'
  | 'terrain'
  | 'foot_force'
  | 'state'
  | 'position'
  | 'heartbeat'
  | 'ack'

// ─── UnitreeGo1Adapter ────────────────────────────────────────────

export class UnitreeGo1Adapter implements RobotAdapterV2 {
  readonly type = 'unitree-go1' as const
  readonly name = 'Unitree Go1/Go2 Robot Adapter'
  readonly contractVersion = 'v2' as const

  private config: Required<UnitreeGo1AdapterConfig>
  private ws: WebSocket | null = null
  private _telemetryCallback: ((event: TelemetryEvent) => void) | null = null
  private commandQueue: AdapterCommand[] = []
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _connected = false
  private isConnecting = false
  private commandIdCounter = 0
  private isConnectedCallback?: (connected: boolean) => void
  private terrainType: TerrainType = 'unknown'

  constructor(config: UnitreeGo1AdapterConfig = {}) {
    this.config = {
      relayUrl: config.relayUrl ?? DEFAULT_RELAY_URL,
      robot: config.robot ?? 'go1',
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL,
      reconnectIntervalMs: config.reconnectIntervalMs ?? DEFAULT_RECONNECT_INTERVAL,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      queueMaxSize: config.queueMaxSize ?? DEFAULT_QUEUE_MAX_SIZE,
      autoConnect: config.autoConnect ?? false,
      protocolVersion: config.protocolVersion ?? PROTOCOL_VERSION,
      motorSpeedLimit: config.motorSpeedLimit ?? DEFAULT_MOTOR_SPEED_LIMIT,
    }

    if (this.config.autoConnect) {
      this.connect().catch(() => {
        // Connection errors are expected when no hardware present
      })
    }
  }

  setOnConnect(callback: (connected: boolean) => void) {
    this.isConnectedCallback = callback
  }

  // ─── Connection Management ───────────────────────────────────

  get connected(): boolean {
    return this._connected
  }

  get protocolVersion(): string {
    return this.config.protocolVersion
  }

  get robot(): RobotModel {
    return this.config.robot
  }

  /**
   * Establish connection to the relay server.
   * The relay server bridges WebSocket ↔ robot protocol (UDP/DDS).
   */
  async connect(): Promise<void> {
    if (this._connected || this.isConnecting) return
    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.relayUrl)
      } catch (err) {
        this.isConnecting = false
        reject(err)
        return
      }

      this.ws.onopen = () => {
        // Send connect handshake with robot model
        const handshake: ProtocolMessage = {
          type: 'connect',
          payload: { robot: this.config.robot },
          t: Date.now(),
        }
        this.ws!.send(JSON.stringify(handshake))

        this._connected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.onConnect(true)
        this.startHeartbeat()
        this.flushQueue()
        resolve()
      }

      this.ws.onclose = (event) => {
        this._connected = false
        this.isConnecting = false
        this.onConnect(false)
        this.stopHeartbeat()
        this.scheduleReconnect()
        reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`))
      }

      this.ws.onerror = (err) => {
        this.isConnecting = false
        reject(err)
      }

      this.ws.onmessage = (event) => {
        this.handleIncoming(event.data)
      }
    })
  }

  private onConnect(connected: boolean) {
    this.isConnectedCallback?.(connected)
  }

  private scheduleReconnect(): void {
    const max = this.config.maxReconnectAttempts
    if (max !== -1 && this.reconnectAttempts >= max) {
      console.warn('[UnitreeGo1Adapter] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectIntervalMs * Math.pow(1.5, this.reconnectAttempts),
      30000,
    )
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  private flushQueue(): void {
    while (this.commandQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const cmd = this.commandQueue.shift()!
      this.sendCommand(cmd)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const msg: ProtocolMessage = {
          type: 'heartbeat',
          payload: { t: Date.now() },
          t: performance.now(),
        }
        this.ws.send(JSON.stringify(msg))
      }
    }, this.config.heartbeatIntervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ─── v2 lifecycle ───────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, 'SDK shutdown')
      this.ws = null
    }
    this._connected = false
    this.isConnecting = false
    this.onConnect(false)
    return Promise.resolve()
  }

  init(_bb: Blackboard): void {
    console.log(`[UnitreeGo1Adapter] Initialized (robot: ${this.config.robot})`)
  }

  update(_bb: Blackboard): void {
    // Periodic state sync handled by sendCommand
  }

  destroy(): void {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, 'SDK shutdown')
      this.ws = null
    }
    this._connected = false
    this.commandQueue = []
    console.log('[UnitreeGo1Adapter] Destroyed')
  }

  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    this._telemetryCallback = callback
    return () => { this._telemetryCallback = null }
  }

  // ─── Command Handling ────────────────────────────────────────

  sendCommand(command: AdapterCommand): void {
    emitAdapterTx(command.type, performance.now())

    if (!this._connected || this.ws?.readyState !== WebSocket.OPEN) {
      if (this.commandQueue.length < this.config.queueMaxSize) {
        this.commandQueue.push(command)
      } else {
        console.warn('[UnitreeGo1Adapter] Command queue full, dropping:', command.type)
      }
      return
    }

    try {
      const msg = this.serializeCommand(command)
      this.ws.send(JSON.stringify(msg))
    } catch (err) {
      console.error('[UnitreeGo1Adapter] Send failed:', err)
      this.commandQueue.push(command)
    }
  }

  /**
   * Serialize a command to a protocol v2 message.
   * Public for testing.
   */
  serializeCommand(command: AdapterCommand): ProtocolMessage {
    const cmd = command as any
    const id = ++this.commandIdCounter

    switch (cmd.type) {
      case 'move': {
        const dir = cmd.payload?.direction ?? 'forward'
        const speed = Math.max(0, Math.min(MAX_SPEED, cmd.payload?.speed ?? 50))
        return {
          type: 'move',
          payload: { direction: dir, speed, command_id: id },
          t: Date.now(),
        }
      }

      case 'body_height': {
        const height = Math.max(MIN_BODY_HEIGHT, Math.min(MAX_BODY_HEIGHT, cmd.payload?.height ?? 0))
        return {
          type: 'body_height',
          payload: { height, command_id: id },
          t: Date.now(),
        }
      }

      case 'gait': {
        const gaitType = cmd.payload?.gaitType ?? GaitType.TrotWalk
        return {
          type: 'gait',
          payload: { gaitType, command_id: id },
          t: Date.now(),
        }
      }

      case 'pose': {
        const yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, cmd.payload?.yaw ?? 0))
        const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, cmd.payload?.pitch ?? 0))
        const roll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, cmd.payload?.roll ?? 0))
        return {
          type: 'pose',
          payload: { yaw, pitch, roll, command_id: id },
          t: Date.now(),
        }
      }

      case 'damp':
        return { type: 'damp', payload: { command_id: id }, t: Date.now() }

      case 'stand_up':
        return { type: 'stand_up', payload: { command_id: id }, t: Date.now() }

      case 'stand_down':
        return { type: 'stand_down', payload: { command_id: id }, t: Date.now() }

      case 'sit':
        return { type: 'sit', payload: { command_id: id }, t: Date.now() }

      case 'dance': {
        const pattern = cmd.payload?.pattern ?? 'dance1'
        return {
          type: 'dance',
          payload: { pattern, command_id: id },
          t: Date.now(),
        }
      }

      case 'jump': {
        const yaw = cmd.payload?.yaw ?? 0
        return {
          type: 'jump',
          payload: { yaw, command_id: id },
          t: Date.now(),
        }
      }

      case 'flip':
        return { type: 'flip', payload: { command_id: id }, t: Date.now() }

      case 'emergency_stop':
        return { type: 'emergency_stop', payload: { command_id: id }, t: Date.now() }

      case 'custom': {
        return {
          type: 'custom',
          payload: {
            cmd: cmd.payload?.cmd ?? '',
            args: cmd.payload?.args ?? {},
            command_id: id,
          },
          t: Date.now(),
        }
      }

      default:
        return {
          type: 'custom',
          payload: { command: cmd.type, args: cmd.payload ?? {}, command_id: id },
          t: Date.now(),
        }
    }
  }

  /**
   * Parse a protocol message into a TelemetryEvent.
   * Public for testing.
   */
  parseTelemetry(msg: ProtocolMessage): TelemetryEvent | null {
    if (msg.type === 'battery') {
      return {
        type: 'battery',
        payload: {
          voltage: msg.payload.voltage ?? 0,
          percentage: msg.payload.percentage ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'imu') {
      return {
        type: 'imu',
        payload: {
          ax: msg.payload.ax ?? 0,
          ay: msg.payload.ay ?? 0,
          az: msg.payload.az ?? 0,
          gx: msg.payload.gx ?? 0,
          gy: msg.payload.gy ?? 0,
          gz: msg.payload.gz ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'joint_state') {
      const q = Array.isArray(msg.payload.q) ? msg.payload.q : new Array(NUM_JOINTS).fill(0)
      const qd = Array.isArray(msg.payload.qd) ? msg.payload.qd : new Array(NUM_JOINTS).fill(0)
      const tau = Array.isArray(msg.payload.tau) ? msg.payload.tau : new Array(NUM_JOINTS).fill(0)
      return {
        type: 'joint_state',
        payload: { q, qd, tau },
        t: msg.t,
      }
    }

    if (msg.type === 'terrain') {
      this.terrainType = (msg.payload.type as TerrainType) ?? 'unknown'
      return {
        type: 'terrain',
        payload: {
          type: this.terrainType,
          confidence: msg.payload.confidence ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'foot_force') {
      const payload = msg.payload as Record<string, unknown>
      return {
        type: 'foot_force',
        payload: {
          FL: (payload.FL as number) ?? 0,
          FR: (payload.FR as number) ?? 0,
          RL: (payload.RL as number) ?? 0,
          RR: (payload.RR as number) ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'state') {
      return {
        type: 'state',
        payload: {
          mode: msg.payload.mode ?? 0,
          gaitType: msg.payload.gaitType ?? 0,
          speedLevel: msg.payload.speedLevel ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'position') {
      return {
        type: 'position',
        payload: {
          x: msg.payload.x ?? 0,
          y: msg.payload.y ?? 0,
          yaw: msg.payload.yaw ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'heartbeat') {
      return {
        type: 'heartbeat',
        payload: { uptime_ms: msg.payload.uptime_ms ?? 0 },
        t: msg.t,
      }
    }

    if (msg.type === 'ack') {
      return {
        type: 'ack',
        payload: {
          command_id: msg.payload.command_id ?? 0,
          status: msg.payload.status ?? 'unknown',
        },
        t: msg.t,
      }
    }

    return null
  }

  // ─── Telemetry Handling ─────────────────────────────────────

  private handleIncoming(data: string): void {
    try {
      const msg: ProtocolMessage = JSON.parse(data)
      const event = this.parseTelemetry(msg)
      if (event && this._telemetryCallback) {
        this._telemetryCallback(event)
      }
      emitAdapterRx({ type: event?.type ?? 'unknown', raw: false }, performance.now())
    } catch {
      console.warn('[UnitreeGo1Adapter] Invalid message:', data)
      emitAdapterRx({ type: 'error', raw: false, message: 'parse error' }, performance.now())
    }
  }

  // ─── Convenience Methods ─────────────────────────────────────

  /**
   * Move the robot.
   * @param direction - 'forward' | 'backward' | 'left' | 'right' | 'stop'
   * @param speed - 0–100
   */
  move(direction: 'forward' | 'backward' | 'left' | 'right' | 'stop', speed: number = 50): void {
    this.sendCommand({
      type: 'move',
      payload: { direction, speed: Math.max(0, Math.min(MAX_SPEED, speed)) },
    })
  }

  /**
   * Set body height.
   * @param height - meters (-0.18 to 0.28)
   */
  setBodyHeight(height: number): void {
    this.sendCommand({
      type: 'body_height',
      payload: { height: Math.max(MIN_BODY_HEIGHT, Math.min(MAX_BODY_HEIGHT, height)) },
    })
  }

  /**
   * Set gait type.
   * @param gaitType - GaitType enum value
   */
  setGait(gaitType: GaitType): void {
    this.sendCommand({ type: 'gait', payload: { gaitType } })
  }

  /**
   * Set target pose (Euler angles).
   * @param yaw - yaw angle in radians (-π to π)
   * @param pitch - pitch angle in radians (-0.52 to 0.52)
   * @param roll - roll angle in radians (-0.35 to 0.35)
   */
  setPose(yaw: number, pitch: number, roll: number): void {
    this.sendCommand({
      type: 'pose',
      payload: {
        yaw: Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw)),
        pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)),
        roll: Math.max(-MAX_ROLL, Math.min(MAX_ROLL, roll)),
      },
    })
  }

  /**
   * Enter damping mode (all motors release).
   * Used for manual robot lifting/transport.
   */
  damping(): void {
    this.sendCommand({ type: 'damp', payload: {} })
  }

  /**
   * Stand up from damping/sit position.
   */
  standUp(): void {
    this.sendCommand({ type: 'stand_up', payload: {} })
  }

  /**
   * Sit down (crouch).
   */
  sit(): void {
    this.sendCommand({ type: 'sit', payload: {} })
  }

  /**
   * Stand down (lie flat).
   */
  standDown(): void {
    this.sendCommand({ type: 'stand_down', payload: {} })
  }

  /**
   * Play dance routine.
   * @param pattern - 'dance1' | 'dance2'
   */
  dance(pattern: 'dance1' | 'dance2' = 'dance1'): void {
    this.sendCommand({ type: 'dance', payload: { pattern } })
  }

  /**
   * Jump with optional yaw rotation.
   * @param yaw - yaw rotation during jump in radians
   */
  jump(yaw: number = 0): void {
    this.sendCommand({ type: 'jump', payload: { yaw } })
  }

  /**
   * Backflip (Go2 only).
   */
  flip(): void {
    this.sendCommand({ type: 'flip', payload: {} })
  }

  /**
   * Emergency stop — cuts all motors immediately.
   */
  emergencyStop(): void {
    this.sendCommand({ type: 'emergency_stop', payload: {} })
  }

  /**
   * Get current terrain type.
   */
  getTerrainType(): TerrainType {
    return this.terrainType
  }

  // ─── Self-Test ──────────────────────────────────────────────

  selfTest(): SelfTestReport {
    const hasWebSocket = typeof WebSocket !== 'undefined'
    const isConnected = this._connected
    const wsOpen = this.ws !== null && this.ws.readyState === WebSocket.OPEN
    const minVoltage = this.config.robot === 'go2' ? GO2_MIN_BATTERY_VOLTAGE : GO1_MIN_BATTERY_VOLTAGE

    return {
      ok: isConnected,
      status: isConnected ? 'healthy' : hasWebSocket ? 'degraded' : 'unhealthy',
      summary: `UnitreeGo1Adapter — ${isConnected ? 'connected' : 'disconnected'} to ${this.config.relayUrl} (robot: ${this.config.robot}, protocol ${this.config.protocolVersion})`,
      checks: [
        { name: 'websocket_api', ok: hasWebSocket, message: hasWebSocket ? 'WebSocket API available' : 'WebSocket not available' },
        { name: 'connection', ok: wsOpen, message: wsOpen ? 'WebSocket open' : 'WebSocket closed' },
        { name: 'command_queue', ok: true, message: `Queue depth: ${this.commandQueue.length}` },
        { name: 'telemetry', ok: this._telemetryCallback !== null, message: this._telemetryCallback ? 'Telemetry subscribed' : 'No subscriber' },
        { name: 'protocol_version', ok: this.config.protocolVersion === PROTOCOL_VERSION, message: `Protocol ${this.config.protocolVersion}` },
        { name: 'motor_speed_limit', ok: this.config.motorSpeedLimit > 0, message: `Speed limit: ${this.config.motorSpeedLimit} rad/s` },
        { name: 'min_battery_voltage', ok: true, message: `Min safe voltage: ${minVoltage}V (${this.config.robot})` },
      ],
      timestamp: Date.now(),
      version: 'v2',
    }
  }

  // ─── Capabilities ────────────────────────────────────────────

  capabilities(): RobotCapabilitiesV2 {
    const isGo2 = this.config.robot === 'go2'
    const minVoltage = isGo2 ? GO2_MIN_BATTERY_VOLTAGE : GO1_MIN_BATTERY_VOLTAGE
    const maxVoltage = isGo2 ? GO2_MAX_BATTERY_VOLTAGE : GO1_MAX_BATTERY_VOLTAGE

    return {
      movement: true,
      rotation: true,
      speed: true,
      led: false,
      sound: false,
      gesture: true,
      maxSpeed: isGo2 ? 200 : 150, // percentage (Go2 faster)
      maxRotationSpeed: 180,
      batteryReporting: true,
      distanceReporting: false, // Go1/Go2 don't have front distance sensor for navigation
      imuReporting: true,
      selfTestable: true,
      hardwareEStop: true,
      maxBatteryVoltage: maxVoltage,
      minBatteryVoltage: minVoltage,
    }
  }
}

// ─── Factory function ─────────────────────────────────────────────

export function createUnitreeGo1Adapter(config: UnitreeGo1AdapterConfig = {}): UnitreeGo1Adapter {
  return new UnitreeGo1Adapter(config)
}
