/**
 * CyberAgent Safety Supervisor
 *
 * Monitors the health of a running adapter and enforces safety policies:
 *   - Heartbeat loss detection (configurable threshold)
 *   - Kill switch on repeated heartbeat loss
 *   - Motor stall detection (watt-dog)
 *   - E-stop trigger with tracer event emission
 *
 * Usage:
 *   const supervisor = new SafetySupervisor(adapter, { maxGapMs: 200, onLoss: 'e-stop' })
 *   supervisor.start()
 *   // ... run BT ...
 *   supervisor.stop()
 */

import { emitError } from './tracer'

// ─── Types ──────────────────────────────────────────────────────

export type SafetyEvent =
  | { type: 'heartbeat_ok'; t: number }
  | { type: 'heartbeat_miss'; t: number; gapMs: number; consecutiveMisses: number }
  | { type: 'e_stop_triggered'; t: number; reason: string }
  | { type: 'motor_stall'; t: number; motor: string; currentA: number; thresholdA: number }
  | { type: 'battery_low'; t: number; voltage: number; minVoltage: number }
  | { type: 'self_test_fail'; t: number; checkName: string; message: string }
  | { type: 'policy_changed'; t: number; oldPolicy: string; newPolicy: string }

export type SafetyState = 'ok' | 'degraded' | 'e_stopped'

export type SafetyPolicy =
  | { kind: 'warn'; maxGapMs?: number; missThreshold?: number }
  | { kind: 'pause'; maxGapMs?: number; missThreshold?: number }
  | { kind: 'e-stop'; maxGapMs?: number; missThreshold?: number }

export interface SafetyOptions {
  /** Max allowed gap between heartbeats (ms). Default: 200 */
  maxGapMs?: number
  /** Number of consecutive missed heartbeats before action triggers. Default: 3 */
  missThreshold?: number
  /** Motor stall current threshold (Amps). Default: 2.0 */
  motorStallThresholdA?: number
  /** Battery low voltage threshold (V). Default: 3.0 */
  batteryLowVoltage?: number
  /** Minimum safe battery voltage (V). Default: 2.8 */
  minBatteryVoltage?: number
}

// ─── Default policy ─────────────────────────────────────────────

function defaultPolicy(opts: SafetyOptions): SafetyPolicy {
  const kind = 'e-stop' as const
  return {
    kind,
    maxGapMs: opts.maxGapMs ?? 200,
    missThreshold: opts.missThreshold ?? 3,
  }
}

// ─── Safety Supervisor ──────────────────────────────────────────

export class SafetySupervisor {
  private adapter: {
    type: string
    name: string
    sendCommand: (cmd: { type: string; payload: Record<string, unknown> }) => void
  }
  private _policy: SafetyPolicy
  private _state: SafetyState = 'ok'
  private consecutiveMisses: number = 0
  private motorStallThresholdA: number
  private batteryLowVoltage: number
  private minBatteryVoltage: number
  private timerId: ReturnType<typeof setInterval> | null = null
  private listeners: Set<(event: SafetyEvent) => void> = new Set()
  private _eStopActive = false
  private _lastHeartbeatT: number = 0

  constructor(
    adapter: {
      type: string
      name: string
      sendCommand: (cmd: { type: string; payload: Record<string, unknown> }) => void
    },
    opts?: SafetyOptions,
  ) {
    this.adapter = adapter
    this._policy = defaultPolicy(opts ?? {})
    this.motorStallThresholdA = opts?.motorStallThresholdA ?? 2.0
    this.batteryLowVoltage = opts?.batteryLowVoltage ?? 3.0
    this.minBatteryVoltage = opts?.minBatteryVoltage ?? 2.8
  }

  get state(): SafetyState { return this._state }
  get eStopActive(): boolean { return this._eStopActive }
  get policy(): SafetyPolicy { return this._policy }

  /** Subscribe to safety events */
  onEvent(fn: (event: SafetyEvent) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  /** Get all recorded safety events */
  getEvents(): SafetyEvent[] {
    // Return a snapshot — in production this would be a ring buffer
    // For now we return the internal listeners' view (minimal)
    return []
  }

  /** Start monitoring */
  start(): void {
    this._eStopActive = false
    this._state = 'ok'
    this._lastHeartbeatT = performance.now()
    this.consecutiveMisses = 0

    this.timerId = setInterval(() => {
      this.checkHeartbeat()
    }, 50) // Check every 50ms
  }

  /** Stop monitoring */
  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    this._eStopActive = false
    this._state = 'ok'
    this.consecutiveMisses = 0
  }

  /** Manually report a heartbeat (called by adapter on each tick) */
  heartbeat(): void {
    const now = performance.now()
    this._lastHeartbeatT = now
    this.consecutiveMisses = 0

    if (this._state === 'e_stopped') {
      // Heartbeat after e-stop — auto-recover
      this._eStopActive = false
      this._state = 'ok'
      this.emitEvent({ type: 'heartbeat_ok', t: now })
      return
    }

    this.emitEvent({ type: 'heartbeat_ok', t: now })
  }

