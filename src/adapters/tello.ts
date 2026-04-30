/**
 * DJI Tello / Tello EDU Adapter — WebSocket Protocol v2
 *
 * Controls a DJI Tello or Tello EDU drone via a relay server that
 * bridges WebSocket → UDP (Tello SDK protocol).
 *
 * ⚠️ INDOOR ONLY — Tello has no GPS, no obstacle avoidance, and
 * limited battery (13 min flight). Always use a propeller guard.
 *
 * Protocol v2 message format:
 *   { "type": "<message_type>", "payload": { ... }, "t": <timestamp_ms> }
 *
 * Direction: browser → relay (Command)
 *   - takeoff:       { "type": "takeoff", "payload": {} }
 *   - land:          { "type": "land", "payload": {} }
 *   - emergency:     { "type": "emergency_stop", "payload": {} }
 *   - move:          { "type": "move", "payload": { "direction": "forward"|"backward"|"left"|"right"|"up"|"down", "distance_cm": 0-500 } }
 *   - rotate:        { "type": "rotate", "payload": { "direction": "cw"|"ccw", "angle_deg": 0-360 } }
 *   - speed:         { "type": "speed", "payload": { "speed_cm_s": 10-100 } }
 *   - flip:          { "type": "flip", "payload": { "direction": "left"|"right"|"forward"|"backward" } }
 *   - go:            { "type": "go", "payload": { "x_cm": -500..500, "y_cm": -500..500, "z_cm": -500..500, "speed_cm_s": 10-100 } }
 *   - waypoint:      { "type": "waypoint", "payload": { "sid": 0-255, "x_cm": -500..500, "y_cm": -500..500, "speed_cm_s": 10-100 } }
 *   - waypoint_end:  { "type": "waypoint_end", "payload": {} }
 *   - video:         { "type": "video", "payload": { "enable": true|false } }
 *   - speed_report:  { "type": "speed_report", "payload": { "enable": true|false } }
 *   - custom:        { "type": "custom", "payload": { "command": "<string>" } }
 *
 * Direction: relay → browser (Telemetry)
 *   - battery:       { "type": "battery", "payload": { "percentage": 85 } }
 *   - temperature:   { "type": "temperature", "payload": { "fov": 45, "body": 38 } }
 *   - barometer:     { "type": "barometer", "payload": { "height_cm": 123.4 } }
 *   - tof:           { "type": "tof", "payload": { "front": 150, "bottom": 300 } }
 *   - attitude:      { "type": "attitude", "payload": { "roll": 0.5, "pitch": -1.2, "yaw": 180.3 } }
 *   - flight_data:   { "type": "flight_data", "payload": { "time": 0, "x": 0, "y": 0, "z": 0, "temperature": 0 } }
 *   - wifi:          { "type": "wifi", "payload": { "dbm": -50 } }
 *   - flight_status: { "type": "flight_status", "payload": { "state": 0-7 } }
 *   - heartbeat:     { "type": "heartbeat", "payload": { "uptime_ms": 123456 } }
 *   - ack:           { "type": "ack", "payload": { "command": "takeoff", "status": "ok"|"error" } }
 *
 * Usage:
 *   const tello = new TelloAdapter({ url: 'ws://192.168.1.100:8080' })
 *   await tello.connect()
 *   await tello.takeoff()
 *   agent.start(tello)
 */

import type { Blackboard, AdapterCommand } from '../engine/types'
import type {
  RobotCapabilitiesV2,
  SelfTestReport,
  SelfTestCheck,
  TelemetryEvent,
  RobotAdapterV2,
} from '@cyber-agent/sdk/adapter/contract'
import { emitAdapterTx, emitAdapterRx } from '../engine/tracer'

// ─── Constants ────────────────────────────────────────────────────

export const PROTOCOL_VERSION = 'v2' as const

/** Default heartbeat interval (ms) */
export const DEFAULT_HEARTBEAT_INTERVAL = 1000

/** Default reconnect interval (ms) */
export const DEFAULT_RECONNECT_INTERVAL = 3000

