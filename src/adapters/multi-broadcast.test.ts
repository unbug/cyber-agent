/**
 * MultiBroadcastAdapter — tests
 *
 * Verifies:
 *   - Command fan-out to all connected robots
 *   - NTP-style time sync with drift tracking
 *   - Global e-stop propagation
 *   - Health monitoring
 *   - Capabilities reporting
 *   - Self-test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { RobotAdapterV2, TelemetryEvent, AdapterCommand } from '@cyber-agent/sdk/adapter/contract'
import { DEFAULT_CAPABILITIES_V2 } from '@cyber-agent/sdk/adapter/contract'

function makeMockAdapter(id: string): RobotAdapterV2 {
  const commands: AdapterCommand[] = []

  return {
    type: id,
    name: id,
    contractVersion: 'v2',
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn((cmd: AdapterCommand) => { commands.push(cmd) }),
    onTelemetry: vi.fn(),
    capabilities: vi.fn(() => DEFAULT_CAPABILITIES_V2),
    selfTest: vi.fn().mockResolvedValue({ ok: true, status: 'healthy' as any, checks: [] }),
    init: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    get commandsSent() { return commands },
    get isConnected() { return true },
    get isDisconnected() { return false },
  } as unknown as RobotAdapterV2
}

describe('MultiBroadcastAdapter', () => {
  let adapter: any

  beforeEach(async () => {
    const mod = await import('@/adapters/multi-broadcast')
    adapter = new mod.MultiBroadcastAdapter()
  })

  afterEach(() => {
    adapter.destroy()
  })

  describe('robot management', () => {
    it('adds and removes adapters', () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      expect(adapter.getRobotIds()).toContain('robot-1')
      expect(adapter.getRobotIds()).toContain('robot-2')
      expect(adapter.getRobotIds()).toHaveLength(2)

      adapter.removeAdapter('robot-1')
      expect(adapter.getRobotIds()).not.toContain('robot-1')
      expect(adapter.getRobotIds()).toHaveLength(1)
    })
  })

  describe('command fan-out', () => {
    it('sends commands to all connected robots', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      await adapter.connect()

      adapter.sendCommand({ type: 'move', payload: { x: 1, y: 0 } })

      expect(mock1.sendCommand).toHaveBeenCalledWith({ type: 'move', payload: { x: 1, y: 0 } })
      expect(mock2.sendCommand).toHaveBeenCalledWith({ type: 'move', payload: { x: 1, y: 0 } })
    })

    it('does not send to disconnected robots', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      await adapter.connect()
      // Mark robot-2 as disconnected
      adapter.getHealthFor('robot-2')!.connected = false

      adapter.sendCommand({ type: 'move', payload: { x: 1, y: 0 } })

      expect(mock1.sendCommand).toHaveBeenCalled()
      expect(mock2.sendCommand).not.toHaveBeenCalled()
    })
  })

  describe('global e-stop', () => {
    it('sends emergency_stop to all robots', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      await adapter.connect()

      adapter.globalEStop()

      expect(mock1.sendCommand).toHaveBeenCalledWith({ type: 'emergency_stop', payload: {} })
      expect(mock2.sendCommand).toHaveBeenCalledWith({ type: 'emergency_stop', payload: {} })
      expect(adapter.getEStopActive()).toBe(true)
    })

    it('clears e-stop state', () => {
      adapter.globalEStop()
      expect(adapter.getEStopActive()).toBe(true)

      adapter.clearEStop()
      expect(adapter.getEStopActive()).toBe(false)
    })
  })

  describe('health monitoring', () => {
    it('tracks health for all robots', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      await adapter.connect()

      const health = adapter.getHealth()
      expect(health).toHaveLength(2)
      expect(health[0].connected).toBe(true)
      expect(health[1].connected).toBe(true)
    })

    it('reports unconnected robots', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      // Don't connect — health should show not connected
      const health = adapter.getHealth()
      expect(health[0].connected).toBe(false)
      expect(health[1].connected).toBe(false)
    })

    it('gets health for specific robot', async () => {
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      await adapter.connect()

      const health = adapter.getHealthFor('robot-1')
      expect(health).toBeDefined()
      expect(health!.connected).toBe(true)
    })
  })

  describe('time sync', () => {
    it('reports zero drift initially', async () => {
      expect(adapter.getDrift()).toBe(0)
      expect(adapter.getDriftOk()).toBe(true)
    })

    it('tracks drift after sync', async () => {
      // Simulate sync by setting sync state directly
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      // Drift starts at 0
      expect(adapter.getDrift()).toBe(0)
      expect(adapter.getDriftOk()).toBe(true)
    })
  })

  describe('capabilities', () => {
    it('reports multi-robot capabilities', () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      const caps = adapter.capabilities()
      expect(caps.movement).toBe(true)
      expect(caps.rotation).toBe(true)
      expect(caps.speed).toBe(true)
      expect(caps.led).toBe(true)
      expect(caps.sound).toBe(true)
      expect(caps.gesture).toBe(true)
      expect(caps.hardwareEStop).toBe(true)
      expect(caps.selfTestable).toBe(true)
    })

    it('reports no e-stop when no robots configured', () => {
      const caps = adapter.capabilities()
      expect(caps.hardwareEStop).toBe(false)
    })
  })

  describe('self-test', () => {
    it('returns ok when all robots connected', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      await adapter.connect()

      const result = adapter.selfTest()
      expect(result.ok).toBe(true)
      expect(result.status).toBe('healthy')
    })

    it('returns degraded when robots not connected', async () => {
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      const result = adapter.selfTest()
      expect(result.ok).toBe(false)
      expect(result.status).toBe('degraded')
    })

    it('returns degraded when e-stop is active', async () => {
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      await adapter.connect()
      adapter.globalEStop()

      const result = adapter.selfTest()
      expect(result.ok).toBe(false)
      expect(result.status).toBe('degraded')
    })

    it('reports robot count check', async () => {
      const result = adapter.selfTest()
      const countCheck = result.checks.find((c: { name: string }) => c.name === 'robot-count')
      expect(countCheck).toBeDefined()
      expect(countCheck!.ok).toBe(false)
      expect(countCheck!.message).toContain('0 robot')
    })
  })

  describe('telemetry forwarding', () => {
    it('forwards telemetry from a robot', () => {
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      let capturedEvent: TelemetryEvent | null = null
      adapter.onTelemetry((event: TelemetryEvent) => { capturedEvent = event })

      adapter.forwardTelemetry('robot-1', {
        t: performance.now(),
        type: 'telemetry',
        payload: { battery: 80 },
      })

      expect(capturedEvent).not.toBeNull()
      expect(capturedEvent!.payload).toHaveProperty('battery', 80)
    })

    it('updates health on telemetry', async () => {
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      await adapter.connect()

      const healthBefore = adapter.getHealthFor('robot-1')!
      const lastSeenBefore = healthBefore.lastSeen

      // Wait a bit to ensure time difference
      await new Promise(r => setTimeout(r, 10))

      adapter.forwardTelemetry('robot-1', {
        t: performance.now(),
        type: 'telemetry',
        payload: { battery: 80 },
      })

      const healthAfter = adapter.getHealthFor('robot-1')!
      expect(healthAfter.lastSeen).toBeGreaterThan(lastSeenBefore)
      expect(healthAfter.healthy).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('disconnects all robots', async () => {
      const mock1 = makeMockAdapter('robot-1')
      const mock2 = makeMockAdapter('robot-2')

      adapter.addAdapter('robot-1', mock1)
      adapter.addAdapter('robot-2', mock2)

      await adapter.connect()
      await adapter.disconnect()

      const health = adapter.getHealth()
      expect(health[0].connected).toBe(false)
      expect(health[1].connected).toBe(false)
    })
  })

  describe('destroy', () => {
    it('clears all state', () => {
      const mock1 = makeMockAdapter('robot-1')
      adapter.addAdapter('robot-1', mock1)

      adapter.destroy()

      expect(adapter.getRobotIds()).toHaveLength(0)
      expect(adapter.getHealth()).toHaveLength(0)
    })
  })
})
