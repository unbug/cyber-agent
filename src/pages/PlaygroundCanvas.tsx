/**
 * PlaygroundCanvas — renders the scene, POIs, agents and their trails on a <canvas>.
 *
 * Handles:
 *   - Scene rendering (background grid, POIs)
 *   - Agent rendering (emoji, emotion glow, trail, name label)
 *   - Drag-to-place ghost agent
 *   - Agent-to-agent proximity lines
 */

import { useRef, useEffect, useCallback } from 'react'
import type { Scene } from '@/engine/scenes'
import type { WorldAgent } from '@/engine/world'

// ─── POI emoji map ─────────────────────────────────────────────

const POI_EMOJI: Record<string, string> = {
  slide: '🛝',
  swing: '🎠',
  sandbox: '⛺',
  bench: '🪑',
  tree: '🌳',
  fountain: '⛲',
  classroom: '🏫',
  door: '🚪',
  track: '🏃',
  playground: '🎪',
  campus: '🏛️',
  schoolyard: '🏫',
  gate: '🚧',
  path: '🛤️',
  obstacle: '🧱',
  rest_area: '🛋️',
  water: '💧',
  flower_bed: '🌸',
  statue: '🗿',
  fence: '🔲',
  wall: '🧱',
  awning: '⛺',
  stage: '🎭',
  food_stand: '🍔',
  library: '📚',
  gym: '🏋️',
  park: '🌿',
  pond: '🏞️',
  bridge: '🌉',
  well: '🪣',
  bell_tower: '🔔',
  clock_tower: '🕐',
}

const POI_COLORS: Record<string, string> = {
  slide: '#f59e0b',
  swing: '#ec4899',
  sandbox: '#fbbf24',
  bench: '#8b5cf6',
  tree: '#22c55e',
  fountain: '#3b82f6',
  classroom: '#6366f1',
  door: '#a78bfa',
  track: '#f97316',
  playground: '#eab308',
  campus: '#8b5cf6',
  schoolyard: '#6366f1',
  gate: '#d97706',
  path: '#78716c',
  obstacle: '#ef4444',
  rest_area: '#06b6d4',
  water: '#0ea5e9',
  flower_bed: '#f472b6',
  statue: '#94a3b8',
  fence: '#475569',
  wall: '#475569',
  awning: '#f59e0b',
  stage: '#8b5cf6',
  food_stand: '#f97316',
  library: '#6366f1',
  gym: '#22c55e',
  park: '#16a34a',
  pond: '#0284c7',
  bridge: '#78716c',
  well: '#475569',
  bell_tower: '#d97706',
  clock_tower: '#d97706',
}

// ─── Props ─────────────────────────────────────────────────────

interface PlaygroundCanvasProps {
  scene: Scene
  agents: { agent: WorldAgent; characterId: string; emoji: string }[]
  /** Position of the ghost agent being dragged (null = no drag) */
  ghostPos: { x: number; y: number } | null
  /** Whether to show agent proximity lines */
  showProximity: boolean
  /** Canvas size override (for responsive) */
  width?: number
  height?: number
}

