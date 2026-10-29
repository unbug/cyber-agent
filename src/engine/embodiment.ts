/**
 * EmbodimentAdapter — the missing link of the Magic Loop.
 *
 * Character behavior trees live in a virtual 2D field: every tick they move
 * `bb.x / bb.y / bb.rotation` and set `bb.emotion`. The CanvasAdapter simply
 * *draws* that state. A real robot, however, needs *motor commands*.
 *
 * EmbodimentAdapter wraps any RobotAdapterV2 and translates the blackboard
 * motion into differential-drive commands every tick:
 *
 *   bb.x/y delta      → forward speed   (0..maxSpeed fraction)
 *   bb.rotation delta → steering        (tank-drive left/right split)
 *   bb.emotion        → LED color       (edge-triggered, rate-limited)
 *   bb.eStopActive    → { type: 'stop' } (immediately, repeatedly)
 *
 * This makes ALL existing characters deployable on ANY robot without touching
 * a single behavior tree.
 *
 * Wire protocol (same as WebSocketAdapter, plain JSON {type,payload}):
 *   { type: 'motors', payload: { left: -1..1, right: -1..1 } }
 *   { type: 'led',    payload: { r, g, b } }
 *   { type: 'stop',   payload: {} }
 * All other commands (sound, speak, custom sendCommand nodes) pass through
 * untouched.
 */

import type { Blackboard, AdapterCommand, Emotion } from './types'
import type {
  RobotAdapterV2,
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
} from '@cyber-agent/sdk/adapter/contract'

// ─── Config ───────────────────────────────────────────────────────

export interface EmbodimentConfig {
  /** Pixels of blackboard movement that saturate forward speed at maxSpeed. Default 30 */
  speedRefPx?: number
  /** Max forward fraction sent to the robot (0..1). Default 0.5 */
  maxSpeed?: number
  /** Movement below this (px/tick) counts as "not moving". Default 1.5 */
  deadzonePx?: number
  /** Degrees of yaw change that saturate steering. Default 45 */
  yawRefDeg?: number
  /** Max steering fraction (0..1). Default 0.6 */
  maxSteer?: number
  /** Send emotion → LED commands. Default true */
  emotionLed?: boolean
  /** Minimum ms between identical motor commands (keepalive). Default 250 */
  keepaliveMs?: number
  /** Command epsilon: skip sending if change is smaller. Default 0.05 */
  cmdEpsilon?: number
}

const DEFAULTS: Required<EmbodimentConfig> = {
  speedRefPx: 30,
  maxSpeed: 0.5,
  deadzonePx: 1.5,
  yawRefDeg: 45,
  maxSteer: 0.6,
  emotionLed: true,
  keepaliveMs: 250,
  cmdEpsilon: 0.05,
}

// ─── Emotion → LED palette ────────────────────────────────────────

export const EMOTION_LED: Record<Emotion, { r: number; g: number; b: number }> = {
  idle: { r: 80, g: 130, b: 255 },
  happy: { r: 255, g: 200, b: 40 },
  curious: { r: 0, g: 220, b: 180 },
  alert: { r: 255, g: 140, b: 0 },
  sleepy: { r: 70, g: 50, b: 140 },
  playful: { r: 255, g: 80, b: 200 },
  angry: { r: 255, g: 30, b: 30 },
}

