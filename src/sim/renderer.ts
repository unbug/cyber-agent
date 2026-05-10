/**
 * v2.0 — Simulator canvas renderer
 *
 * Renders the simulation state on a 2D canvas.
 * Supports body rendering, trails, grid, and coordinate display.
 */

import { SimBody } from './types'

export interface SimCanvasOptions {
  /** Canvas element */
  canvas: HTMLCanvasElement
  /** Background color */
  bgColor?: string
  /** Grid color */
  gridColor?: string
  /** Grid spacing in pixels */
  gridSize?: number
}

export class SimCanvasRenderer {
  public canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private bgColor: string
  private gridColor: string
  private gridSize: number

  constructor(opts: SimCanvasOptions) {
    this.canvas = opts.canvas
    this.ctx = this.canvas.getContext('2d')!
    this.bgColor = opts.bgColor ?? '#1a1a2e'
    this.gridColor = opts.gridColor ?? 'rgba(255,255,255,0.06)'
    this.gridSize = opts.gridSize ?? 40
  }

  /** Set canvas size */
  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  /** Clear the canvas */
  clear(): void {
    this.ctx.fillStyle = this.bgColor
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /** Draw the grid */
  drawGrid(): void {
    const w = this.canvas.width ?? 0
    const h = this.canvas.height ?? 0
    if (!w || !h) return
    this.ctx.strokeStyle = this.gridColor
    this.ctx.lineWidth = 1
    for (let x = 0; x < w; x += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, h)
      this.ctx.stroke()
    }
    for (let y = 0; y < h; y += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(w, y)
      this.ctx.stroke()
    }
  }

  /** Draw a single body */
  drawBody(body: SimBody): void {
    const { x, y } = body.pos
    const r = body.radius

    // Draw trail
    if (body.trail.length > 1) {
      const first = body.trail[0]
      if (first) {
        this.ctx.beginPath()
        this.ctx.moveTo(first.x, first.y)
        for (let i = 1; i < body.trail.length; i++) {
          const pt = body.trail[i]
          if (pt) {
            this.ctx.lineTo(pt.x, pt.y)
          }
        }
        this.ctx.strokeStyle = body.color + '40'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
      }
    }

    // Draw body circle
    this.ctx.beginPath()
    this.ctx.arc(x, y, r, 0, Math.PI * 2)
    this.ctx.fillStyle = body.color
    this.ctx.fill()
    this.ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw orientation indicator
    const dirX = x + Math.cos(body.orientation) * r
    const dirY = y + Math.sin(body.orientation) * r
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(dirX, dirY)
    this.ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw velocity arrow
    const speed = Math.sqrt(body.vel.vx ** 2 + body.vel.vy ** 2)
    if (speed > 0.1) {
      const arrowLen = Math.min(speed * 2, 30)
      const angle = Math.atan2(body.vel.vy, body.vel.vx)
      const endX = x + Math.cos(angle) * arrowLen
      const endY = y + Math.sin(angle) * arrowLen
      this.ctx.beginPath()
      this.ctx.moveTo(x, y)
      this.ctx.lineTo(endX, endY)
      this.ctx.strokeStyle = 'rgba(100,200,255,0.5)'
      this.ctx.lineWidth = 1.5
      this.ctx.stroke()
    }
  }

  /** Draw all bodies */
  drawBodies(bodies: SimBody[]): void {
    for (const body of bodies) {
      this.drawBody(body)
    }
  }

  /** Draw coordinate axes at origin */
  drawAxes(originX: number, originY: number, scale: number): void {
    const len = 40 * scale
    // X axis (red)
    this.ctx.beginPath()
    this.ctx.moveTo(originX, originY)
    this.ctx.lineTo(originX + len, originY)
    this.ctx.strokeStyle = '#ff4444'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    // Y axis (green)
    this.ctx.beginPath()
    this.ctx.moveTo(originX, originY)
    this.ctx.lineTo(originX, originY - len)
    this.ctx.strokeStyle = '#44ff44'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
  }

  /** Draw simulation info overlay */
  drawInfo(simTime: number, stepCount: number, fps: number): void {
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)'
    this.ctx.font = '12px monospace'
    this.ctx.fillText(`t=${(simTime / 1000).toFixed(1)}s`, 10, 20)
    this.ctx.fillText(`steps=${stepCount}`, 10, 36)
    this.ctx.fillText(`fps=${fps.toFixed(0)}`, 10, 52)
  }
}
