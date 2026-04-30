/**
 * iRobot Create 3 / Roomba Adapter — WebSocket Protocol v2
 *
 * Controls an iRobot Create 3 (Roomba 900/1000/600 series) via a relay
 * server that bridges WebSocket → serial (OI protocol).
 *
 * Protocol v2 message format:
 *   { "type": "<message_type>", "payload": { ... }, "t": <timestamp_ms> }
 *
 * Direction: browser → relay (Command)
 *   - move:          { "type": "move", "payload": { "velocity": -500..500, "radius": -1000..1000 } }
 *   - drive:         { "type": "drive", "payload": { "distance_mm": -65535..65535, "velocity_mm_s": 50..500 } }
 *   - velocity:      { "type": "velocity", "payload": { "velocity_mm_s": -500..500, "radius_mm": -32767..32767 } }
 *   - stop:          { "type": "stop", "payload": {} }
 *   - emergency:     { "type": "emergency_stop", "payload": {} }
 *   - led:           { "type": "led", "payload": { "red": 0-255, "green": 0-255, "blue": 0-255 } }
 *   - sound:         { "type": "sound", "payload": { "note": 0-255, "duration_ms": 0-30000 } }
 *   - play_song:     { "type": "play_song", "payload": { "name": "hello"|"goodbye"|"error"|"custom", "notes": [freq, ...] } }
 *   - sensors:       { "type": "sensors", "payload": { "select": ["battery","cliff_front","wall"] } }
 *   - custom:        { "type": "custom", "payload": { "command_id": 0-255, "data": [byte, ...] } }
 *
 * Direction: relay → browser (Telemetry)
 *   - battery:       { "type": "battery", "payload": { "voltage_mv": 14400, "capacity_mah": 5200, "charge_pct": 85 } }
 *   - cliff:         { "type": "cliff", "payload": { "front_left": 0, "front_right": 0, "rear_left": 0, "rear_right": 0 } }
 *   - wall:          { "type": "wall", "payload": { "value": 120 } }
 *   - bump:          { "type": "bump", "payload": { "left": false, "right": false, "center": false } }
 *   - wheel_drop:    { "type": "wheel_drop", "payload": { "main_drop": false, "caster_drop": false } }
 *   - distance:      { "type": "distance", "payload": { "mm": 1234 } }
 *   - angle:         { "type": "angle", "payload": { "degrees": 45.2 } }
 *   - velocity:      { "type": "velocity", "payload": { "mm_s": 100 } }
 *   - charge_state:  { "type": "charge_state", "payload": { "state": 0-7 } }
 *   - heartbeat:     { "type": "heartbeat", "payload": { "uptime_ms": 123456 } }
 *   - ack:           { "type": "ack", "payload": { "command_id": 123, "status": "ok"|"error" } }
 *
 * Usage:
 *   const create3 = new IRobotCreate3Adapter({ url: 'ws://192.168.1.100:8080' })
 *   await create3.connect()
 *   agent.start(create3)
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

/** Max velocity (mm/s) */
export const MAX_VELOCITY = 500

/** Min velocity (mm/s) */
export const MIN_VELOCITY = 50

/** Max drive distance (mm) */
export const MAX_DISTANCE = 65535

/** Battery voltage thresholds (mV) */
export const MIN_BATTERY_VOLTAGE = 11500
export const LOW_BATTERY_VOLTAGE = 12000
export const FULL_BATTERY_VOLTAGE = 16800

/** Charge states per iRobot OI spec */
export enum ChargeState {
  UNKNOWN = 0,
  RECLAIMING = 1,
  TRICKLED = 2,
  FULL = 3,
  FAULT = 4,
  charging = 5,
  DISCHARGING = 6,
}

/** LED colors */
export type LEDColor = { red: number; green: number; blue: number }

/** Song names for play_song */
export type SongName = 'hello' | 'goodbye' | 'error' | 'custom'

// ─── Types ────────────────────────────────────────────────────────

export interface IRobotCreate3Config {
  url: string
  autoConnect?: boolean
  heartbeatInterval?: number
  reconnectInterval?: number
  maxReconnectAttempts?: number
  queueMaxSize?: number
}

export type IRobotCreate3CommandType =
  | 'move'
  | 'drive'
  | 'velocity'
  | 'stop'
  | 'emergency_stop'
  | 'led'
  | 'sound'
  | 'play_song'
  | 'sensors'
  | 'custom'

export interface IRobotCreate3Command {
  type: IRobotCreate3CommandType
  payload: Record<string, unknown>
  command_id?: number
  t: number
}

// ─── Adapter ──────────────────────────────────────────────────────

export class IRobotCreate3Adapter implements RobotAdapterV2 {
  readonly type = 'irobot-create3' as const
  readonly name = 'iRobot Create 3 / Roomba'
  readonly contractVersion = 'v2' as const

