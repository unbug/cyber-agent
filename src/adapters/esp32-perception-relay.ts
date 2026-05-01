/**
 * ESP32 Perception Relay — bridges perception events between browser and ESP32 hardware.
 *
 * The ESP32 runs sensors (bump, proximity, IMU tilt, distance) and forwards
 * perception events to the browser over WebSocket. Conversely, browser-side
 * perception events (e.g., face detection from webcam) can be relayed to the
 * ESP32 for LED / sound / motor feedback.
 *
 * Protocol v2 extension — perception channel:
 *   Browser → ESP32:  {"type":"perception","payload":{"category":"see.face","payload":{...},"source":"webcam"}}
 *   ESP32 → Browser:  {"type":"sensor","payload":{"category":"near","payload":{"distance":42},"source":"ultrasonic"}}
 *                      {"type":"sensor","payload":{"category":"tilt","payload":{"pitch":5.2,"roll":-1.1},"source":"imu"}}
 *                      {"type":"sensor","payload":{"category":"bump","payload":{"direction":"front","force":0.7},"source":"bump"}}
 *
 * Usage:
 *   const relay = new ESP32PerceptionRelay({ wsUrl: 'ws://esp32-local/perception' })
 *   await relay.connect()
 *   relay.onSensor((event) => { handle sensor event })
 *   relay.relayPerception(event) // forward browser perception to ESP32
 */

import type { PerceptionBus } from '../perception/bus'
import type { PerceptionEvent, PerceptionCategory } from '../perception/types'

// ─── Protocol Constants ───────────────────────────────────────────

export const PERCEPTION_PROTOCOL_VERSION = 2
export const DEFAULT_WS_RECONNECT_MS = 3000
export const MAX_WS_RECONNECT_MS = 30000
export const HEARTBEAT_INTERVAL_MS = 5000

// ─── Configuration ────────────────────────────────────────────────

export interface ESP32PerceptionRelayOptions {
  /** WebSocket URL of the ESP32 perception server */
  wsUrl?: string
  /** Perception bus to subscribe to (optional) */
  perceptionBus?: PerceptionBus
  /** Reconnect interval in ms (default: 3000) */
  reconnectIntervalMs?: number
  /** Maximum reconnect interval with exponential backoff (default: 30000) */
  maxReconnectIntervalMs?: number
  /** Heartbeat interval (default: 5000) */
  heartbeatIntervalMs?: number
}

// ─── Sensor Event Types ───────────────────────────────────────────

export interface SensorEvent {
  category: PerceptionCategory
  payload: Record<string, unknown>
  source: string
  timestamp: number
  confidence?: number
}

// ─── ESP32 Perception Relay ───────────────────────────────────────

export class ESP32PerceptionRelay {
  readonly type = 'esp32-perception-relay'
  readonly name = 'ESP32 Perception Relay'
  readonly protocolVersion = PERCEPTION_PROTOCOL_VERSION

  private ws: WebSocket | null = null
  private perceptionBus: PerceptionBus | null
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private isDestroyed = false
  private isConnecting = false
  private _connected = false

  // Event callbacks
  private sensorHandlers: Array<(event: SensorEvent) => void> = []
  private statusHandlers: Array<(connected: boolean) => void> = []

  // Reconnect state
  private reconnectAttempt = 0
  private reconnectMs: number

  constructor(private options: ESP32PerceptionRelayOptions = {}) {
    this.perceptionBus = options.perceptionBus ?? null
    this.reconnectMs = options.reconnectIntervalMs ?? DEFAULT_WS_RECONNECT_MS
  }

  /** Check if the relay is currently connected */
  get connected(): boolean {
    return this._connected
  }

  /** Static check for WebSocket support */
  static isAvailable(): boolean {
    return typeof WebSocket !== 'undefined'
  }

