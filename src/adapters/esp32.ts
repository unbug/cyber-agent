/**
 * ESP32 Adapter — WebSocket Protocol v2
 *
 * Controls a generic ESP32 robot running the CyberAgent reference firmware.
 * Protocol v2 is a JSON-over-WebSocket wire format with typed messages
 * for commands, telemetry, heartbeat, and diagnostics.
 *
 * Protocol v2 message format:
 *   { "type": "<message_type>", "payload": { ... }, "t": <timestamp_ms> }
 *
 * Direction: browser → ESP32 (Command)
 *   - move:        { "type": "move", "payload": { "direction": "forward"|"backward"|"stop", "speed": 0-100 } }
 *   - motors:      { "type": "motors", "payload": { "left": -100..100, "right": -100..100 } }
 *   - led:         { "type": "led", "payload": { "r": 0-255, "g": 0-255, "b": 0-255, "brightness": 0-255 } }
 *   - led_matrix:  { "type": "led_matrix", "payload": { "pixels": [r,g,b, ...] } }
 *   - sound:       { "type": "sound", "payload": { "frequency": 200-20000, "duration_ms": 0-5000, "volume": 0-100 } }
 *   - gesture:     { "type": "gesture", "payload": { "pattern": "wave"|"rainbow"|"pulse"|"heartbeat"|"custom", "duration_ms": 0-10000 } }
 *   - emergency_stop: { "type": "emergency_stop", "payload": {} }
 *   - custom:      { "type": "custom", "payload": { "command": "<string>", "args": { ... } } }
 *
 * Direction: ESP32 → browser (Telemetry)
 *   - battery:     { "type": "battery", "payload": { "voltage": 7.4, "percentage": 85 } }
 *   - imu:         { "type": "imu", "payload": { "ax": 0.01, "ay": -0.02, "az": 0.98, "gx": 0.0, "gy": 0.1, "gz": 0.0 } }
 *   - distance:    { "type": "distance", "payload": { "value": 42, "unit": "cm" } }
 *   - bump:        { "type": "bump", "payload": { "side": "left"|"right"|"both", "force": 0.5 } }
 *   - motor_state: { "type": "motor_state", "payload": { "left_rpm": 120, "right_rpm": 118, "load_left": 0.3, "load_right": 0.28 } }
 *   - heartbeat:   { "type": "heartbeat", "payload": { "uptime_ms": 123456, "free_heap": 45678 } }
 *   - ack:         { "type": "ack", "payload": { "command_id": 123, "status": "ok"|"error" } }
 *
 * Usage:
 *   const esp32 = new ESP32Adapter({ url: 'ws://192.168.4.1:8080' })
 *   await esp32.connect()
 *   agent.start(esp32)
 */

import type { Blackboard, AdapterCommand } from '../engine/types'
import type {
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
  RobotAdapterV2,
} from '@cyber-agent/sdk/adapter/contract'
import { emitAdapterTx, emitAdapterRx } from '../engine/tracer'

// ─── WebSocket Protocol v2 Constants ──────────────────────────────

export const PROTOCOL_VERSION = 'v2'

/** Default heartbeat interval (ms) */
export const DEFAULT_HEARTBEAT_INTERVAL = 1000

/** Default reconnect interval (ms) */
export const DEFAULT_RECONNECT_INTERVAL = 3000

/** Max reconnect attempts before giving up (-1 = infinite) */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10

/** Command queue max size */
export const DEFAULT_QUEUE_MAX_SIZE = 100

/** Maximum speed (0–100) */
export const MAX_SPEED = 100

/** Minimum safe battery voltage (V) for LiPo 2S */
export const MIN_BATTERY_VOLTAGE = 6.0

/** Maximum battery voltage (V) for LiPo 2S */
export const MAX_BATTERY_VOLTAGE = 8.4

// ─── Command Types ────────────────────────────────────────────────

export type ESP32CommandType =
  | 'move'
  | 'motors'
  | 'led'
  | 'led_matrix'
  | 'sound'
  | 'gesture'
  | 'emergency_stop'
  | 'custom'

// ─── Telemetry Types ──────────────────────────────────────────────

export type ESP32TelemetryType =
  | 'battery'
  | 'imu'
  | 'distance'
  | 'bump'
  | 'motor_state'
  | 'heartbeat'
  | 'ack'

// ─── Protocol v2 Message ──────────────────────────────────────────

export interface ProtocolMessage {
  /** Message type identifier */
  type: string
  /** Payload keyed by message type */
  payload: Record<string, unknown>
  /** Timestamp in ms (ESP32 or browser) */
  t: number
}

// ─── ESP32AdapterConfig ───────────────────────────────────────────

export interface ESP32AdapterConfig {
  /** WebSocket URL (e.g., 'ws://192.168.4.1:8080') */
  url: string
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
}

// ─── ESP32Adapter ─────────────────────────────────────────────────

export class ESP32Adapter implements RobotAdapterV2 {
  readonly type = 'esp32' as const
  readonly name = 'ESP32 Robot Adapter'
  readonly contractVersion = 'v2' as const

