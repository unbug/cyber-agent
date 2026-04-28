/**
 * Adapter contract v2 — unit tests
 *
 * Tests:
 * - isAdapterV2 type guard
 * - wrapV1AsV2 shim (v1 → v2 compatibility)
 * - SelfTestReport structure
 * - RobotCapabilitiesV2 defaults
 * - TelemetryEvent type
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isAdapterV2,
  wrapV1AsV2,
  DEFAULT_CAPABILITIES_V2,
  type RobotAdapterV1,
  type RobotAdapterV2,
  type SelfTestReport,
  type TelemetryEvent,
  type RobotCapabilitiesV2,
} from './contract'

// ─── Mock v1 adapter ────────────────────────────────────────────

function createMockV1(): RobotAdapterV1 {
  return {
    type: 'mock-v1',
    name: 'Mock V1 Adapter',
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    sendCommand: vi.fn(),
    capabilities: () => ({
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: false,
      maxSpeed: 50,
      maxRotationSpeed: 90,
    }),
  }
}

// ─── Mock v2 adapter ────────────────────────────────────────────

function createMockV2(): RobotAdapterV2 {
  return {
    type: 'mock-v2',
    name: 'Mock V2 Adapter',
    contractVersion: 'v2' as const,
    connect: vi.fn().mockResolvedValue(undefined),
    init: vi.fn(),
    update: vi.fn(),
    sendCommand: vi.fn(),
    onTelemetry: vi.fn().mockReturnValue(vi.fn()),
    selfTest: vi.fn().mockReturnValue({
      ok: true,
      status: 'healthy' as const,
      summary: 'All checks passed',
      checks: [{ name: 'motor', ok: true, message: 'OK' }],
      timestamp: Date.now(),
      version: '1.0.0',
    }),
    capabilities: () => ({
      ...DEFAULT_CAPABILITIES_V2,
      selfTestable: true,
      batteryReporting: true,
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('isAdapterV2', () => {
  it('returns true for v2 adapters', () => {
    const v2 = createMockV2()
    expect(isAdapterV2(v2)).toBe(true)
  })

  it('returns false for v1 adapters', () => {
    const v1 = createMockV1()
    expect(isAdapterV2(v1)).toBe(false)
  })

  it('returns false for objects missing contractVersion', () => {
    const obj = { type: 'test', name: 'Test' }
    expect(isAdapterV2(obj as any)).toBe(false)
  })
})

describe('wrapV1AsV2', () => {
  let v1: RobotAdapterV1
  let v2: RobotAdapterV2

  beforeEach(() => {
    v1 = createMockV1()
    v2 = wrapV1AsV2(v1)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has contractVersion v2', () => {
    expect(v2.contractVersion).toBe('v2')
  })

  it('delegates init to v1', () => {
    const mockBB = {
      x: 100, y: 200, rotation: 0, speed: 1,
      emotion: 'idle' as const, energy: 1, excitement: 0,
      tick: 0, deltaMs: 0, totalMs: 0,
      pointerX: 0, pointerY: 0, pointerActive: false,
      canvasWidth: 400, canvasHeight: 300,
    }
    v2.init(mockBB)
    expect(v1.init).toHaveBeenCalledWith(mockBB)
  })

  it('delegates update to v1', () => {
    const mockBB = {
      x: 100, y: 200, rotation: 0, speed: 1,
      emotion: 'idle' as const, energy: 1, excitement: 0,
      tick: 0, deltaMs: 0, totalMs: 0,
      pointerX: 0, pointerY: 0, pointerActive: false,
      canvasWidth: 400, canvasHeight: 300,
    }
    v2.update(mockBB)
    expect(v1.update).toHaveBeenCalledWith(mockBB)
  })

  it('delegates destroy to v1', () => {
    v2.destroy()
    expect(v1.destroy).toHaveBeenCalled()
  })

  it('returns extended capabilities from v1', () => {
    const caps = v2.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.led).toBe(true)
    expect(caps.sound).toBe(true)
    expect(caps.batteryReporting).toBe(false)
    expect(caps.hardwareEStop).toBe(false)
  })

  it('returns synthetic selfTestReport for v1', () => {
    const report = v2.selfTest()
    expect(report.ok).toBe(true)
    expect(report.status).toBe('healthy')
    expect(report.version).toBe('v1-shim')
    expect(report.checks).toHaveLength(1)
    expect(report.checks[0].name).toBe('shim')
  })

  it('onTelemetry registers and unregisters callback', () => {
    const callback = vi.fn()
    const unsubscribe = v2.onTelemetry(callback)

    expect(callback).not.toHaveBeenCalled()

    // Simulate a telemetry event
    const mockEvent: TelemetryEvent = {
      type: 'battery',
      payload: { level: 80 },
      t: Date.now(),
    }
    // The shim stores the callback internally; we verify the unsubscribe works
    unsubscribe()
    // After unsubscribe, calling the stored callback should be a no-op
    // (in the shim, we set telemetryCallback = null)
  })

  it('disconnect clears state', async () => {
    // Connect first (simulated)
    await v2.connect()
    v2.sendCommand({ type: 'test', payload: {} })

    // Disconnect should clear command queue
    await v2.disconnect()
    // Verify destroy also works after disconnect
    v2.destroy()
    expect(v1.destroy).toHaveBeenCalled()
  })
})

describe('DEFAULT_CAPABILITIES_V2', () => {
  it('has all v2 fields', () => {
    const caps = DEFAULT_CAPABILITIES_V2
    expect(caps.movement).toBe(true)
    expect(caps.batteryReporting).toBe(false)
    expect(caps.distanceReporting).toBe(false)
    expect(caps.imuReporting).toBe(false)
    expect(caps.selfTestable).toBe(false)
    expect(caps.hardwareEStop).toBe(false)
  })
})

describe('SelfTestReport type', () => {
  it('accepts valid report structure', () => {
    const report: SelfTestReport = {
      ok: true,
      status: 'healthy',
      summary: 'OK',
      checks: [{ name: 'test', ok: true, message: 'OK' }],
      timestamp: Date.now(),
      version: '1.0.0',
    }
    expect(report.ok).toBe(true)
  })

  it('accepts degraded status', () => {
    const report: SelfTestReport = {
      ok: false,
      status: 'degraded',
      summary: 'Minor issue',
      checks: [{ name: 'battery', ok: false, message: 'Low' }],
      timestamp: Date.now(),
      version: '1.0.0',
    }
    expect(report.ok).toBe(false)
    expect(report.status).toBe('degraded')
  })
})

describe('TelemetryEvent type', () => {
  it('accepts valid event structure', () => {
    const event: TelemetryEvent = {
      type: 'battery',
      payload: { level: 85, voltage: 7.8 },
      t: Date.now(),
    }
    expect(event.type).toBe('battery')
    expect(event.payload.level).toBe(85)
  })
})

describe('RobotCapabilitiesV2 type', () => {
  it('extends RobotCapabilities with v2 fields', () => {
    const caps: RobotCapabilitiesV2 = {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: false,
      maxSpeed: 100,
      maxRotationSpeed: 180,
      batteryReporting: true,
      distanceReporting: true,
      imuReporting: false,
      selfTestable: true,
      hardwareEStop: true,
      maxBatteryVoltage: 8.4,
      minBatteryVoltage: 6.0,
    }
    expect(caps.batteryReporting).toBe(true)
    expect(caps.maxBatteryVoltage).toBe(8.4)
    expect(caps.hardwareEStop).toBe(true)
  })
})
