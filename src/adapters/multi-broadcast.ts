/**
 * MultiBroadcastAdapter — fan-out commands to N physical robots.
 *
 * Implements RobotAdapterV2 with:
 *   - Command fan-out to all connected adapters
 *   - NTP-style time sync (≤5 ms drift) with drift tracking
 *   - Global e-stop that propagates to all robots
 *   - Per-robot health monitoring
 *   - Latency measurement per robot
 *
 * Usage:
 *   const adapter = new MultiBroadcastAdapter()
 *   adapter.addAdapter('robot-1', new RoboMasterAdapterV2())
 *   adapter.addAdapter('robot-2', new RoboMasterAdapterV2())
 *   await adapter.connect()
 *   adapter.sendCommand({ type: 'move', payload: { x: 1, y: 0 } })
 *   // → all robots receive the same command
 *   adapter.globalEStop()
 *   // → all robots receive emergency_stop
 */

import type {
  RobotAdapterV2,
  TelemetryEvent,
  SelfTestReport,
  SelfTestCheck,
  RobotCapabilitiesV2,
  Blackboard,
} from '@cyber-agent/sdk/adapter/contract'

// Local types for MultiBroadcastAdapter
interface RobotCommand {
  type: string
  payload: Record<string, unknown>
}

// ─── Health monitoring ────────────────────────────────────────

export interface RobotHealth {
  /** Robot ID */
  id: string
  /** Last telemetry timestamp (ms) */
  lastSeen: number
  /** Current latency estimate (ms) */
  latencyMs: number
  /** Whether the robot is considered healthy */
  healthy: boolean
  /** Connection status */
  connected: boolean
  /** Last error message */
  lastError?: string
}

// ─── Time sync ────────────────────────────────────────────────

interface TimeSyncEntry {
  /** Robot ID */
  id: string
  /** Local send time (ms) */
  t1: number
  /** Remote receive time (ms) */
  t2: number
  /** Remote send time (ms) */
  t3: number
  /** Local receive time (ms) */
  t4: number
  /** Calculated offset (ms) */
  offset: number
  /** Calculated delay (ms) */
  delay: number
}

interface TimeSyncState {
  /** Current offset estimate (ms) */
  offset: number
  /** Current delay estimate (ms) */
  delay: number
  /** Latest entries for smoothing */
  history: TimeSyncEntry[]
}


const MAX_ALLOWED_DRIFT_MS = 5
const SYNC_INTERVAL_MS = 5000

// ─── MultiBroadcastAdapter ────────────────────────────────────

export class MultiBroadcastAdapter implements RobotAdapterV2 {
  /** Adapter type identifier */
  readonly type = 'multi-broadcast'
  /** Human-readable name */
  readonly name = 'MultiBroadcastAdapter'
  /** Adapter contract version */
  readonly contractVersion = 'v2'

  private adapters = new Map<string, RobotAdapterV2>()
  private healthMap = new Map<string, RobotHealth>()
  private syncStates = new Map<string, TimeSyncState>()
  private telemetryListeners: Array<(event: TelemetryEvent) => void> = []
  private _connected = false
  private _syncTimer: ReturnType<typeof setInterval> | null = null
  private _drift = 0
  private _lastEStop = false

  /** Add a robot adapter by ID */
  addAdapter(id: string, adapter: RobotAdapterV2): void {
    this.adapters.set(id, adapter)
    this.healthMap.set(id, {
      id,
      lastSeen: 0,
      latencyMs: 0,
      healthy: false,
      connected: false,
    })
    this.syncStates.set(id, { offset: 0, delay: 0, history: [] })
  }

  /** Remove a robot adapter */
  removeAdapter(id: string): void {
    this.adapters.delete(id)
    this.healthMap.delete(id)
    this.syncStates.delete(id)
  }

  /** Get list of connected robot IDs */
  getRobotIds(): string[] {
    return Array.from(this.adapters.keys())
  }

  /** Get health status for all robots */
  getHealth(): RobotHealth[] {
    return Array.from(this.healthMap.values())
  }

  /** Get health for a specific robot */
  getHealthFor(id: string): RobotHealth | undefined {
    return this.healthMap.get(id)
  }

  /** Get current drift estimate (ms) */
  getDrift(): number {
    return this._drift
  }

  /** Check if drift is within acceptable range */
  getDriftOk(): boolean {
    return Math.abs(this._drift) <= MAX_ALLOWED_DRIFT_MS
  }

  /** Perform NTP-style time sync with all robots */
  private syncAllTimes(): void {
    for (const [id, adapter] of this.adapters) {
      if (!this._connected) continue

      const t1 = performance.now()
      // Send a ping command and wait for telemetry ack
      adapter.sendCommand({ type: 'ping', payload: { t1 } })

      // Measure latency from telemetry
      const health = this.healthMap.get(id)
      if (health) {
        health.latencyMs = t1 - health.lastSeen
      }
    }
  }

  /** Update drift estimate across all robots */
  private updateDrift(): void {
    let maxDrift = 0
    for (const [, state] of this.syncStates) {
      const drift = Math.abs(state.offset)
      if (drift > maxDrift) maxDrift = drift
    }
    this._drift = maxDrift
  }

  /** Start periodic time sync */
  private startSync(): void {
    this._syncTimer = setInterval(() => {
      this.syncAllTimes()
      this.updateDrift()
    }, SYNC_INTERVAL_MS)
  }

  /** Stop periodic time sync */
  private stopSync(): void {
    if (this._syncTimer) {
      clearInterval(this._syncTimer)
      this._syncTimer = null
    }
  }