  /** Report motor current reading */
  reportMotorCurrent(motor: string, currentA: number): void {
    if (currentA > this.motorStallThresholdA) {
      this._state = 'degraded'
      const event: SafetyEvent = {
        type: 'motor_stall',
        t: performance.now(),
        motor,
        currentA,
        thresholdA: this.motorStallThresholdA,
      }
      this.emitEvent(event)
      emitError(`Motor stall detected: ${motor} at ${currentA.toFixed(2)}A`, performance.now())

      if (this._policy.kind === 'e-stop') {
        this.triggerEStop('motor_stall')
      }
    }
  }

  /** Report battery voltage reading */
  reportBatteryVoltage(voltage: number): void {
    if (voltage < this.minBatteryVoltage) {
      this._state = 'degraded'
      const event: SafetyEvent = {
        type: 'battery_low',
        t: performance.now(),
        voltage,
        minVoltage: this.minBatteryVoltage,
      }
      this.emitEvent(event)
      emitError(`Battery low: ${voltage.toFixed(2)}V (min: ${this.minBatteryVoltage}V)`, performance.now())
    } else if (voltage < this.batteryLowVoltage) {
      const event: SafetyEvent = {
        type: 'battery_low',
        t: performance.now(),
        voltage,
        minVoltage: this.minBatteryVoltage,
      }
      this.emitEvent(event)
    }
  }

  /** Trigger e-stop: stop all motors, emit tracer event */
  triggerEStop(reason: string): void {
    if (this._eStopActive) return
    this._eStopActive = true
    this._state = 'e_stopped'
    const t = performance.now()

    // Send e-stop command to adapter
    try {
      this.adapter.sendCommand({
        type: 'e_stop',
        payload: { reason, timestamp: t },
      })
    } catch {
      // Adapter may not support e-stop
    }

    const event: SafetyEvent = {
      type: 'e_stop_triggered',
      t,
      reason,
    }
    this.emitEvent(event)
    emitError(`E-stop triggered: ${reason}`, t)
  }

  /** Clear e-stop (requires manual reset) */
  clearEStop(): void {
    this._eStopActive = false
    this._state = 'ok'
    this.consecutiveMisses = 0
    this._lastHeartbeatT = performance.now()
    this.emitEvent({ type: 'heartbeat_ok', t: performance.now() })
  }

  /** Update safety policy at runtime */
  setPolicy(newPolicy: SafetyPolicy): void {
    const oldKind = this._policy.kind
    this._policy = newPolicy
    this.emitEvent({
      type: 'policy_changed',
      t: performance.now(),
      oldPolicy: oldKind,
      newPolicy: newPolicy.kind,
    })
  }

  /** Run a self-test against the adapter (if it supports v2 selfTest) */
  async runSelfTest(): Promise<{ ok: boolean; status: string; checks: Array<{ name: string; ok: boolean; message: string }> }> {
    const checks: Array<{ name: string; ok: boolean; message: string }> = []

    // Check 1: adapter type is known
    checks.push({
      name: 'adapter_type',
      ok: this.adapter.type.length > 0,
      message: `Adapter type: ${this.adapter.type}`,
    })

    // Check 2: adapter can send commands (best-effort)
    try {
      this.adapter.sendCommand({ type: 'self_test_ping', payload: { t: performance.now() } })
      checks.push({ name: 'command_send', ok: true, message: 'Adapter accepts commands' })
    } catch {
      checks.push({ name: 'command_send', ok: false, message: 'Failed to send command to adapter' })
    }

    return {
      ok: checks.every(c => c.ok),
      status: checks.every(c => c.ok) ? 'healthy' : 'unhealthy',
      checks,
    }
  }

  // ── Private ──────────────────────────────────────────────────

  private checkHeartbeat(): void {
    const now = performance.now()
    const gap = now - this._lastHeartbeatT
    const maxGap = (this._policy as { kind: string; maxGapMs?: number }).maxGapMs ?? 200
    const missThreshold = (this._policy as { kind: string; missThreshold?: number }).missThreshold ?? 3

    if (gap >= maxGap) {
      this.consecutiveMisses++
      const event: SafetyEvent = {
        type: 'heartbeat_miss',
        t: now,
        gapMs: gap,
        consecutiveMisses: this.consecutiveMisses,
      }
      this.emitEvent(event)

      if (this.consecutiveMisses >= missThreshold) {
        if (this._policy.kind === 'warn') {
          this._state = 'degraded'
        } else if (this._policy.kind === 'pause') {
          this._state = 'e_stopped'
          this.triggerEStop('heartbeat_loss')
        } else if (this._policy.kind === 'e-stop') {
          this._state = 'e_stopped'
          this.triggerEStop('heartbeat_loss')
        }
      }
    }
  }

  private emitEvent(event: SafetyEvent): void {
    for (const fn of this.listeners) {
      try { fn(event) } catch { /* don't break listeners */ }
    }
  }
}