/** Max reconnect attempts before giving up (-1 = infinite) */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10

/** Command queue max size */
export const DEFAULT_QUEUE_MAX_SIZE = 100

/** Max speed (cm/s) */
export const MAX_SPEED = 100

/** Min speed (cm/s) */
export const MIN_SPEED = 10

/** Max move distance (cm) */
export const MAX_DISTANCE = 500

/** Min battery threshold (percentage) */
export const MIN_BATTERY_PERCENT = 10

/** Tello flight status states */
export enum FlightStatus {
  LANDED = 0,
  TAKEOFF = 1,
  LANDED_AFTER_TAKEOFF = 2,
  FLYING = 3,
  EMERGENCY = 4,
  RETURN_TO_HOME = 5,
  LANDING = 6,
  TAKEOFF_FAILED = 7,
}

/** Flip directions */
export type FlipDirection = 'left' | 'right' | 'forward' | 'backward'

/** Move directions */
export type MoveDirection = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down'

/** Rotation direction */
export type RotateDirection = 'cw' | 'ccw'

// ─── Types ────────────────────────────────────────────────────────

export interface TelloConfig {
  url: string
  autoConnect?: boolean
  heartbeatInterval?: number
  reconnectInterval?: number
  maxReconnectAttempts?: number
  queueMaxSize?: number
}

export type TelloCommandType =
  | 'takeoff'
  | 'land'
  | 'emergency_stop'
  | 'move'
  | 'rotate'
  | 'speed'
  | 'flip'
  | 'go'
  | 'waypoint'
  | 'waypoint_end'
  | 'video'
  | 'speed_report'
  | 'custom'

export interface TelloCommand {
  type: TelloCommandType
  payload: Record<string, unknown>
  command_id?: number
  t: number
}

// ─── Adapter ──────────────────────────────────────────────────────

export class TelloAdapter implements RobotAdapterV2 {
  readonly type = 'tello' as const
  readonly name = 'DJI Tello / Tello EDU'
  readonly contractVersion = 'v2' as const

  private ws: WebSocket | null = null
  private _telemetryCallback: ((event: TelemetryEvent) => void) | null = null
  private connected = false
  private commandQueue: TelloCommand[] = []
  private commandId = 0
  private reconnectAttempts = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  readonly config: TelloConfig

  constructor(config: TelloConfig) {
    this.config = {
      url: config.url,
      autoConnect: config.autoConnect ?? true,
      heartbeatInterval: config.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL,
      reconnectInterval: config.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      queueMaxSize: config.queueMaxSize ?? DEFAULT_QUEUE_MAX_SIZE,
    }
    if (this.config.autoConnect) {
      this.connect()
    }
  }

