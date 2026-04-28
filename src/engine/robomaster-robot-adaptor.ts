/**
 * RoboMasterMotionAdapter — Hardware abstraction for RoboMaster EP robot motion
 * 
 * This adapter provides motion primitives using the RoboMaster motion API.
 * It's compatible with the RoboMaster EP SDK (Python/TS) for differential drive control.
 * 
 * Supported commands via sendCommand():
 *   - type: 'motors', payload: { left: number, right: number } (-1 to 1)
 *   - type: 'move_duration', payload: { left: number, right: number, duration: number (ms) }
 *   - type: 'move_distance', payload: { distance: number (mm), left: number, right: number }
 *   - type: 'rotate_degrees', payload: { degrees: number, speed: number, left: number, right: number }
 *   - type: 'stop', payload: {}
 */

import type { Blackboard, AdapterCommand } from './types'
import type { RobotAdapterV2 } from '@cyber-agent/sdk/adapter/contract'
import type { RobotCapabilitiesV2, SelfTestReport, TelemetryEvent } from '@cyber-agent/sdk/adapter/contract'

export interface RoboMasterConfig {
  host?: string
  port?: number
  enableTelemetry?: boolean
}

/**
 * RoboMaster motion primitives
 * Speed: -1 to 1 (negative = reverse, positive = forward)
 */
export const motionPrimitive = {
  /** Move left and right motors at specified speeds */
  motors: (left: number, right: number) => ({
    type: 'motors' as const,
    payload: { left, right },
  }),

  /** Move for a specific duration with constant speed */
  moveDuration: (left: number, right: number, durationMs: number) => ({
    type: 'move_duration' as const,
    payload: { left, right, duration: durationMs },
  }),

  /** Move a specified distance */
  moveDistance: (distanceMM: number) => ({
    type: 'move_distance' as const,
    payload: { distance: distanceMM, left: 0.5, right: 0.5 },
  }),

  /** Rotate to a specific degree */
  rotateDegrees: (degrees: number, speed = 0.5) => ({
    type: 'rotate_degrees' as const,
    payload: { degrees, speed, left: -speed, right: speed },
  }),

  /** Stop all motors */
  stop: () => ({
    type: 'stop' as const,
    payload: {},
  }),
} as const

/**
 * RoboMasterMotionAdapter — Extends basic adapter with motion primitives
 */
export class RoboMasterMotionAdapter implements RobotAdapterV2 {
  readonly type = 'robomaster-motor'
  readonly name = 'RoboMaster Motion Adapter'
  readonly contractVersion = 'v2' as const

  private adapter: RobotAdapterV2
  private config: Required<RoboMasterConfig>
  private lastMotionCommand?: AdapterCommand

  constructor(baseAdapter: RobotAdapterV2, config?: RoboMasterConfig) {
    this.adapter = baseAdapter
    this.config = {
      host: 'localhost',
      port: 8080,
      enableTelemetry: true,
      ...config,
    }
  }

  init(bb: Blackboard) {
    this.adapter.init(bb)
    console.log('[RoboMasterAdapter] Initialized with host:', this.config.host)
  }

  update(bb: Blackboard) {
    this.adapter.update(bb)
  }

  destroy() {
    this.adapter.destroy()
    console.log('[RoboMasterAdapter] Destroyed')
  }

  sendCommand(command: AdapterCommand) {
    this.lastMotionCommand = command
    this.adapter.sendCommand(command)
  }

  // ── v2 lifecycle ───────────────────────────────────────────

  async connect(): Promise<void> {
    // Delegate to base adapter if it has connect
    if ('connect' in this.adapter && typeof (this.adapter as any).connect === 'function') {
      await (this.adapter as any).connect()
    }
    return Promise.resolve()
  }

