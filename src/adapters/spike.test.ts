/**
 * SpikeAdapter tests — covers BLE packet building, command serialization,
 * telemetry parsing, and the adapter's v2 lifecycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SpikeAdapter, createSpikeAdapter, buildMotorPacket, buildLEDPacket, buildLEDColorPacket, parseTelemetry, MotorPort } from './spike'
import type { AdapterCommand } from '../engine/types'

// ─── Helpers ──────────────────────────────────────────────────────

function makeAdapter(): SpikeAdapter {
  return new SpikeAdapter({ hubName: 'Test Hub', autoConnect: false })
}

// ─── Packet Builder Tests ─────────────────────────────────────────

describe('SpikeAdapter — packet builders', () => {
  it('buildMotorPacket produces correct length', () => {
    const packet = buildMotorPacket(MotorPort.A, 50)
    expect(packet.length).toBe(7)
    expect(packet[0]).toBe(0x01) // motor command type
    expect(packet[1]).toBe(0) // port A
  })

  it('buildLEDPacket produces 26 bytes (type + 25 pixels)', () => {
    const packet = buildLEDPacket(Array(25).fill(128))
    expect(packet.length).toBe(26)
    expect(packet[0]).toBe(0x02) // LED packet type
  })

  it('buildLEDColorPacket produces 76 bytes (type + 25 RGB)', () => {
    const rgb = Array.from({ length: 25 }, () => [255, 0, 0])
    const packet = buildLEDColorPacket(rgb)
    expect(packet.length).toBe(76)
    expect(packet[0]).toBe(0x03) // LED color packet type
  })
})

// ─── Telemetry Parser Tests ───────────────────────────────────────

describe('SpikeAdapter — telemetry parser', () => {
  it('parses tilt sensor data', () => {
    const data = new Uint8Array([0x04, 0x01, 0x01, 0x90, 0x01]) // tilt, value=400
    const event = parseTelemetry(data)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('tilt')
    expect(event!.payload.x).toBe(400)
  })

  it('parses distance sensor data', () => {
    const data = new Uint8Array([0x04, 0x02, 0x00, 0x64, 0x01]) // distance, value=100
    const event = parseTelemetry(data)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('distance')
    expect(event!.payload.value).toBe(100)
  })

  it('parses force sensor data', () => {
    const data = new Uint8Array([0x04, 0x03, 0x00, 0x32, 0x01]) // force, value=50
    const event = parseTelemetry(data)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('bump')
    expect(event!.payload.value).toBe(50)
  })

  it('parses motor state data', () => {
    const data = new Uint8Array([0x05, 0x00, 0x64, 0x10, 0x00]) // motor A, speed=0, load=16
    const event = parseTelemetry(data)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('motor_state')
    expect(event!.payload.port).toBe(0)
    expect(event!.payload.speed).toBe(0)
  })

  it('returns null for invalid data', () => {
    expect(parseTelemetry(new Uint8Array([0x01]))).toBeNull()
    expect(parseTelemetry(new Uint8Array([]))).toBeNull()
  })
})

// ─── Adapter Tests ────────────────────────────────────────────────

describe('SpikeAdapter', () => {
  let adapter: SpikeAdapter

  beforeEach(() => {
    adapter = makeAdapter()
  })

  it('has correct type and name', () => {
    expect(adapter.type).toBe('spike')
    expect(adapter.name).toBe('LEGO SPIKE Hub Adapter')
  })

  it('has contractVersion v2', () => {
    expect(adapter.contractVersion).toBe('v2')
  })

  it('init does not crash', () => {
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.init(bb)).not.toThrow()
  })

  it('update does not crash', () => {
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('destroy does not crash', () => {
    expect(() => adapter.destroy()).not.toThrow()
  })

  // ─── Command Serialization ─────────────────────────────────

  it('sendCommand with move type does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: 75 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with stop does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'stop', speed: 0 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with motors type does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'motors',
      payload: { left: 50, right: -50 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with led type (brightness) does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'led',
      payload: { brightness: Array(25).fill(128) },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with led type (RGB) does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'led',
      payload: { r: 255, g: 0, b: 0, brightness: 255 },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with gesture type does not throw', () => {
    const cmd: AdapterCommand = {
      type: 'gesture',
      payload: { pattern: 'wave' },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand queues commands when disconnected', () => {
    const cmd = { type: 'unknown', payload: {} } as AdapterCommand
    // When not connected, commands are queued (not thrown)
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
    expect((adapter as any).commandQueue.length).toBe(1)
  })

  // ─── v2 lifecycle ──────────────────────────────────────────

  it('connect returns without error in simulation mode', async () => {
    await expect(adapter.connect()).resolves.toBeUndefined()
  })

  it('selfTest returns a valid report', () => {
    const report = adapter.selfTest()
    expect(report.status).toBeDefined()
    expect(report.checks).toBeInstanceOf(Array)
    expect(report.checks.length).toBeGreaterThan(0)
    expect(report.version).toBe('v2')
    expect(report.timestamp).toBeGreaterThan(0)
  })

  it('capabilities returns extended v2 capabilities', () => {
    const caps = adapter.capabilities()
    expect(caps.movement).toBe(true)
    expect(caps.led).toBe(true)
    expect(caps.sound).toBe(false) // SPIKE Hub has no speaker
    expect(caps.gesture).toBe(true)
    expect(caps.batteryReporting).toBe(true)
    expect(caps.distanceReporting).toBe(true)
    expect(caps.imuReporting).toBe(true)
    expect(caps.selfTestable).toBe(true)
    expect(caps.hardwareEStop).toBe(true)
  })

  it('onTelemetry registers a callback and returns unsubscribe', () => {
    const cb = vi.fn()
    const unsub = adapter.onTelemetry(cb)
    expect(cb).not.toHaveBeenCalled()
    expect(typeof unsub).toBe('function')
    unsub()
  })

  // ─── Factory ──────────────────────────────────────────────

  it('createSpikeAdapter returns a SpikeAdapter instance', () => {
    const adapter = createSpikeAdapter({ hubName: 'Factory Hub', autoConnect: false })
    expect(adapter).toBeInstanceOf(SpikeAdapter)
    expect(adapter.type).toBe('spike')
  })
})
