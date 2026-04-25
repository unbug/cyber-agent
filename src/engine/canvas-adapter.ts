/**
 * CanvasAdapter — Renders the agent on a 2D <canvas> element.
 *
 * This is the default "robot" for the browser demo. The agent's
 * emoji is drawn at (x, y) with rotation, and visual effects
 * (emotion glow, trail, bounce) make it feel alive.
 */

import type { Blackboard, RobotAdapter, AdapterCommand } from './types'
import { emitAdapterTx } from './tracer'

const EMOTION_COLORS: Record<string, string> = {
  idle: '#6366f1',
  happy: '#22c55e',
  curious: '#f59e0b',
  alert: '#ef4444',
  sleepy: '#8b5cf6',
  playful: '#ec4899',
  angry: '#dc2626',
}

export class CanvasAdapter implements RobotAdapter {
  readonly type = 'canvas'
  readonly name = 'Browser Canvas'

  private ctx: CanvasRenderingContext2D | null = null
  private canvas: HTMLCanvasElement | null = null
  private emoji: string
  private trail: Array<{ x: number; y: number; age: number }> = []

  constructor(canvas: HTMLCanvasElement, emoji: string) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.emoji = emoji
  }

  init(bb: Blackboard) {
    if (this.canvas) {
      bb.canvasWidth = this.canvas.width
      bb.canvasHeight = this.canvas.height
    }
    this.trail = []
  }

  update(bb: Blackboard) {
    const ctx = this.ctx
    if (!ctx || !this.canvas) return

    const { width, height } = this.canvas
    const dpr = window.devicePixelRatio || 1

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Background grid
    this.drawGrid(ctx, width, height)

    // Trail
    this.updateTrail(bb)
    this.drawTrail(ctx)

    // Emotion glow
    const emotionColor = EMOTION_COLORS[bb.emotion] ?? EMOTION_COLORS.idle ?? '#6366f1'
    this.drawGlow(ctx, bb.x, bb.y, emotionColor, bb.excitement)

    // Agent emoji
    const size = 32 + bb.excitement * 8
    ctx.save()
    ctx.translate(bb.x, bb.y)

    // Subtle bounce animation
    const bounce = Math.sin(bb.totalMs / 300) * 2 * (1 + bb.excitement)
    ctx.translate(0, bounce)

    ctx.font = `${size / dpr}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.emoji, 0, 0)
    ctx.restore()

    // Emotion label
    ctx.save()
    ctx.font = '10px Inter, sans-serif'
    ctx.fillStyle = emotionColor
    ctx.textAlign = 'center'
    ctx.fillText(bb.emotion.toUpperCase(), bb.x, bb.y + size / 2 + 12)
    ctx.restore()

    // Energy bar
    this.drawEnergyBar(ctx, bb, width)
  }

  destroy() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.trail = []
  }

  sendCommand(command: AdapterCommand) {
    emitAdapterTx(command.type, performance.now())
    console.debug('[CanvasAdapter] command:', command.type, command.payload)
  }

  // ── Private drawing helpers ─────────────────────────────────

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    const step = 30
    for (let x = step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
  }

  private updateTrail(bb: Blackboard) {
    // Add new trail point every few ticks
    if (bb.tick % 3 === 0) {
      this.trail.push({ x: bb.x, y: bb.y, age: 0 })
    }
    // Age and prune
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i]!.age++
      if (this.trail[i]!.age > 30) {
        this.trail.splice(i, 1)
      }
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D) {
    for (const p of this.trail) {
      const alpha = 1 - p.age / 30
      ctx.fillStyle = `rgba(99, 102, 241, ${alpha * 0.15})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, intensity: number) {
    const radius = 30 + intensity * 20
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color + '30')
    gradient.addColorStop(1, color + '00')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawEnergyBar(ctx: CanvasRenderingContext2D, bb: Blackboard, canvasWidth: number) {
    const barW = 60
    const barH = 4
    const x = canvasWidth - barW - 10
    const y = 10

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(x, y, barW, barH)

    // Fill
    const energyColor = bb.energy > 0.3 ? '#22c55e' : bb.energy > 0.1 ? '#f59e0b' : '#ef4444'
    ctx.fillStyle = energyColor
    ctx.fillRect(x, y, barW * bb.energy, barH)

    // Label
    ctx.font = '8px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.textAlign = 'right'
    ctx.fillText('ENERGY', x - 4, y + barH)
  }
}