  /** Connect to the ESP32 perception server */
  async connect(): Promise<void> {
    if (this.isConnecting || this._connected || this.isDestroyed) return
    this.isConnecting = true

    const url = this.options.wsUrl ?? `ws://${this.getDefaultHostname()}/perception`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this._connected = true
        this.isConnecting = false
        this.reconnectAttempt = 0
        this.reconnectMs = this.options.reconnectIntervalMs ?? DEFAULT_WS_RECONNECT_MS
        this.startHeartbeat()
        this.notifyStatus(true)
        console.log(`[ESP32PerceptionRelay] Connected to ${url}`)
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'sensor' && data.payload) {
            const sensorEvent: SensorEvent = {
              category: data.payload.category as PerceptionCategory,
              payload: data.payload.payload ?? {},
              source: data.payload.source ?? 'esp32',
              timestamp: data.payload.timestamp ?? Date.now(),
              confidence: data.payload.confidence,
            }
            // Publish to perception bus if available
            if (this.perceptionBus) {
              this.perceptionBus.publish({
                category: sensorEvent.category,
                payload: sensorEvent.payload,
                source: 'esp32-relay',
                timestamp: sensorEvent.timestamp,
                confidence: sensorEvent.confidence,
              })
            }
            // Notify sensor handlers
            for (const handler of this.sensorHandlers) {
              try { handler(sensorEvent) } catch { /* ignore */ }
            }
          }
        } catch (err) {
          console.error('[ESP32PerceptionRelay] Failed to parse sensor event:', err)
        }
      }

      this.ws.onclose = (event: CloseEvent) => {
        this._connected = false
        this.isConnecting = false
        this.stopHeartbeat()
        this.notifyStatus(false)
        console.log(`[ESP32PerceptionRelay] Disconnected (code=${event.code})`)
        if (!this.isDestroyed) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {
        console.error('[ESP32PerceptionRelay] WebSocket error')
      }
    } catch (err) {
      this.isConnecting = false
      console.error('[ESP32PerceptionRelay] Connection failed:', err)
      if (!this.isDestroyed) {
        this.scheduleReconnect()
      }
    }
  }

  /** Disconnect from the ESP32 perception server */
  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000, 'Relay disconnected')
      this.ws = null
    }
    this._connected = false
    this.isConnecting = false
    this.notifyStatus(false)
  }

  /** Destroy the relay and clean up all resources */
  destroy(): void {
    this.isDestroyed = true
    this.disconnect()
    this.sensorHandlers = []
    this.statusHandlers = []
  }

  /** Subscribe to sensor events from the ESP32. Returns unsubscribe function. */
  onSensor(handler: (event: SensorEvent) => void): () => void {
    this.sensorHandlers.push(handler)
    return () => {
      const idx = this.sensorHandlers.indexOf(handler)
      if (idx >= 0) this.sensorHandlers.splice(idx, 1)
    }
  }

  /** Subscribe to connection status changes. Returns unsubscribe function. */
  onStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.push(handler)
    return () => {
      const idx = this.statusHandlers.indexOf(handler)
      if (idx >= 0) this.statusHandlers.splice(idx, 1)
    }
  }

  /** Relay a browser-side perception event to the ESP32 */
  relayPerception(event: Omit<PerceptionEvent, 'id'>): void {
    if (!this._connected || !this.ws) return
    try {
      const message = JSON.stringify({
        type: 'perception',
        payload: {
          category: event.category,
          payload: event.payload,
          source: event.source,
          timestamp: event.timestamp,
          confidence: event.confidence,
        },
      })
      this.ws.send(message)
    } catch (err) {
      console.error('[ESP32PerceptionRelay] Failed to relay perception:', err)
    }
  }

  /** Subscribe to the perception bus so browser events auto-relay */
  subscribePerceptionBus(bus: PerceptionBus): void {
    this.perceptionBus = bus
    bus.onAll((event) => {
      if (!this._connected) return
      this.relayPerception(event)
    })
  }

  /** Get capabilities of the ESP32 perception relay */
  get capabilities(): Record<string, unknown> {
    return {
      movement: false,
      led: true,
      sound: true,
      sensors: ['bump', 'proximity', 'imu', 'distance'],
      selfTest: true,
      perceptionRelay: true,
      protocolVersion: PERCEPTION_PROTOCOL_VERSION,
    }
  }

  /** Self-test: verify connection to ESP32 */
  async selfTest(): Promise<{ ok: boolean; status: string; checks: Array<{ name: string; ok: boolean; detail?: string }> }> {
    const checks: Array<{ name: string; ok: boolean; detail?: string }> = []

    // Check WebSocket support
    checks.push({
      name: 'WebSocket support',
      ok: typeof WebSocket !== 'undefined',
      detail: typeof WebSocket !== 'undefined' ? 'available' : 'not available',
    })

    // Check connection
    checks.push({
      name: 'Connection',
      ok: this._connected,
      detail: this._connected ? 'connected' : 'disconnected',
    })

    // Check protocol version
    checks.push({
      name: 'Protocol version',
      ok: PERCEPTION_PROTOCOL_VERSION >= 2,
      detail: `v${PERCEPTION_PROTOCOL_VERSION}`,
    })

    return {
      ok: checks.every((c) => c.ok),
      status: this._connected ? 'ok' : 'disconnected',
      checks,
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private getDefaultHostname(): string {
    // Try to detect ESP32 hostname on local network
    if (typeof window !== 'undefined' && window.location) {
      return window.location.hostname
    }
    return 'localhost'
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval)
    }
    // Exponential backoff
    const interval = Math.min(
      this.reconnectMs * Math.pow(1.5, this.reconnectAttempt),
      this.options.maxReconnectIntervalMs ?? MAX_WS_RECONNECT_MS,
    )
    this.reconnectAttempt++
    this.reconnectInterval = setTimeout(() => {
      this.connect()
    }, interval)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this._connected || !this.ws) return
      try {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }))
      } catch { /* ignore */ }
    }, this.options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private notifyStatus(connected: boolean): void {
    for (const handler of this.statusHandlers) {
      try { handler(connected) } catch { /* ignore */ }
    }
  }
}
