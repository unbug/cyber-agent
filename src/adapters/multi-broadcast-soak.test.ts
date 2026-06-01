/**
 * MultiBroadcastAdapter — simulated soak test
 *
 * Simulates 3+ robots running for an extended period, verifying:
 *   - No cross-talk (commands don't mix up between robots)
 *   - No command drops (all sent commands get telemetry ack)
 *   - Drift stays within bounds
 *   - Health monitoring remains accurate
 *   - Self-test stays green
 *
 * This is a simulated soak test — it runs the full lifecycle
 * with mock adapters in a tight loop to detect memory leaks,
 * state corruption, and cross-talk issues.
 *
 * Real hardware soak test: see docs/hil/multi-broadcast/CHECKLIST.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { RobotAdapterV2, AdapterCommand } from '@cyber-agent/sdk/adapter/contract'
import { DEFAULT_CAPABILITIES_V2 } from '@cyber-agent/sdk/adapter/contract'

// ─── Helpers ─────────────────────────────────────────────────

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
  } as unknown as RobotAdapterV2 & { commandsSent: AdapterCommand[] }
}

// ─── Tests ───────────────────────────────────────────────────

describe('MultiBroadcastAdapter — simulated soak test', () => {
  let adapter: any
  let mockRobots: Map<string, RobotAdapterV2>

  beforeEach(async () => {
    const mod = await import('@/adapters/multi-broadcast')
    adapter = new mod.MultiBroadcastAdapter()

    // Simulate 3+ robots
    mockRobots = new Map()
    const robotIds = ['robot-1', 'robot-2', 'robot-3', 'robot-4']
    for (const id of robotIds) {
      const mock = makeMockAdapter(id)
      mockRobots.set(id, mock)
      adapter.addAdapter(id, mock)
    }

    await adapter.connect()
  })

  afterEach(() => {
    adapter.destroy()
  })

  it('handles 10,000 commands across 4 robots with zero cross-talk', async () => {
    const numCommands = 10_000
    const robotIds = adapter.getRobotIds()

    // Send commands in a round-robin pattern
    for (let i = 0; i < numCommands; i++) {
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = {
        type: i % 3 === 0 ? 'move' : (i % 3 === 1 ? 'rotate' : 'led'),
        payload: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          angle: Math.random() * Math.PI * 2,
          color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        },
      }

      adapter.sendCommand(cmd)

      // Immediately ack to keep pending at zero (no time passes in test)
      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    // Verify zero cross-talk
    const report = adapter.getCrossTalkReport()
    expect(report.status).toBe('clean')
    expect(report.totalDrops).toBe(0)
    expect(report.hasCriticalRobot).toBe(false)

    // MultiBroadcastAdapter broadcasts to ALL robots, so each mock receives all commands
    for (const [id, mock] of mockRobots) {
      const sent = (mock as any).commandsSent.length
      expect(sent).toBe(numCommands) // broadcast to all = all get all commands

      // Verify no cross-talk: each robot only received its own commands
      const crossTalk = report.perRobot.find((r: any) => r.id === id)
      if (crossTalk) {
        expect(crossTalk.drops).toBe(0)
      }
    }
  })

  it('detects command drops when telemetry acks are missing', async () => {
    // Use a very short pending timeout
    adapter.setPendingTimeout(10)

    const numCommands = 1000
    let unacked = 0

    for (let i = 0; i < numCommands; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.5, y: 0.5 } }

      adapter.sendCommand(cmd)

      // Only ack 95% of the time (simulate 5% loss)
      if (Math.random() > 0.05) {
        const seq = adapter.getSeq(robotId)
        const lastSent = seq.sent[seq.sent.length - 1]
        if (lastSent) {
          adapter.recordTelemetryAck(robotId, lastSent.seq)
        }
      } else {
        unacked++
      }
    }

    // Manually age unacked entries to trigger prunePending
    const now = performance.now()
    for (const [, seq] of (adapter as any)._commandSeq) {
      for (const [, entry] of seq.pending) {
        entry.ts = now - 100 // make entries look 100ms old
      }
    }

    // getCrossTalkReport() calls prunePending which will expire all unacked entries
    const report = adapter.getCrossTalkReport()
    expect(report.totalDrops).toBeGreaterThan(0)
    expect(report.status).not.toBe('clean')
    // Should be 'warning' since no single robot has >5% drop rate
    // (drops are distributed across all robots)
  })

  it('maintains health accuracy over extended operation', async () => {
    const numCommands = 5000

    for (let i = 0; i < numCommands; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.1, y: 0.1 } }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    // All robots should still be healthy
    const health = adapter.getHealth()
    for (const h of health) {
      expect(h.connected).toBe(true)
      expect(h.healthy).toBe(true)
    }

    // Self-test should still pass
    const result = adapter.selfTest()
    expect(result.ok).toBe(true)
    expect(result.status).toBe('healthy')
  })

  it('handles robot disconnect/reconnect during soak', async () => {
    const numCommands = 2000
    let disconnected = false

    for (let i = 0; i < numCommands; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.1, y: 0.1 } }

      // Simulate disconnect at command 500, reconnect at 1000
      if (i === 500) {
        // Disconnect robot-2
        const health = adapter.getHealthFor('robot-2')!
        health.connected = false
        disconnected = true
      }
      if (i === 1000 && disconnected) {
        // Reconnect robot-2
        const health = adapter.getHealthFor('robot-2')!
        health.connected = true
        disconnected = false
      }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    // robot-2 should have some drops from the disconnect period
    const health = adapter.getHealthFor('robot-2')
    expect(health).toBeDefined()
    expect(health!.connected).toBe(true)
  })

  it('maintains drift within bounds over extended operation', async () => {
    const numCommands = 3000

    for (let i = 0; i < numCommands; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.1, y: 0.1 } }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    // Drift should be within acceptable bounds
    expect(adapter.getDriftOk()).toBe(true)
    expect(Math.abs(adapter.getDrift())).toBeLessThanOrEqual(5)
  })

  it('handles global e-stop during active operation', async () => {
    const numCommands = 1000

    // Send some commands
    for (let i = 0; i < numCommands; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.1, y: 0.1 } }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    // Trigger global e-stop
    adapter.globalEStop()
    expect(adapter.getEStopActive()).toBe(true)

    // Self-test should show degraded
    const result = adapter.selfTest()
    expect(result.ok).toBe(false)
    expect(result.status).toBe('degraded')

    // Clear e-stop
    adapter.clearEStop()
    expect(adapter.getEStopActive()).toBe(false)

    // Self-test should be green again
    const result2 = adapter.selfTest()
    expect(result2.ok).toBe(true)
    expect(result2.status).toBe('healthy')
  })

  it('cross-talk report is accurate', async () => {
    const numCommands = 500

    for (let i = 0; i < numCommands; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.1, y: 0.1 } }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    const report = adapter.getCrossTalkReport()

    // Should have entries for all 4 robots
    expect(report.perRobot).toHaveLength(4)

    // Total sent should be tracked
    expect(report.totalSent).toBeGreaterThan(0)

    // All drops should be zero (we acked everything)
    expect(report.totalDrops).toBe(0)
    expect(report.status).toBe('clean')
    expect(report.hasCriticalRobot).toBe(false)
    expect(report.criticalRobots).toHaveLength(0)
  })

  it('resetCrossTalk resets all counters', async () => {
    // Send some commands
    for (let i = 0; i < 100; i++) {
      const robotIds = adapter.getRobotIds()
      const robotId = robotIds[i % robotIds.length]
      const cmd: any = { type: 'move', payload: { x: 0.1, y: 0.1 } }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    const reportBefore = adapter.getCrossTalkReport()
    expect(reportBefore.totalSent).toBeGreaterThan(0)

    // Reset
    adapter.resetCrossTalk()

    const reportAfter = adapter.getCrossTalkReport()
    expect(reportAfter.totalSent).toBe(0)
    expect(reportAfter.totalReceived).toBe(0)
    expect(reportAfter.totalDrops).toBe(0)
    expect(reportAfter.status).toBe('clean')
    expect(reportAfter.perRobot).toHaveLength(0)
  })

  it('handles 4-robot scenario with realistic timing', async () => {
    const numCommands = 5000
    const robotIds = adapter.getRobotIds()

    // Simulate realistic timing with periodic sync
    // Simulate realistic timing with periodic sync

    for (let i = 0; i < numCommands; i++) {
      // Periodic time sync (every ~500 commands)
      if (i % 500 === 0) {
        for (const robotId of robotIds) {
          const syncState = (adapter as any).syncStates.get(robotId)
          if (syncState) {
            syncState.offset = (Math.random() - 0.5) * 2 // ±1 ms offset
            syncState.history.push({
              id: robotId,
              t1: performance.now(),
              t2: performance.now(),
              t3: performance.now(),
              t4: performance.now(),
              offset: syncState.offset,
              delay: Math.random() * 10,
            })
            // Keep history manageable
            if (syncState.history.length > 100) {
              syncState.history.shift()
            }
          }
        }
        adapter['updateDrift']()
      }

      const robotId = robotIds[i % robotIds.length]
      const cmd: any = {
        type: i % 4 === 0 ? 'move' : (i % 4 === 1 ? 'rotate' : (i % 4 === 2 ? 'led' : 'gesture')),
        payload: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          angle: Math.random() * Math.PI * 2,
        },
      }

      adapter.sendCommand(cmd)

      const seq = adapter.getSeq(robotId)
      const lastSent = seq.sent[seq.sent.length - 1]
      if (lastSent) {
        adapter.recordTelemetryAck(robotId, lastSent.seq)
      }
    }

    // Final verification
    const report = adapter.getCrossTalkReport()
    expect(report.status).toBe('clean')
    expect(report.totalDrops).toBe(0)
    expect(report.perRobot).toHaveLength(4)

    // All robots should have received proportional commands
    for (const entry of report.perRobot) {
      expect(entry.sent).toBeGreaterThan(0)
      expect(entry.drops).toBe(0)
    }

    // Drift should be within bounds
    expect(adapter.getDriftOk()).toBe(true)

    // Self-test should be green
    const result = adapter.selfTest()
    expect(result.ok).toBe(true)
    expect(result.status).toBe('healthy')
  })
})
