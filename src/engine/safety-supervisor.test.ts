/**
 * SafetySupervisor unit tests
 *
 * Tests heartbeat monitoring, e-stop trigger, motor stall detection,
 * battery voltage monitoring, and policy changes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SafetySupervisor } from './safety-supervisor'

function buildMockAdapter() {
  const commands: Array<{ type: string; payload: Record<string, unknown> }> = []
  return {
    type: 'test-adapter',
    name: 'Test Adapter',
    sendCommand: vi.fn((cmd: { type: string; payload: Record<string, unknown> }) => {
      commands.push(cmd)
    }),
    commands,
  }
}

describe('SafetySupervisor', () => {
  let adapter: {
    type: string
    name: string
    sendCommand: (cmd: { type: string; payload: Record<string, unknown> }) => void
    commands: Array<{ type: string; payload: Record<string, unknown> }>
  }
  let supervisor: SafetySupervisor

  beforeEach(() => {
    adapter = buildMockAdapter()
    vi.useFakeTimers()
    // Mock performance.now so SafetySupervisor gap detection works with fake timers
    vi.spyOn(globalThis.performance, 'now').mockImplementation(() => Date.now())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ── Construction ───────────────────────────────────────────

  it('creates with default e-stop policy', () => {
    supervisor = new SafetySupervisor(adapter)
    expect(supervisor.state).toBe('ok')
    expect(supervisor.eStopActive).toBe(false)
  })

  it('creates with custom options', () => {
    supervisor = new SafetySupervisor(adapter, {
      maxGapMs: 500,
      missThreshold: 5,
      motorStallThresholdA: 3.0,
    })
    expect(supervisor.state).toBe('ok')
  })

  // ── Heartbeat ──────────────────────────────────────────────

  it('starts monitoring and heartbeat resets gap', () => {
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 100, missThreshold: 10 })
    supervisor.start()

    // Advance past threshold but below miss threshold
    vi.advanceTimersByTime(150)
    expect(supervisor.state).toBe('ok') // not yet at threshold

    // Heartbeat resets
    supervisor.heartbeat()
    expect(supervisor.state).toBe('ok')

    // Advance again — still ok since we reset
    vi.advanceTimersByTime(150)
    expect(supervisor.state).toBe('ok') // still ok, heartbeat reset the gap

    supervisor.stop()
  })

  it('triggers e-stop after consecutive heartbeat misses', () => {
    // maxGapMs must be < interval (50ms) for gap to exceed threshold
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 40, missThreshold: 2 })
    supervisor.start()

    // Advance past first check (50ms): gap=50 >= 40, consecutiveMisses=1
    vi.advanceTimersByTime(50)
    expect(supervisor.state).toBe('ok') // not yet at threshold

    // Advance to second check (100ms): gap=100 >= 40, consecutiveMisses=2, e-stop!
    vi.advanceTimersByTime(50)
    expect(supervisor.state).toBe('e_stopped')
    expect(supervisor.eStopActive).toBe(true)

    // E-stop command sent
    const eStopCmd = adapter.commands.find(c => c.type === 'e_stop')
    expect(eStopCmd).toBeDefined()
    expect(eStopCmd!.payload.reason).toBe('heartbeat_loss')

    supervisor.stop()
  })

  // ── E-stop ─────────────────────────────────────────────────

  it('triggers e-stop only once', () => {
    // maxGapMs < interval so gap exceeds threshold
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 40, missThreshold: 1 })
    supervisor.start()

    vi.advanceTimersByTime(100)

    // Should only have one e-stop command
    const eStopCount = adapter.commands.filter(c => c.type === 'e_stop').length
    expect(eStopCount).toBe(1)

    supervisor.stop()
  })

  it('clearEStop resets state', () => {
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 40, missThreshold: 1 })
    supervisor.start()

    vi.advanceTimersByTime(100)
    expect(supervisor.state).toBe('e_stopped')

    supervisor.clearEStop()
    expect(supervisor.state).toBe('ok')
    expect(supervisor.eStopActive).toBe(false)

    supervisor.stop()
  })

  // ── Motor stall ────────────────────────────────────────────

  it('detects motor stall with warn policy', () => {
    supervisor = new SafetySupervisor(adapter, {
      motorStallThresholdA: 1.5,
    })
    // Default policy is e-stop, so motor stall triggers e-stop
    supervisor.reportMotorCurrent('left', 2.0)

    // With default e-stop policy, motor stall triggers e-stop
    expect(supervisor.state).toBe('e_stopped')

    const stallCmd = adapter.commands.find(c => c.type === 'e_stop')
    expect(stallCmd).toBeDefined()
  })

  it('does not trigger on normal current', () => {
    supervisor = new SafetySupervisor(adapter, { motorStallThresholdA: 2.0 })
    supervisor.reportMotorCurrent('left', 1.0)

    expect(supervisor.state).toBe('ok')
  })

  // ── Battery ────────────────────────────────────────────────

  it('reports battery low warning', () => {
    supervisor = new SafetySupervisor(adapter, {
      batteryLowVoltage: 3.5,
      minBatteryVoltage: 3.0,
    })
    supervisor.reportBatteryVoltage(3.2)
    expect(supervisor.state).toBe('ok') // below warning but above min
  })

  it('reports critical battery', () => {
    supervisor = new SafetySupervisor(adapter, {
      batteryLowVoltage: 3.5,
      minBatteryVoltage: 3.0,
    })
    supervisor.reportBatteryVoltage(2.5)
    expect(supervisor.state).toBe('degraded')
  })

  // ── Policy ─────────────────────────────────────────────────

  it('changes policy at runtime', () => {
    supervisor = new SafetySupervisor(adapter)
    let policyChanged = false

    supervisor.onEvent((event) => {
      if (event.type === 'policy_changed') {
        policyChanged = true
      }
    })

    supervisor.setPolicy({ kind: 'warn', maxGapMs: 300 })
    expect(policyChanged).toBe(true)
  })

  // ── Self-test ──────────────────────────────────────────────

  it('runs self-test', async () => {
    supervisor = new SafetySupervisor(adapter)
    const result = await supervisor.runSelfTest()

    expect(result.ok).toBe(true)
    expect(result.status).toBe('healthy')
    expect(result.checks.length).toBeGreaterThan(0)
  })

  // ── Event listener ─────────────────────────────────────────

  it('emits events to listeners', () => {
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 50, missThreshold: 1 })
    let heartbeatEventReceived = false

    supervisor.onEvent((event) => {
      if (event.type === 'heartbeat_ok') {
        heartbeatEventReceived = true
      }
    })

    supervisor.start()
    supervisor.heartbeat()

    expect(heartbeatEventReceived).toBe(true)
    supervisor.stop()
  })

  // ── Stop ───────────────────────────────────────────────────

  it('stops monitoring', () => {
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 40, missThreshold: 1 })
    supervisor.start()

    vi.advanceTimersByTime(100)
    expect(supervisor.state).toBe('e_stopped')

    supervisor.clearEStop()
    supervisor.stop()

    // After stop, no more timer firing
    expect(supervisor.state).toBe('ok') // cleared
  })

  // ── Heartbeat after e-stop auto-recovery ──────────────────

  it('auto-recovers from e-stop on heartbeat', () => {
    supervisor = new SafetySupervisor(adapter, { maxGapMs: 40, missThreshold: 1 })
    supervisor.start()

    vi.advanceTimersByTime(100)
    expect(supervisor.state).toBe('e_stopped')

    supervisor.heartbeat()
    expect(supervisor.state).toBe('ok')
    expect(supervisor.eStopActive).toBe(false)

    supervisor.stop()
  })
})