  private config: Required<ESP32AdapterConfig>
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

  constructor(config: ESP32AdapterConfig) {
    this.config = {
      url: config.url,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL,
      reconnectIntervalMs: config.reconnectIntervalMs ?? DEFAULT_RECONNECT_INTERVAL,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      queueMaxSize: config.queueMaxSize ?? DEFAULT_QUEUE_MAX_SIZE,
      autoConnect: config.autoConnect ?? false,
      protocolVersion: config.protocolVersion ?? PROTOCOL_VERSION,
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

  /**
   * Establish WebSocket connection to the ESP32.
   * Uses WebSocket protocol v2 with heartbeat and auto-reconnect.
   */
  async connect(): Promise<void> {
    if (this._connected || this.isConnecting) return
    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url)
      } catch (err) {
        this.isConnecting = false
        reject(err)
        return
      }

      this.ws.onopen = () => {
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
      console.warn('[ESP32Adapter] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    // Exponential backoff: 3s, 4.5s, 6.75s, ... up to 30s
    const delay = Math.min(
      this.config.reconnectIntervalMs * Math.pow(1.5, this.reconnectAttempts),
      30000,
    )
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Will be retried in onclose
      })
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
    console.log('[ESP32Adapter] Initialized')
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
    console.log('[ESP32Adapter] Destroyed')
  }

  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    this._telemetryCallback = callback
    return () => { this._telemetryCallback = null }
  }

  // ─── Command Handling ────────────────────────────────────────

  sendCommand(command: AdapterCommand): void {
    emitAdapterTx(command.type, performance.now())

    if (!this._connected || this.ws?.readyState !== WebSocket.OPEN) {
      // Queue command for delivery when reconnected
      if (this.commandQueue.length < this.config.queueMaxSize) {
        this.commandQueue.push(command)
      } else {
        console.warn('[ESP32Adapter] Command queue full, dropping:', command.type)
      }
      return
    }

    try {
      const msg = this.serializeCommand(command)
      this.ws.send(JSON.stringify(msg))
    } catch (err) {
      console.error('[ESP32Adapter] Send failed:', err)
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
          payload: {
            direction: dir === 'stop' ? 'stop' : (dir === 'backward' ? 'backward' : 'forward'),
            speed,
            command_id: id,
          },
          t: Date.now(),
        }
      }

      case 'motors': {
        const left = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, cmd.payload?.left ?? 0))
        const right = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, cmd.payload?.right ?? 0))
        return {
          type: 'motors',
          payload: { left, right, command_id: id },
          t: Date.now(),
        }
      }

      case 'led': {
        const r = Math.max(0, Math.min(255, cmd.payload?.r ?? 0))
        const g = Math.max(0, Math.min(255, cmd.payload?.g ?? 0))
        const b = Math.max(0, Math.min(255, cmd.payload?.b ?? 0))
        const brightness = Math.max(0, Math.min(255, cmd.payload?.brightness ?? 255))
        return {
          type: 'led',
          payload: { r, g, b, brightness, command_id: id },
          t: Date.now(),
        }
      }

      case 'led_matrix': {
        const pixels = cmd.payload?.pixels ?? []
        return {
          type: 'led_matrix',
          payload: { pixels, command_id: id },
          t: Date.now(),
        }
      }

      case 'sound': {
        const frequency = Math.max(200, Math.min(20000, cmd.payload?.frequency ?? 1000))
        const duration = Math.max(0, Math.min(5000, cmd.payload?.duration_ms ?? 500))
        const volume = Math.max(0, Math.min(100, cmd.payload?.volume ?? 80))
        return {
          type: 'sound',
          payload: { frequency, duration_ms: duration, volume, command_id: id },
          t: Date.now(),
        }
      }

      case 'gesture': {
        const pattern = cmd.payload?.pattern ?? 'wave'
        const duration = Math.max(0, Math.min(10000, cmd.payload?.duration_ms ?? 2000))
        return {
          type: 'gesture',
          payload: { pattern, duration_ms: duration, command_id: id },
          t: Date.now(),
        }
      }

      case 'emergency_stop': {
        return {
          type: 'emergency_stop',
          payload: { command_id: id },
          t: Date.now(),
        }
      }

      case 'custom': {
        return {
          type: 'custom',
          payload: {
            command: cmd.payload?.command ?? '',
            args: cmd.payload?.args ?? {},
            command_id: id,
          },
          t: Date.now(),
        }
      }

      default:
        // Forward unknown commands as custom
        return {
          type: 'custom',
          payload: { command: cmd.type, args: cmd.payload ?? {}, command_id: id },
          t: Date.now(),
        }
    }
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
      console.warn('[ESP32Adapter] Invalid message:', data)
      emitAdapterRx({ type: 'error', raw: false, message: 'parse error' }, performance.now())
    }
  }

  /**
   * Parse a protocol v2 message into a TelemetryEvent.
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

    if (msg.type === 'distance') {
      return {
        type: 'distance',
        payload: {
          value: msg.payload.value ?? 0,
          unit: msg.payload.unit ?? 'cm',
        },
        t: msg.t,
      }
    }

    if (msg.type === 'bump') {
      return {
        type: 'bump',
        payload: {
          side: msg.payload.side ?? 'none',
          force: msg.payload.force ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'motor_state') {
      return {
        type: 'motor_state',
        payload: {
          left_rpm: msg.payload.left_rpm ?? 0,
          right_rpm: msg.payload.right_rpm ?? 0,
          load_left: msg.payload.load_left ?? 0,
          load_right: msg.payload.load_right ?? 0,
        },
        t: msg.t,
      }
    }

    if (msg.type === 'heartbeat') {
      return {
        type: 'heartbeat',
        payload: {
          uptime_ms: msg.payload.uptime_ms ?? 0,
          free_heap: msg.payload.free_heap ?? 0,
        },
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

  // ─── Convenience Methods ─────────────────────────────────────

  /**
   * Move the robot.
   * @param direction - 'forward' | 'backward' | 'stop'
   * @param speed - 0–100
   */
  move(direction: 'forward' | 'backward' | 'stop', speed: number = 50): void {
    this.sendCommand({
      type: 'move',
      payload: { direction, speed: Math.max(0, Math.min(MAX_SPEED, speed)) },
    })
  }

  /**
   * Set individual motor speeds for differential drive.
   * @param leftSpeed - Left motor speed (-100 to 100)
   * @param rightSpeed - Right motor speed (-100 to 100)
   */
  setMotors(leftSpeed: number, rightSpeed: number): void {
    this.sendCommand({
      type: 'motors',
      payload: {
        left: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, leftSpeed)),
        right: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, rightSpeed)),
      },
    })
  }

  /**
   * Set LED color.
   * @param r - Red (0–255)
   * @param g - Green (0–255)
   * @param b - Blue (0–255)
   * @param brightness - Overall brightness (0–255)
   */
  setLED(r: number, g: number, b: number, brightness: number = 255): void {
    this.sendCommand({
      type: 'led',
      payload: {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
        brightness: Math.max(0, Math.min(255, brightness)),
      },
    })
  }

  /**
   * Play a sound.
   * @param frequency - 200–20000 Hz
   * @param duration_ms - 0–5000 ms
   * @param volume - 0–100
   */
  playSound(frequency: number = 1000, duration_ms: number = 500, volume: number = 80): void {
    this.sendCommand({
      type: 'sound',
      payload: {
        frequency: Math.max(200, Math.min(20000, frequency)),
        duration_ms: Math.max(0, Math.min(5000, duration_ms)),
        volume: Math.max(0, Math.min(100, volume)),
      },
    })
  }

  /**
   * Play an LED gesture pattern.
   */
  playGesture(pattern: 'wave' | 'rainbow' | 'pulse' | 'heartbeat' | 'custom', duration_ms: number = 2000): void {
    this.sendCommand({
      type: 'gesture',
      payload: { pattern, duration_ms },
    })
  }

  /**
   * Emergency stop — cuts all motors immediately.
   */
  emergencyStop(): void {
    this.sendCommand({ type: 'emergency_stop', payload: {} })
  }

  // ─── Self-Test ──────────────────────────────────────────────

  selfTest(): SelfTestReport {
    const hasWebSocket = typeof WebSocket !== 'undefined'
    const isConnected = this._connected
    const wsOpen = this.ws !== null && this.ws.readyState === WebSocket.OPEN

    return {
      ok: isConnected,
      status: isConnected ? 'healthy' : hasWebSocket ? 'degraded' : 'unhealthy',
      summary: `ESP32Adapter — ${isConnected ? 'connected' : 'disconnected'} to ${this.config.url} (protocol ${this.config.protocolVersion})`,
      checks: [
        { name: 'websocket_api', ok: hasWebSocket, message: hasWebSocket ? 'WebSocket API available' : 'WebSocket not available' },
        { name: 'connection', ok: wsOpen, message: wsOpen ? 'WebSocket open' : 'WebSocket closed' },
        { name: 'queue', ok: true, message: `Queue depth: ${this.commandQueue.length}` },
        { name: 'telemetry', ok: this._telemetryCallback !== null, message: this._telemetryCallback ? 'Telemetry subscribed' : 'No subscriber' },
        { name: 'protocol_version', ok: this.config.protocolVersion === PROTOCOL_VERSION, message: `Protocol ${this.config.protocolVersion}` },
      ],
      timestamp: Date.now(),
      version: 'v2',
    }
  }

  // ─── Capabilities ────────────────────────────────────────────

  capabilities(): RobotCapabilitiesV2 {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: true,
      maxSpeed: MAX_SPEED,
      maxRotationSpeed: 360,
      batteryReporting: true,
      distanceReporting: true,
      imuReporting: true,
      selfTestable: true,
      maxBatteryVoltage: MAX_BATTERY_VOLTAGE,
      minBatteryVoltage: MIN_BATTERY_VOLTAGE,
      hardwareEStop: true,
    }
  }
}

// ─── Factory function ─────────────────────────────────────────────

export function createESP32Adapter(config: ESP32AdapterConfig): ESP32Adapter {
  return new ESP32Adapter(config)
}