// ─── Helpers ──────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Wrap an angle difference into [-180, 180]. */
export function wrapDeg(deg: number): number {
  let d = deg % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

// ─── Adapter ──────────────────────────────────────────────────────

export class EmbodimentAdapter implements RobotAdapterV2 {
  readonly type = 'embodiment'
  readonly name: string
  readonly contractVersion = 'v2' as const

  readonly inner: RobotAdapterV2
  private cfg: Required<EmbodimentConfig>

  private prevX = 0
  private prevY = 0
  private prevRot = 0
  private prevEmotion: Emotion | null = null
  private lastLeft = 0
  private lastRight = 0
  private lastMotorsAt = 0
  private lastLedAt = 0
  private stoppedSentAt = 0
  private destroyed = false

  constructor(inner: RobotAdapterV2, config?: EmbodimentConfig) {
    this.inner = inner
    this.cfg = { ...DEFAULTS, ...config }
    this.name = `Embodiment(${inner.name})`
  }

  // ── v1 lifecycle ──────────────────────────────────────────────

  init(bb: Blackboard): void {
    this.prevX = bb.x
    this.prevY = bb.y
    this.prevRot = bb.rotation
    this.prevEmotion = null
    this.destroyed = false
    this.inner.init(bb)
  }

  update(bb: Blackboard): void {
    if (this.destroyed) return
    const now = Date.now()

    // Emergency stop takes over everything.
    if (bb.eStopActive) {
      if (now - this.stoppedSentAt > 200) {
        this.stoppedSentAt = now
        this.inner.sendCommand({ type: 'stop', payload: {} })
        this.lastLeft = 0
        this.lastRight = 0
      }
      this.prevX = bb.x
      this.prevY = bb.y
      this.prevRot = bb.rotation
      this.inner.update(bb)
      return
    }

    // Differential drive from blackboard motion.
    const dx = bb.x - this.prevX
    const dy = bb.y - this.prevY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const yaw = wrapDeg(bb.rotation - this.prevRot)

    let fwd = 0
    if (dist > this.cfg.deadzonePx) {
      fwd = clamp(dist / this.cfg.speedRefPx, 0, 1) * this.cfg.maxSpeed
    }
    const steer = clamp(yaw / this.cfg.yawRefDeg, -1, 1) * this.cfg.maxSteer

    const left = clamp(fwd - steer, -1, 1)
    const right = clamp(fwd + steer, -1, 1)

    const eps = this.cfg.cmdEpsilon
    const changed =
      Math.abs(left - this.lastLeft) > eps || Math.abs(right - this.lastRight) > eps
    const keepaliveDue = now - this.lastMotorsAt > this.cfg.keepaliveMs

    if (changed || keepaliveDue) {
      this.lastLeft = left
      this.lastRight = right
      this.lastMotorsAt = now
      this.inner.sendCommand({
        type: 'motors',
        payload: {
          left: Number(left.toFixed(3)),
          right: Number(right.toFixed(3)),
        },
      })
    }

    // Emotion → LED (edge-triggered, rate-limited)
    if (this.cfg.emotionLed && bb.emotion !== this.prevEmotion) {
      const color = EMOTION_LED[bb.emotion] ?? EMOTION_LED.idle
      if (now - this.lastLedAt > 300) {
        this.lastLedAt = now
        this.inner.sendCommand({ type: 'led', payload: { ...color } })
      }
      this.prevEmotion = bb.emotion
    }

    this.prevX = bb.x
    this.prevY = bb.y
    this.prevRot = bb.rotation

    this.inner.update(bb)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    try {
      this.inner.sendCommand({ type: 'stop', payload: {} })
    } catch {
      /* best-effort hard stop */
    }
    this.inner.destroy()
  }

  sendCommand(command: AdapterCommand): void {
    this.inner.sendCommand(command)
  }

  capabilities(): RobotCapabilitiesV2 {
    return this.inner.capabilities()
  }

  // ── v2 lifecycle ──────────────────────────────────────────────

  async connect(): Promise<void> {
    return this.inner.connect()
  }

  async disconnect(): Promise<void> {
    try {
      this.inner.sendCommand({ type: 'stop', payload: {} })
    } catch {
      /* already gone */
    }
    return this.inner.disconnect()
  }

  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    return this.inner.onTelemetry(callback)
  }

  selfTest(): SelfTestReport {
    return this.inner.selfTest()
  }
}

// ─── Loopback robot (demo mode, no hardware needed) ───────────────

/**
 * LoopbackRobotAdapter — pretends to be a robot: records every command and
 * echoes synthetic telemetry. Used by the Connect page's "Demo robot" mode so
 * the full Magic Loop (pick character → deploy → watch commands) is
 * demonstrable without any hardware.
 */
export class LoopbackRobotAdapter implements RobotAdapterV2 {
  readonly type = 'loopback'
  readonly name = 'Demo Robot (loopback)'
  readonly contractVersion = 'v2' as const

  readonly commands: AdapterCommand[] = []
  private telemetryCb: ((e: TelemetryEvent) => void) | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  init(_bb: Blackboard): void {
    /* no-op */
  }
  update(_bb: Blackboard): void {
    /* no-op */
  }
  destroy(): void {
    /* no-op */
  }
  sendCommand(command: AdapterCommand): void {
    this.commands.push({ ...command, payload: { ...command.payload } })
    if (this.commands.length > 500) this.commands.splice(0, this.commands.length - 500)
  }
  capabilities(): RobotCapabilitiesV2 {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: false,
      maxSpeed: 1,
      maxRotationSpeed: 90,
      batteryReporting: true,
      distanceReporting: false,
      imuReporting: false,
      selfTestable: true,
      hardwareEStop: false,
    }
  }
  async connect(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => {
      this.telemetryCb?.({
        type: 'battery',
        payload: { level: 0.92 },
        t: Date.now(),
      })
    }, 5000)
  }
  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    this.telemetryCb = callback
    return () => {
      this.telemetryCb = null
    }
  }
  selfTest(): SelfTestReport {
    return {
      ok: true,
      status: 'healthy',
      summary: 'Loopback demo robot — no hardware',
      checks: [{ name: 'loopback', ok: true, message: 'commands recorded locally' }],
      timestamp: Date.now(),
      version: 'v2',
    }
  }
}