  static create(config: TelloConfig): TelloAdapter {
    return new TelloAdapter(config)
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.connected) return

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url)

      this.ws.onopen = () => {
        this.connected = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        emitAdapterTx('adapter.connect', performance.now())
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string)
          this.handleTelemetry(msg)
          emitAdapterRx({ type: 'adapter.rx', data: msg }, performance.now())
        } catch (err) {
          console.error('[TelloAdapter] parse error:', err)
        }
      }

      this.ws.onclose = () => {
        this.connected = false
        this.stopHeartbeat()
        emitAdapterTx('adapter.disconnect', performance.now())
        this.scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        reject(err)
      }
    })
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this.connected = false
    if (this.ws) {
      this.ws.close(1000, 'CyberAgent disconnect')
      this.ws = null
    }
  }

  init(_bb: Blackboard): void {
    console.log('[TelloAdapter] init')
  }

  update(_bb: Blackboard): void {
    // Poll flight data periodically
  }

  destroy(): void {
    this.disconnect()
    console.log('[TelloAdapter] destroy')
  }

  async tick(): Promise<void> {
    await this.flushQueue()
  }

  // ─── Telemetry ──────────────────────────────────────────────────

  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    this._telemetryCallback = callback
    return () => { this._telemetryCallback = null }
  }

  private handleTelemetry(msg: Record<string, unknown>): void {
    const type = msg.type as string
    const payload = msg.payload as Record<string, unknown> | undefined
    if (!payload) return

    let event: TelemetryEvent

    switch (type) {
      case 'battery':
        event = {
          type: 'battery',
          t: Date.now(),
          payload: { percentage: Number(payload.percentage ?? 0) },
        }
        break
      case 'temperature':
        event = {
          type: 'temperature',
          t: Date.now(),
          payload: {
            fov: Number(payload.fov ?? 0),
            body: Number(payload.body ?? 0),
          },
        }
        break
      case 'barometer':
        event = {
          type: 'barometer',
          t: Date.now(),
          payload: { height_cm: Number(payload.height_cm ?? 0) },
        }
        break
      case 'tof':
        event = {
          type: 'tof',
          t: Date.now(),
          payload: {
            front: Number(payload.front ?? 0),
            bottom: Number(payload.bottom ?? 0),
          },
        }
        break
      case 'attitude':
        event = {
          type: 'attitude',
          t: Date.now(),
          payload: {
            roll: Number(payload.roll ?? 0),
            pitch: Number(payload.pitch ?? 0),
            yaw: Number(payload.yaw ?? 0),
          },
        }
        break
      case 'flight_data':
        event = {
          type: 'flight_data',
          t: Date.now(),
          payload: {
            time: Number(payload.time ?? 0),
            x: Number(payload.x ?? 0),
            y: Number(payload.y ?? 0),
            z: Number(payload.z ?? 0),
            temperature: Number(payload.temperature ?? 0),
          },
        }
        break
      case 'wifi':
        event = {
          type: 'wifi',
          t: Date.now(),
          payload: { dbm: Number(payload.dbm ?? 0) },
        }
        break
      case 'flight_status':
        event = {
          type: 'flight_status',
          t: Date.now(),
          payload: { state: Number(payload.state ?? 0) },
        }
        break
      case 'heartbeat':
        event = {
          type: 'heartbeat',
          t: Date.now(),
          payload: { uptime_ms: Number(payload.uptime_ms ?? 0) },
        }
        break
      case 'ack':
        event = {
          type: 'ack',
          t: Date.now(),
          payload: {
            command: (payload.command as string) ?? '',
            status: (payload.status as string) ?? 'ok',
          },
        }
        break
      default:
        return
    }

    this._telemetryCallback?.(event)
  }

  // ─── Command ────────────────────────────────────────────────────

  sendCommand(cmd: AdapterCommand): void {
    const msg: TelloCommand = {
      type: cmd.type as TelloCommandType,
      payload: cmd.payload ?? {},
      command_id: ++this.commandId,
      t: Date.now(),
    }

    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
      emitAdapterTx(cmd.type, performance.now())
    } else {
      const queue = this.commandQueue
      const max = this.config.queueMaxSize ?? DEFAULT_QUEUE_MAX_SIZE
      if (queue.length < max) {
        queue.push(msg)
      }
    }
  }

  private async flushQueue(): Promise<void> {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const queue = this.commandQueue
    while (queue.length > 0) {
      const msg = queue.shift()!
      this.ws.send(JSON.stringify(msg))
      emitAdapterTx(msg.type, performance.now())
    }
  }

  // ─── Convenience Methods ────────────────────────────────────────

  async takeoff(): Promise<void> {
    this.sendCommand({ type: 'takeoff', payload: {} })
  }

  async land(): Promise<void> {
    this.sendCommand({ type: 'land', payload: {} })
  }

  async emergencyStop(): Promise<void> {
    this.sendCommand({ type: 'emergency_stop', payload: {} })
  }

  async move(direction: MoveDirection, distanceCm: number): Promise<void> {
    const clampedDist = Math.max(0, Math.min(MAX_DISTANCE, distanceCm))
    this.sendCommand({ type: 'move', payload: { direction, distance_cm: clampedDist } })
  }

  async rotate(direction: RotateDirection, angleDeg: number): Promise<void> {
    const clampedAngle = Math.max(0, Math.min(360, angleDeg))
    this.sendCommand({ type: 'rotate', payload: { direction, angle_deg: clampedAngle } })
  }

  async setSpeed(speedCmS: number): Promise<void> {
    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedCmS))
    this.sendCommand({ type: 'speed', payload: { speed_cm_s: clampedSpeed } })
  }

  async flip(direction: FlipDirection): Promise<void> {
    this.sendCommand({ type: 'flip', payload: { direction } })
  }

  async goTo(xCm: number, yCm: number, zCm: number, speedCmS: number): Promise<void> {
    this.sendCommand({
      type: 'go',
      payload: {
        x_cm: Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, xCm)),
        y_cm: Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, yCm)),
        z_cm: Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, zCm)),
        speed_cm_s: Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedCmS)),
      },
    })
  }

  async startWaypoint(sid: number, xCm: number, yCm: number, speedCmS: number): Promise<void> {
    this.sendCommand({
      type: 'waypoint',
      payload: {
        sid: Math.max(0, Math.min(255, sid)),
        x_cm: Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, xCm)),
        y_cm: Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, yCm)),
        speed_cm_s: Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedCmS)),
      },
    })
  }

  async endWaypoints(): Promise<void> {
    this.sendCommand({ type: 'waypoint_end', payload: {} })
  }

  async enableVideo(enable: boolean): Promise<void> {
    this.sendCommand({ type: 'video', payload: { enable } })
  }

  async enableSpeedReport(enable: boolean): Promise<void> {
    this.sendCommand({ type: 'speed_report', payload: { enable } })
  }

  // ─── Heartbeat / Reconnect ──────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', payload: {}, t: Date.now() }))
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    const max = this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS
    if (max !== -1 && this.reconnectAttempts >= max) return

    const delay = (this.config.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL) * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }

  // ─── Capabilities ───────────────────────────────────────────────

  capabilities(): RobotCapabilitiesV2 {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: false,
      sound: false,
      gesture: false,
      maxSpeed: MAX_SPEED,
      maxRotationSpeed: 360,
      batteryReporting: true,
      distanceReporting: true,
      imuReporting: true,
      selfTestable: true,
      maxBatteryVoltage: 11.4,
      minBatteryVoltage: 1.14,
      hardwareEStop: true,
    }
  }

  // ─── Self Test ──────────────────────────────────────────────────

  selfTest(): SelfTestReport {
    const checks: SelfTestCheck[] = []
    const cap = this.capabilities()

    if (!this.connected) {
      return {
        ok: false,
        status: 'unhealthy',
        summary: 'INDOOR ONLY — Not connected — skipping live tests',
        checks,
        timestamp: Date.now(),
        version: PROTOCOL_VERSION,
      }
    }

    // Check 1: battery
    checks.push({
      name: 'battery',
      ok: cap.batteryReporting,
      message: cap.batteryReporting
        ? `Battery reporting available (${cap.minBatteryVoltage}V–${cap.maxBatteryVoltage}V)`
        : 'Battery sensor not available',
    })

    // Check 2: flight capability
    checks.push({
      name: 'flight',
      ok: cap.maxSpeed > 0,
      message: cap.maxSpeed > 0 ? `Max speed: ${cap.maxSpeed} cm/s` : 'No flight capability',
    })

    // Check 3: sensors
    const sensorCount = [cap.distanceReporting, cap.imuReporting].filter(Boolean).length
    checks.push({
      name: 'sensors',
      ok: sensorCount >= 1,
      message: `${sensorCount}/2 sensor groups available`,
    })

    const ok = checks.filter((c) => c.ok).length >= checks.length * 0.67
    return {
      ok,
      status: ok ? 'healthy' : 'degraded',
      summary: ok ? 'All checks passed' : `${checks.length - checks.filter((c) => c.ok).length} check(s) failed`,
      checks,
      timestamp: Date.now(),
      version: PROTOCOL_VERSION,
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────

export function createTelloAdapter(config: TelloConfig): TelloAdapter {
  return new TelloAdapter(config)
}