  private ws: WebSocket | null = null
  private _telemetryCallback: ((event: TelemetryEvent) => void) | null = null
  private connected = false
  private commandQueue: IRobotCreate3Command[] = []
  private commandId = 0
  private reconnectAttempts = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  readonly config: IRobotCreate3Config

  constructor(config: IRobotCreate3Config) {
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

  static create(config: IRobotCreate3Config): IRobotCreate3Adapter {
    return new IRobotCreate3Adapter(config)
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
          console.error('[IRobotCreate3Adapter] parse error:', err)
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
    console.log('[IRobotCreate3Adapter] init')
  }

  update(_bb: Blackboard): void {
    // Read sensors periodically
  }

  destroy(): void {
    this.disconnect()
    console.log('[IRobotCreate3Adapter] destroy')
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
          payload: {
            voltage_mv: Number(payload.voltage_mv ?? 0),
            capacity_mah: Number(payload.capacity_mah ?? 0),
            charge_pct: Number(payload.charge_pct ?? 0),
          },
        }
        break
      case 'cliff':
        event = {
          type: 'cliff',
          t: Date.now(),
          payload: {
            front_left: Number(payload.front_left ?? 0),
            front_right: Number(payload.front_right ?? 0),
            rear_left: Number(payload.rear_left ?? 0),
            rear_right: Number(payload.rear_right ?? 0),
          },
        }
        break
      case 'wall':
        event = {
          type: 'wall',
          t: Date.now(),
          payload: { value: Number(payload.value ?? 0) },
        }
        break
      case 'bump':
        event = {
          type: 'bump',
          t: Date.now(),
          payload: {
            left: Boolean(payload.left),
            right: Boolean(payload.right),
            center: Boolean(payload.center),
          },
        }
        break
      case 'wheel_drop':
        event = {
          type: 'wheel_drop',
          t: Date.now(),
          payload: {
            main_drop: Boolean(payload.main_drop),
            caster_drop: Boolean(payload.caster_drop),
          },
        }
        break
      case 'distance':
        event = {
          type: 'distance',
          t: Date.now(),
          payload: { mm: Number(payload.mm ?? 0) },
        }
        break
      case 'angle':
        event = {
          type: 'angle',
          t: Date.now(),
          payload: { degrees: Number(payload.degrees ?? 0) },
        }
        break
      case 'velocity':
        event = {
          type: 'velocity',
          t: Date.now(),
          payload: { mm_s: Number(payload.mm_s ?? 0) },
        }
        break
      case 'charge_state':
        event = {
          type: 'charge_state',
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
            command_id: Number(payload.command_id ?? 0),
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
    const msg: IRobotCreate3Command = {
      type: cmd.type as IRobotCreate3CommandType,
      payload: cmd.payload ?? {},
      command_id: ++this.commandId,
      t: Date.now(),
    }

    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
      emitAdapterTx(cmd.type, performance.now())
    } else {
      // Queue for later
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
      led: true,
      sound: true,
      gesture: false,
      maxSpeed: MAX_VELOCITY,
      maxRotationSpeed: 180,
      batteryReporting: true,
      distanceReporting: true,
      imuReporting: false,
      selfTestable: true,
      maxBatteryVoltage: FULL_BATTERY_VOLTAGE / 1000,
      minBatteryVoltage: MIN_BATTERY_VOLTAGE / 1000,
      hardwareEStop: true,
    }
  }

  // ─── Self Test ──────────────────────────────────────────────────

  selfTest(): SelfTestReport {
    const checks: SelfTestCheck[] = []

    if (!this.connected) {
      return {
        ok: false,
        status: 'unhealthy',
        summary: 'Not connected — skipping live tests',
        checks: [],
        timestamp: Date.now(),
        version: PROTOCOL_VERSION,
      }
    }

    // Check 1: battery
    const cap = this.capabilities()
    checks.push({
      name: 'battery',
      ok: cap.batteryReporting,
      message: cap.batteryReporting
        ? `Battery reporting available (${cap.minBatteryVoltage}V–${cap.maxBatteryVoltage}V)`
        : 'Battery sensor not available',
    })

    // Check 2: movement
    checks.push({
      name: 'movement',
      ok: cap.maxSpeed > 0,
      message: cap.maxSpeed > 0
        ? `Max speed: ${cap.maxSpeed} mm/s`
        : 'No movement capability',
    })

    // Check 3: sensors
    const sensorCount = [cap.batteryReporting, cap.distanceReporting].filter(Boolean).length
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

  // ─── Emergency Stop ─────────────────────────────────────────────

  emergencyStop(): void {
    this.sendCommand({ type: 'emergency_stop', payload: {} })
  }
}

// ─── Factory ──────────────────────────────────────────────────────

export function createIRobotCreate3Adapter(config: IRobotCreate3Config): IRobotCreate3Adapter {
  return new IRobotCreate3Adapter(config)
}
