/**
 * CyberAgent SDK — Canvas Adapter
 *
 * Renders the agent on a 2D <canvas> element. Useful for browser demos
 * and testing characters before deploying to real hardware.
 */

import type { Blackboard, RobotAdapter, AdapterCommand } from '../types'

export class CanvasAdapter implements RobotAdapter {
  readonly type = 'canvas'
  readonly name = 'Canvas Renderer'

  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private trail: { x: number; y: number; age: number }[] = []
  private glowHue = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  init(bb: Blackboard) {
    this.canvas.width = bb.canvasWidth
    this.canvas.height = bb.canvasHeight
    this.trail = []
    this.glowHue = 0
  }

  update(bb: Blackboard) {
    const ctx = this.ctx

    // Clear with fade for motion blur
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Update trail
    this.trail.push({ x: bb.x, y: bb.y, age: 0 })
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].age++
      if (this.trail[i].age > 30) this.trail.splice(i, 1)
    }

    // Draw trail
    for (const point of this.trail) {
      const alpha = 1 - point.age / 30
      ctx.beginPath()
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${this.glowHue}, 80%, 60%, ${alpha * 0.5})`
      ctx.fill()
    }

    // Draw agent (emoji)
    ctx.save()
    ctx.translate(bb.x, bb.y)
    ctx.rotate((bb.rotation * Math.PI) / 180)

    // Glow effect
    const hue = (bb.emotion === 'happy' || bb.emotion === 'playful')
      ? 50
      : bb.emotion === 'angry'
        ? 0
        : bb.emotion === 'curious'
          ? 200
          : 120
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`
    ctx.shadowBlur = 15
    ctx.font = '24px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🤖', 0, 0)

    ctx.restore()

    // Update glow hue
    this.glowHue = (this.glowHue + 1) % 360
  }

  destroy() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  sendCommand(command: AdapterCommand) {
    // Canvas adapter ignores hardware commands
    // In a real implementation, this could update visual properties
    console.log(`[CanvasAdapter] Command: ${command.type}`, command.payload)
  }
}
