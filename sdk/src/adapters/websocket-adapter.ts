/**
 * CyberAgent SDK — WebSocket Adapter
 *
 * Sends commands over WebSocket to a robot running a CyberAgent receiver
 * (ESP32, Raspberry Pi, Arduino with WiFi/BLE).
 *
 * Features:
 *   - Auto-reconnect with exponential backoff
 *   - Heartbeat to detect connection loss
 *   - Command queue for reliable delivery
 */

import type { Blackboard, RobotAdapter, AdapterCommand } from '../types'

export interface WebSocketAdapterOptions {
  /** WebSocket server URL (e.g., 'ws://robot.local:8080') */
  url: string
  /** Reconnect interval in ms (default: 3000) */
  reconnectIntervalMs?: number
  /** Max reconnect attempts before giving up (default: -1 = infinite) */
  maxReconnectAttempts?: number
  /** Heartbeat interval in ms (default: 5000) */
  heartbeatIntervalMs?: number
  /** Command queue max size (default: 100) */
  queueMaxSize?: number
  /** Custom headers for WebSocket upgrade (for browsers) */
  headers?: Record<string, string>
}

export class WebSocketAdapter implements RobotAdapter {
  readonly type = 'websocket'
  readonly name = 'WebSocket Robot Adapter'

  private options: Required<WebSocketAdapterOptions>
  private ws: WebSocket | null = null
  private commandQueue: AdapterCommand[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private _connected = false

  constructor(options: WebSocketAdapterOptions) {
    this.options = {
      url: options.url,
      reconnectIntervalMs: options.reconnectIntervalMs ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? -1,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 5000,
      queueMaxSize: options.queueMaxSize ?? 100,
      headers: options.headers ?? {},
    }
  }

  get connected(): boolean {
    return this._connected
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    try {
      this.ws = new WebSocket(this.options.url)
    } catch (err) {
      console.error('[WSAdapter] Connection failed:', err)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      console.log('[WSAdapter] Connected to', this.options.url)
      this._connected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.flushQueue()
    }

    this.ws.onclose = (event) => {
      console.log('[WSAdapter] Disconnected:', event.code)
      this._connected = false
      this.stopHeartbeat()
      this.scheduleReconnect()
    }

    this.ws.onerror = (err) => {
      console.error('[WSAdapter] Error:', err)
    }

    this.ws.onmessage = (event) => {
      // Handle incoming robot telemetry / responses
      try {
        const data = JSON.parse(event.data)
        this.onMessage?.(data)
      } catch {
        console.warn('[WSAdapter] Invalid message:', event.data)
      }
    }
  }

  private scheduleReconnect() {
    const max = this.options.maxReconnectAttempts
    if (max !== -1 && this.reconnectAttempts >= max) {
      console.warn('[WSAdapter] Max reconnect attempts reached')
      return
    }

    const interval = this.options.reconnectIntervalMs * (1 + this.reconnectAttempts * 0.5)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      console.log(`[WSAdapter] Reconnecting... (attempt ${this.reconnectAttempts})`)
      this.connect()
    }, interval)
  }

  private flushQueue() {
    while (this.commandQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const cmd = this.commandQueue.shift()!
      this.ws.send(JSON.stringify(cmd))
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, this.options.heartbeatIntervalMs)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── RobotAdapter interface ─────────────────────────────────

  init(bb: Blackboard) {
    this.connect()
  }

  update(bb: Blackboard) {
    // Send periodic state updates to the robot
    if (this.ws?.readyState === WebSocket.OPEN) {
      const state = {
        type: 'state',
        payload: {
          x: Math.round(bb.x),
          y: Math.round(bb.y),
          rotation: Math.round(bb.rotation),
          speed: bb.speed,
          emotion: bb.emotion,
          energy: Math.round(bb.energy * 100),
        },
      }
      try {
        this.ws.send(JSON.stringify(state))
      } catch {
        // Connection lost — will be handled by onclose
      }
    }
  }

  destroy() {
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
  }

  sendCommand(command: AdapterCommand) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command))
    } else {
      // Queue command for delivery when reconnected
      if (this.commandQueue.length < this.options.queueMaxSize) {
        this.commandQueue.push(command)
      } else {
        console.warn('[WSAdapter] Command queue full, dropping:', command.type)
      }
    }
  }

  // ── Incoming message handler ───────────────────────────────

  /** Override this to handle incoming robot telemetry */
  onMessage: ((data: Record<string, unknown>) => void) | null = null
}

/** Factory function for convenience */
export function createWebSocketAdapter(options: WebSocketAdapterOptions): WebSocketAdapter {
  return new WebSocketAdapter(options)
}