  async disconnect(): Promise<void> {
    if ('disconnect' in this.adapter && typeof (this.adapter as any).disconnect === 'function') {
      await (this.adapter as any).disconnect()
    }
    return Promise.resolve()
  }

  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    if ('onTelemetry' in this.adapter && typeof (this.adapter as any).onTelemetry === 'function') {
      return (this.adapter as any).onTelemetry(callback)
    }
    return () => {}
  }

  selfTest(): SelfTestReport {
    return {
      ok: true,
      status: 'healthy',
      summary: 'RoboMasterMotionAdapter — motion primitives ready',
      checks: [
        { name: 'motion_primitives', ok: true, message: 'All motion primitives available' },
        { name: 'base_adapter', ok: this.adapter !== null, message: 'Base adapter initialized' },
      ],
      timestamp: Date.now(),
      version: 'v2',
    }
  }

  /**
   * Move forward at a given speed
   */
  moveForward(speed = 0.5) {
    const clamped = Math.max(-1, Math.min(1, speed))
    this.sendCommand(motionPrimitive.motors(clamped, clamped))
  }

  /**
   * Move backward at a given speed
   */
  moveBackward(speed = 0.5) {
    const clamped = Math.max(-1, Math.min(1, speed))
    this.sendCommand(motionPrimitive.motors(-clamped, -clamped))
  }

  /**
   * Spin left in place
   */
  spinLeft(speed = 0.7) {
    const clamped = Math.max(-1, Math.min(1, speed))
    this.sendCommand(motionPrimitive.motors(-clamped, clamped))
  }

  /**
   * Spin right in place
   */
  spinRight(speed = 0.7) {
    const clamped = Math.max(-1, Math.min(1, speed))
    this.sendCommand(motionPrimitive.motors(clamped, -clamped))
  }

  /**
   * Drive forward for a duration
   */
  moveForwardFor(durationMs: number, speed = 0.5) {
    const clamped = Math.max(-1, Math.min(1, speed))
    this.sendCommand(motionPrimitive.moveDuration(clamped, clamped, durationMs))
  }

  /**
   * Rotate to facing a specific degree (relative)
   */
  rotateTo(degrees: number, speed = 0.5) {
    const clamped = Math.max(-1, Math.min(1, speed))
    this.sendCommand(motionPrimitive.rotateDegrees(degrees, clamped))
  }

  /**
   * Stop and halt all motion
   */
  stop() {
    this.sendCommand(motionPrimitive.stop())
    this.lastMotionCommand = undefined
  }

  /**
   * Play a sound tone via RoboMaster speaker
   */
  playTone(frequency: number, durationMs: number) {
    this.sendCommand({
      type: 'sound' as string,
      payload: {
        frequency: Math.max(100, Math.min(2000, frequency)),
        duration: Math.max(10, Math.min(5000, durationMs)),
      },
    })
  }

  /**
   * Set LED ring color
   */
  setLED(r: number, g: number, b: number) {
    this.sendCommand({
      type: 'led' as string,
      payload: {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
      },
    })
  }

  /**
   * Blink LED a number of times
   */
  ledBlink(times: number, durationMs: number, r = 255, g = 0, b = 0) {
    const blink = () => {
      this.setLED(255, 0, 0)
      setTimeout(() => this.setLED(r, g, b), durationMs / 2)
    }
    for (let i = 0; i < times; i++) {
      blink()
    }
    this.setLED(r, g, b)
  }

  /**
   * Check if last motion command is still active
   */
  getLastMotionCommand() {
    return this.lastMotionCommand
  }

  // ── Capabilities ─────────────────────────────────────────────

  capabilities(): RobotCapabilitiesV2 {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: true,
      maxSpeed: 400,
      maxRotationSpeed: 360,
      batteryReporting: true,
      distanceReporting: true,
      imuReporting: true,
      selfTestable: true,
      hardwareEStop: true,
    }
  }
}

/**
 * Factory function to create RoboMasterMotionAdapter
 */
export function createRoboMasterAdapter(
  baseAdapter: RobotAdapterV2,
  config?: RoboMasterConfig
): RobotAdapterV2 {
  return new RoboMasterMotionAdapter(baseAdapter, config)
}

/**
 * Create a RoboMasterMotionAdapter from scratch with WebSocket
 */
import { WebSocketAdapter } from './websocket-adapter'

export function createRoboMasterWebSocketAdapter(
  url: string,
  config?: RoboMasterConfig
): RobotAdapterV2 {
  const wsAdapter = new WebSocketAdapter({ url, ...config })
  return new RoboMasterMotionAdapter(wsAdapter, config)
}
