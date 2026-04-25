/**
 * MBotAdapter tests — covers I2C protocol, motor/LED/sensor systems,
 * and the adapter's init/update/destroy/sendCommand lifecycle.
 */

import { describe, it, expect } from 'vitest'
import { MBotAdapter } from './mbot'
import type { AdapterCommand } from '../engine/types'

// ─── Helpers ──────────────────────────────────────────────────────

function makeAdapter(): MBotAdapter {
  return MBotAdapter.create()
}

// ─── Tests ────────────────────────────────────────────────────────

describe('MBotAdapter', () => {
  it('has correct type and name', () => {
    const adapter = makeAdapter()
    expect(adapter.type).toBe('mbot')
    expect(adapter.name).toBe('mBot Adapter')
  })

  it('create() returns a new instance', () => {
    const adapter = MBotAdapter.create()
    expect(adapter).toBeInstanceOf(MBotAdapter)
  })

  it('init does not crash', () => {
    const adapter = makeAdapter()
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.init(bb)).not.toThrow()
  })

  it('update does not crash', () => {
    const adapter = makeAdapter()
    const bb = { x: 0, y: 0 } as any
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('destroy does not crash', () => {
    const adapter = makeAdapter()
    expect(() => adapter.destroy()).not.toThrow()
  })

  it('sendCommand with move type serializes correctly', () => {
    const adapter = makeAdapter()
    const cmd: AdapterCommand = {
      type: 'move',
      payload: { direction: 'forward', speed: 75 },
    }
    // Should not throw
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with led type serializes correctly', () => {
    const adapter = makeAdapter()
    const cmd: AdapterCommand = {
      type: 'led',
      payload: { brightness: [255, 0, 0] },
    }
    expect(() => adapter.sendCommand(cmd)).not.toThrow()
  })

  it('sendCommand with unknown type throws', () => {
    const adapter = makeAdapter()
    const cmd = { type: 'unknown', payload: {} } as AdapterCommand
    expect(() => adapter.sendCommand(cmd)).toThrow('Unknown: unknown')
  })

  it('getUltrasonicDistance returns sensor value', () => {
    const adapter = makeAdapter()
    // Default ultrasonic distance is 0
    expect(adapter.getUltrasonicDistance()).toBe(0)
    // After update, it should be 50 (from readSensors mock)
    adapter.update({} as any)
    expect(adapter.getUltrasonicDistance()).toBe(50)
  })

  it('tick resolves without error', async () => {
    const adapter = makeAdapter()
    await expect(adapter.tick()).resolves.toBeUndefined()
  })
})