export function PlaygroundCanvas({
  scene,
  agents,
  ghostPos,
  showProximity,
  width: propWidth,
  height: propHeight,
}: PlaygroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cw = propWidth ?? container.clientWidth
    const ch = propHeight ?? container.clientHeight

    // Resize canvas to container
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
    }

    ctx.save()
    ctx.scale(dpr, dpr)

    // ── Background ──
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, cw, ch)

    // ── Scene bounds ──
    const scale = Math.min(cw / scene.bounds.width, ch / scene.bounds.height)
    const offsetX = (cw - scene.bounds.width * scale) / 2
    const offsetY = (ch - scene.bounds.height * scale) / 2

    // Bounds rect
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(offsetX, offsetY, scene.bounds.width * scale, scene.bounds.height * scale)
    ctx.setLineDash([])

    // ── Grid ──
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.04)'
    ctx.lineWidth = 0.5
    const gridSize = 30
    for (let x = offsetX; x < offsetX + scene.bounds.width * scale; x += gridSize * scale) {
      ctx.beginPath()
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, offsetY + scene.bounds.height * scale)
      ctx.stroke()
    }
    for (let y = offsetY; y < offsetY + scene.bounds.height * scale; y += gridSize * scale) {
      ctx.beginPath()
      ctx.moveTo(offsetX, y)
      ctx.lineTo(offsetX + scene.bounds.width * scale, y)
      ctx.stroke()
    }

    // ── POIs ──
    for (const poi of scene.pois) {
      const px = offsetX + poi.x * scale
      const py = offsetY + poi.y * scale
      const pr = (poi.r ?? 10) * scale

      if (!poi.passable) {
        // Non-passable: draw filled circle
        const color = POI_COLORS[poi.type] ?? '#475569'
        ctx.fillStyle = color + '15'
        ctx.beginPath()
        ctx.arc(px, py, pr, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = color + '40'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // POI emoji
      const emoji = POI_EMOJI[poi.type] ?? '●'
      ctx.font = `${Math.max(12, pr * 0.6)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, px, py)

      // POI label (only if large enough)
      if (pr > 20 && poi.label) {
        ctx.font = `${Math.max(8, pr * 0.25)}px Inter, sans-serif`
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
        ctx.fillText(poi.label, px, py + pr + 10)
      }
    }

    // ── Spawn points ──
    for (const spawn of scene.spawns) {
      const sx = offsetX + spawn.x * scale
      const sy = offsetY + spawn.y * scale
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.arc(sx, sy, 8 * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── Agent-to-agent proximity lines ──
    if (showProximity && agents.length >= 2) {
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const a1 = agents[i]?.agent; if (!a1) continue
          const a2 = agents[j]?.agent; if (!a2) continue
          const x1 = offsetX + a1.x * scale
          const y1 = offsetY + a1.y * scale
          const x2 = offsetX + a2.x * scale
          const y2 = offsetY + a2.y * scale
          const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
          if (dist < 150 * scale) {
            const alpha = Math.max(0, 0.4 * (1 - dist / (150 * scale)))
            ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`
            ctx.lineWidth = 1
            ctx.setLineDash([3, 3])
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }
      }
    }

    // ── Agents ──
    for (const { agent, characterId, emoji } of agents) {
      const ax = offsetX + agent.x * scale
      const ay = offsetY + agent.y * scale

      // Emotion glow
      const emotion = agent.blackboard.emotion ?? 'idle'
      const emotionColors: Record<string, string> = {
        idle: '#6366f1',
        happy: '#22c55e',
        curious: '#f59e0b',
        alert: '#ef4444',
        sleepy: '#8b5cf6',
        playful: '#ec4899',
        angry: '#dc2626',
      }
      const color = (emotionColors[emotion] ?? emotionColors.idle) as string
      const intensity = agent.blackboard.excitement ?? 0
      const glowRadius = (20 + intensity * 15) * scale
      const gradient = ctx.createRadialGradient(ax, ay, 0, ax, ay, glowRadius)
      gradient.addColorStop(0, color + '30')
      gradient.addColorStop(1, color + '00')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(ax, ay, glowRadius, 0, Math.PI * 2)
      ctx.fill()

      // Agent emoji
      const emojiSize = (18 + intensity * 4) * scale
      ctx.font = `${emojiSize}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, ax, ay)

      // Name label
      ctx.font = `bold ${Math.max(9, 10 * scale)}px Inter, sans-serif`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillText(characterId, ax, ay + emojiSize / 2 + 12)

      // Emotion badge
      ctx.font = `${Math.max(8, 9 * scale)}px Inter, sans-serif`
      ctx.fillStyle = color
      ctx.fillText(emotion.toUpperCase(), ax, ay - emojiSize / 2 - 6)
    }

    // ── Ghost agent (dragging) ──
    if (ghostPos) {
      const gx = offsetX + ghostPos.x * scale
      const gy = offsetY + ghostPos.y * scale
      ctx.globalAlpha = 0.5
      ctx.font = '24px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('➕', gx, gy)
      ctx.globalAlpha = 1

      // Drop zone circle
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(gx, gy, 20 * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── FPS counter ──
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(148, 163, 184, 0.3)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`agents: ${agents.length}`, 8, 8)

    ctx.restore()
  }, [scene, agents, ghostPos, showProximity, propWidth, propHeight])

  // Redraw on every render
  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: ghostPos ? 'crosshair' : 'default',
        }}
      />
    </div>
  )
}