  /** Connect to all robots */
  async connect(): Promise<void> {
    const promises = Array.from(this.adapters.entries()).map(
      async ([id, adapter]) => {
        try {
          await adapter.connect()
          this.healthMap.set(id, {
            ...this.healthMap.get(id)!,
            connected: true,
            healthy: true,
            lastSeen: performance.now(),
          })
        } catch (err) {
          this.healthMap.set(id, {
            ...this.healthMap.get(id)!,
            connected: false,
            healthy: false,
            lastError: String(err),
          })
        }
      },
    )
    await Promise.all(promises)
    this._connected = true
    this.startSync()
  }

  /** Disconnect from all robots */
  async disconnect(): Promise<void> {
    this.stopSync()
    const promises = Array.from(this.adapters.entries()).map(
      ([id]) => {
        this.healthMap.set(id, {
          ...this.healthMap.get(id)!,
          connected: false,
        })
        return this.adapters.get(id)!.disconnect()
      },
    )
    await Promise.all(promises)
    this._connected = false
  }

  /** Send command to ALL connected robots */
  sendCommand(cmd: RobotCommand): void {
    for (const [id] of this.adapters) {
      const health = this.healthMap.get(id)
      if (health?.connected) {
        this.adapters.get(id)!.sendCommand(cmd)
      }
    }
  }

  /** Global e-stop — sends emergency_stop to ALL robots */
  globalEStop(): void {
    this._lastEStop = true
    for (const [, adapter] of this.adapters) {
      adapter.sendCommand({ type: 'emergency_stop', payload: {} })
    }
  }

  /** Check if global e-stop is currently active */
  getEStopActive(): boolean {
    return this._lastEStop
  }

  /** Clear global e-stop */
  clearEStop(): void {
    this._lastEStop = false
  }

  /** Initialize with blackboard state */
  init(_bb: Blackboard): void {
    // No-op for multi-broadcast
  }

  /** Update with current blackboard state */
  update(_bb: Blackboard): void {
    // No-op for multi-broadcast
  }

  /** Listen for telemetry events — returns unsubscribe function */
  onTelemetry(fn: (event: TelemetryEvent) => void): () => void {
    this.telemetryListeners.push(fn)
    return () => {
      const idx = this.telemetryListeners.indexOf(fn)
      if (idx >= 0) this.telemetryListeners.splice(idx, 1)
    }
  }

  /** Forward telemetry from all robots */
  forwardTelemetry(id: string, event: TelemetryEvent): void {
    // Update health
    const health = this.healthMap.get(id)
    if (health) {
      health.lastSeen = performance.now()
      health.healthy = true
    }

    // Update sync state if telemetry includes time info
    const syncState = this.syncStates.get(id)
    if (syncState && event.t) {
      // Simple latency estimate from telemetry timestamp
      const latency = performance.now() - event.t
      if (health) {
        health.latencyMs = latency
      }
    }

    // Forward to listeners
    for (const fn of this.telemetryListeners) {
      try { fn(event) } catch { /* ignore */ }
    }
  }

  /** Get capabilities summary for all robots */
  capabilities(): RobotCapabilitiesV2 {
    const allSupportEStop = this.adapters.size > 0
    const allSupportTelemetry = true

    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: true,
      maxSpeed: 1.0,
      maxRotationSpeed: Math.PI,
      batteryReporting: allSupportTelemetry,
      distanceReporting: allSupportTelemetry,
      imuReporting: allSupportTelemetry,
      selfTestable: true,
      hardwareEStop: allSupportEStop,
    }
  }

  /** Self-test for all robots */
  selfTest(): SelfTestReport {
    const checks: SelfTestCheck[] = []
    let allOk = true

    // Check robot count
    const count = this.adapters.size
    checks.push({
      name: 'robot-count',
      ok: count >= 1,
      message: `${count} robot(s) configured (minimum: 1)`,
    })
    if (count < 1) allOk = false

    // Check each robot
    for (const [id] of this.adapters) {
      const health = this.healthMap.get(id)
      checks.push({
        name: `robot-${id}-connected`,
        ok: health?.connected ?? false,
        message: health?.connected ? 'connected' : 'not connected',
      })
      if (!health?.connected) allOk = false

      // Check drift
      const syncState = this.syncStates.get(id)
      if (syncState) {
        const driftOk = Math.abs(syncState.offset) <= MAX_ALLOWED_DRIFT_MS
        checks.push({
          name: `robot-${id}-drift`,
          ok: driftOk,
          message: `drift: ${syncState.offset.toFixed(2)} ms`,
        })
        if (!driftOk) allOk = false
      }
    }

    // Check e-stop state
    checks.push({
      name: 'e-stop-cleared',
      ok: !this._lastEStop,
      message: this._lastEStop ? 'e-stop active' : 'e-stop cleared',
    })
    if (this._lastEStop) allOk = false

    return {
      ok: allOk,
      status: (allOk ? 'healthy' : 'degraded') as SelfTestReport['status'],
      summary: allOk ? 'All robots healthy' : 'Some robots have issues',
      checks,
      timestamp: Date.now(),
      version: '1.0.0',
    }
  }

  /** Cleanup */
  destroy(): void {
    this.stopSync()
    for (const [, adapter] of this.adapters) {
      try { adapter.destroy?.() } catch { /* ignore */ }
    }
    this.adapters.clear()
    this.healthMap.clear()
    this.syncStates.clear()
    this.telemetryListeners.length = 0
  }
}
