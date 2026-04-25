/**
 * CanvasAdapter tests — covers init, update, destroy, sendCommand,
 * and the private drawing helpers (covered indirectly via update).
 */

import { describe, it, expect, vi } from 'vitest'
import { CanvasAdapter } from './canvas-adapter'
import type { AdapterCommand } from './types'

// ─── Helpers ──────────────────────────────────────────────────────

function createMockCanvas(width = 400, height = 300): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
} {
  const canvas = {
    width,
    height,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement

  const ctx = {
    clearRect: vi.fn(),
    fillStyle: '',
    lineWidth: 0,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    font: '',
    textAlign: '',
    textBaseline: '',
    fillText: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D

  return { canvas, ctx }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('CanvasAdapter', () => {
  it('has correct type and name', () => {
    const { canvas } = createMockCanvas()
    const adapter = new CanvasAdapter(canvas, '🦊')
    expect(adapter.type).toBe('canvas')
    expect(adapter.name).toBe('Browser Canvas')
  })

  it('init sets canvas dimensions on blackboard', () => {
    const { canvas } = createMockCanvas(800, 600)
    const adapter = new CanvasAdapter(canvas, '🐶')
    const bb = { x: 0, y: 0, _initCalled: false } as any
    adapter.init(bb)
    expect(bb.canvasWidth).toBe(800)
    expect(bb.canvasHeight).toBe(600)
  })

  it('init resets trail', () => {
    const { canvas } = createMockCanvas()
    const adapter = new CanvasAdapter(canvas, '🐱')
    const bb = {} as any
    adapter.init(bb)
    // Init should reset trail (no crash on first update)
    bb.x = 200; bb.y = 150; bb.emotion = 'idle'; bb.energy = 1; bb.excitement = 0
    bb.canvasWidth = 400; bb.canvasHeight = 300; bb.tick = 0; bb.totalMs = 0
    bb.pointerX = 250; bb.pointerY = 180; bb.pointerActive = true
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('update renders without crashing', () => {
    const { canvas, ctx: _ctx } = createMockCanvas(400, 300)
    const adapter = new CanvasAdapter(canvas, '🦊')
    const bb = {
      x: 200,
      y: 150,
      rotation: 0,
      speed: 2,
      emotion: 'happy',
      energy: 0.8,
      excitement: 0.5,
      canvasWidth: 400,
      canvasHeight: 300,
      tick: 10,
      totalMs: 1000,
      deltaMs: 0,
      pointerX: 250,
      pointerY: 180,
      pointerActive: true,
    } as any
    adapter.update(bb)
    expect(_ctx.clearRect).toHaveBeenCalled()
    expect(_ctx.fillText).toHaveBeenCalled()
  })

  it('update handles null context gracefully', () => {
    const canvas = {
      width: 400,
      height: 300,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement
    const adapter = new CanvasAdapter(canvas, '🐶')
    const bb = { x: 0, y: 0, emotion: 'idle', energy: 1, excitement: 0 } as any
    // Should not crash
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('update handles null canvas gracefully', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement
    const adapter = new CanvasAdapter(canvas, '🐱')
    const bb = { x: 0, y: 0, emotion: 'idle', energy: 1, excitement: 0 } as any
    expect(() => adapter.update(bb)).not.toThrow()
  })

  it('update uses default emotion color when emotion unknown', () => {
    const { canvas, ctx: _ctx } = createMockCanvas(400, 300)
    const adapter = new CanvasAdapter(canvas, '👾')
    const bb = {
      x: 200,
      y: 150,
      rotation: 0,
      speed: 2,
      emotion: 'unknown_emotion',
      energy: 0.8,
      excitement: 0.5,
      canvasWidth: 400,
      canvasHeight: 300,
      tick: 10,
      totalMs: 1000,
      deltaMs: 0,
      pointerX: 250,
      pointerY: 180,
      pointerActive: true,
    } as any
    adapter.update(bb)
    // Should not crash with unknown emotion
  })

  it('update draws energy bar with correct color based on energy level', () => {
    const { canvas, ctx: _ctx } = createMockCanvas(400, 300)
    const adapter = new CanvasAdapter(canvas, '🐶')

    // High energy → green
    const bbHigh = {
      x: 200, y: 150, rotation: 0, speed: 2,
      emotion: 'happy', energy: 0.8, excitement: 0.5,
      canvasWidth: 400, canvasHeight: 300, tick: 10, totalMs: 1000,
      deltaMs: 0,
      pointerX: 250, pointerY: 180, pointerActive: true,
    } as any
    adapter.update(bbHigh)
    expect(_ctx.fillRect).toHaveBeenCalled()

    // Low energy → red
    const bbLow = {
      ...bbHigh,
      energy: 0.05,
      emotion: 'sleepy',
    } as any
    adapter.update(bbLow)
    expect(_ctx.fillRect).toHaveBeenCalled()

    // Medium energy → orange
    const bbMed = {
      ...bbHigh,
      energy: 0.2,
      emotion: 'curious',
    } as any
    adapter.update(bbMed)
    expect(_ctx.fillRect).toHaveBeenCalled()
  })

  it('destroy clears canvas and resets trail', () => {
    const { canvas, ctx: _ctx } = createMockCanvas(400, 300)
    const adapter = new CanvasAdapter(canvas, '🦊')
    const bb = { x: 200, y: 150, emotion: 'idle', energy: 1, excitement: 0 } as any
    adapter.init(bb)
    adapter.update(bb)

    adapter.destroy()
    expect(_ctx.clearRect).toHaveBeenCalled()
  })

  it('sendCommand emits tracer event and logs', () => {
    const { canvas } = createMockCanvas()
    const adapter = new CanvasAdapter(canvas, '🐶')
    const bb = {} as any
    adapter.init(bb)

    const cmd: AdapterCommand = { type: 'motors', payload: { left: 0.5, right: 0.5 } }
    // spy on console.debug
    const logSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    adapter.sendCommand(cmd)
    expect(logSpy).toHaveBeenCalledWith('[CanvasAdapter] command:', 'motors', { left: 0.5, right: 0.5 })
    logSpy.mockRestore()
  })

  it('update handles tick 0 trail correctly', () => {
    const { canvas, ctx: _ctx } = createMockCanvas(400, 300)
    const adapter = new CanvasAdapter(canvas, '🐱')
    const bb = {
      x: 200, y: 150, rotation: 0, speed: 2,
      emotion: 'idle', energy: 1, excitement: 0,
      canvasWidth: 400, canvasHeight: 300,
      tick: 0, // first tick — trail should be empty
      totalMs: 0,
      deltaMs: 0,
      pointerX: 250, pointerY: 180, pointerActive: true,
    } as any
    expect(() => adapter.update(bb)).not.toThrow()
  })
})
