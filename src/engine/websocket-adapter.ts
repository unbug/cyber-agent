/**
 * WebSocketAdapter — Real-time robot control over WebSocket
 *
 * This adapter enables sending behavior tree commands to physical robots
 * via WebSocket connection. It supports:
 * - motor control (left/right speed for differential drive)
 * - LED/RGB control
 * - sound/speaker commands
 * - generic payload forwarding
 *
 * Usage example:
 *   const wsAdapter = new WebSocketAdapter('ws://robot.local:8080')
 *   agent.start(wsAdapter)
 */

import type { Blackboard, RobotAdapter, AdapterCommand } from './types'
import { emitAdapterTx, emitAdapterRx } from './tracer'

export interface WebSocketAdapterConfig {
  url: string
  reconnectIntervalMs?: number
  heartbeatIntervalMs?: number
  maxReconnectAttempts?: number
  autoConnect?: boolean
}

export class WebSocketAdapter implements RobotAdapter {
  readonly type = 'websocket'
  readonly name = 'WebSocket Robot Adapter'
  
  private ws: WebSocket | null = null
  private config: WebSocketAdapterConfig
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private commandQueue: AdapterCommand[] = []
  private isConnectedCallback?: (connected: boolean) => void
  
  constructor(config: WebSocketAdapterConfig) {
    this.config = {
      reconnectIntervalMs: 3000,
      heartbeatIntervalMs: 5000,
      maxReconnectAttempts: 10,
      autoConnect: true,
      ...config,
    }
    
    if (this.config.autoConnect) {
      this.connect()
    }
  }
  
  setOnConnect(callback: (connected: boolean) => void) {
    this.isConnectedCallback = callback
  }
  
  // ─── Connection Management ──────────────────────────────────
  
  connect() {
    if (this.ws?.readyState === WebSocket.CONNECTING || this.ws?.readyState === WebSocket.OPEN) {
      return // Already connecting or open
    }
    
    try {
      this.ws = new WebSocket(this.config.url)
      
      this.ws.onopen = () => {
        console.log('[WebSocketAdapter] Connected successfully')
        this.reconnectAttempts = 0
        this.onConnect(true)
        this.startHeartbeat()
        this.flushCommandQueue()
      }
      
      this.ws.onmessage = (event) => this.handleMessage(event)
      
      this.ws.onerror = (error) => {
        console.error('[WebSocketAdapter] WebSocket error:', error)
      }
      
      this.ws.onclose = (event) => {
        console.log('[WebSocketAdapter] Connection closed', event.code, event.reason)
        this.onConnect(false)
        this.stopHeartbeat()
        this.scheduleReconnect()
      }
    } catch (err) {
      console.error('[WebSocketAdapter] Failed to create WebSocket:', err)
      this.scheduleReconnect()
    }
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts ?? 10)) {
      console.error('[WebSocketAdapter] Max reconnect attempts reached')
      return
    }
    
    this.reconnectAttempts++
    const delay = this.config.reconnectIntervalMs!
    console.log(`[WebSocketAdapter] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }
  
  private onConnect(connected: boolean) {
    if (this.isConnectedCallback) {
      this.isConnectedCallback(connected)
    }
  }
  
  // ─── Heartbeat ──────────────────────────────────
  
  private startHeartbeat() {
    this.stopHeartbeat()
    const interval = this.config.heartbeatIntervalMs ?? 5000
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, interval)
  }
  
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  // ─── Command Handling ──────────────────────────────────
  
  init(_bb: Blackboard): void {
    console.log('[WebSocketAdapter] Initialized')
  }
  
  update(_bb: Blackboard): void {
    // Periodic sync callback if needed
  }
  
  destroy(): void {
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
    this.commandQueue = []
    console.log('[WebSocketAdapter] Destroyed')
  }
  
  sendCommand(command: AdapterCommand): void {
    emitAdapterTx(command.type, performance.now())
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const payload = JSON.stringify(command)
        this.ws.send(payload)
        console.log('[WebSocketAdapter] Sent command:', command.type, payload)
      } catch (err) {
        console.error('[WebSocketAdapter] Failed to send command:', err)
        this.queueCommand(command)
      }
    } else {
      console.warn('[WebSocketAdapter] Not connected, queuing commands')
      this.queueCommand(command)
    }
  }
  
  private queueCommand(command: AdapterCommand) {
    this.commandQueue.push(command)
  }
  
  private flushCommandQueue() {
    while (this.commandQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const cmd = this.commandQueue.shift()!
      try {
        this.ws!.send(JSON.stringify(cmd))
      } catch (err) {
        this.commandQueue.unshift(cmd)
        break
      }
    }
  }
  
  // ─── Message Handling ──────────────────────────────────
  
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)
      emitAdapterRx({ type: data.type, raw: true }, performance.now())

      switch (data.type) {
        case 'heartbeat_ack':
          // Heartbeat acknowledged
          break
        
        case 'command_request':
          // Robot is requesting the next command
          this.handleCommandRequest(data)
          break
        
        case 'state_update':
          // Robot is sending telemetry back
          // Could forward to blackboard if needed
          break
        
        default:
          console.log('[WebSocketAdapter] Unknown message type:', data.type)
      }
    } catch (err) {
      console.error('[WebSocketAdapter] Failed to parse message:', err)
    }
  }
  
  private handleCommandRequest(data: Record<string, unknown>) {
    // This could be used for pull-pattern where robot requests commands
    console.log('[WebSocketAdapter] Robot is ready for command:', data)
  }
  
  // ─── Convenience Methods for Robot Control ──────────────────────────────────
  
  /**
   * Set motor speeds for differential drive robots
   * @param leftSpeed - Left motor speed (-1 to 1, where -1 is full reverse, 0 is stopped, 1 is full forward)
   * @param rightSpeed - Right motor speed (-1 to 1)
   */
  setMotors(leftSpeed: number, rightSpeed: number): void {
    this.sendCommand({
      type: 'motors',
      payload: {
        left: Math.max(-1, Math.min(1, leftSpeed)),
        right: Math.max(-1, Math.min(1, rightSpeed)),
      },
    })
  }
  
  /**
   * Set RGB LED color
   * @param r - Red (0-255)
   * @param g - Green (0-255)
   * @param b - Blue (0-255)
   */
  setRGB(r: number, g: number, b: number): void {
    this.sendCommand({
      type: 'led',
      payload: {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
      },
    })
  }
  
  /**
   * Play a sound tone
   * @param frequency - Frequency in Hz (e.g., 440 = A4)
   * @param duration - Duration in milliseconds
   */
  playTone(frequency: number, duration: number): void {
    this.sendCommand({
      type: 'sound',
      payload: {
        frequency: Math.max(100, Math.min(2000, frequency)),
        duration: Math.max(10, Math.min(5000, duration)),
      },
    })
  }
  
  /**
   * Send a custom command
   */
  custom(commandType: string, payload: Record<string, unknown>): void {
    this.sendCommand({ type: commandType, payload })
  }
}

// ─── Factory function for easier usage ──────────────────────────────────

export function createWebSocketAdapter(config: WebSocketAdapterConfig): RobotAdapter {
  return new WebSocketAdapter(config)
}
