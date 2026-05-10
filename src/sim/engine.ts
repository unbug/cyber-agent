/**
 * v2.0 — Browser-embedded physics simulator
 *
 * A lightweight 2D rigid-body simulator that runs in the browser.
 * It simulates robot character movement, collision, and boundary clamping.
 * The simulator can record runs and replay them.
 *
 * This is NOT a full engine — it simulates the kinematic layer only.
 * Full physics (MuJoCo/Genesis) is planned for a future iteration.
 */

import {
  SimBody,
  SimStep,
  SimConfig,
  DEFAULT_SIM_CONFIG,
  SimCommand,
} from './types'

export class SimEngine {
  private bodies: Map<string, SimBody>
  private _config: SimConfig
  private simTime: number
  private stepCounter: number

  constructor(config?: Partial<SimConfig>) {
    this._config = { ...DEFAULT_SIM_CONFIG, ...config }
    this.bodies = new Map()
    this.simTime = 0
    this.stepCounter = 0
  }

  // ── Lifecycle ────────────────────────────────────────────

  reset(): void {
    this.bodies.clear()
    this.simTime = 0
    this.stepCounter = 0
  }

  get config(): SimConfig {
    return this._config
  }

  setConfig(patch: Partial<SimConfig>): void {
    this._config = { ...this._config, ...patch }
  }

  // ── Body management ─────────────────────────────────────

  addBody(body: SimBody): void {
    this.bodies.set(body.id, { ...body })
  }

  updateBody(id: string, patch: Partial<SimBody>): void {
    const b = this.bodies.get(id)
    if (b) {
      Object.assign(b, patch)
    }
  }

  removeBody(id: string): void {
    this.bodies.delete(id)
  }

  getBody(id: string): SimBody | undefined {
    return this.bodies.get(id)
  }

  getBodies(): SimBody[] {
    return Array.from(this.bodies.values())
  }

  getBodyCount(): number {
    return this.bodies.size
  }

  // ── Simulation step ─────────────────────────────────────

  /**
   * Advance the simulation by one time step.
   * Returns the current step snapshot.
   */
  step(commands: SimCommand[] = []): SimStep {
    const dt = this._config.dt / 1000 // convert ms → s
    const t = Date.now()

    // Apply commands to bodies
    for (const cmd of commands) {
      this.applyCommand(cmd, dt)
    }

    // Integrate all bodies
    for (const body of this.bodies.values()) {
      this.integrate(body, dt)
    }

    // Collision detection (if enabled)
    if (this._config.collisions) {
      this.resolveCollisions()
    }

    // Boundary clamping (if enabled)
    if (this._config.clampBounds) {
      this.clampBounds()
    }

    // Update trails
    for (const body of this.bodies.values()) {
      body.trail.push({ x: body.pos.x, y: body.pos.y })
      if (body.trail.length > body.trailMax) {
        body.trail.shift()
      }
    }

    this.simTime += this._config.dt
    this.stepCounter++

    return {
      t,
      simTime: this.simTime,
      bodies: this.getBodies(),
    }
  }

  // ── Command application ─────────────────────────────────

  private applyCommand(cmd: SimCommand, dt: number): void {
    const bodyId = cmd.payload.bodyId as string | undefined
    if (!bodyId) return
    const body = this.bodies.get(bodyId)
    if (!body) return

    switch (cmd.type) {
      case 'move': {
        const speed = (cmd.payload.speed as number) ?? 1
        const dir = body.orientation
        body.vel.vx += Math.cos(dir) * speed * dt
        body.vel.vy += Math.sin(dir) * speed * dt
        break
      }
      case 'rotate': {
        const angle = (cmd.payload.angle as number) ?? 0
        body.orientation += angle
        body.angVel = angle / dt
        break
      }
      case 'stop':
        body.vel.vx = 0
        body.vel.vy = 0
        body.angVel = 0
        break
      case 'moveTo': {
        const targetX = cmd.payload.x as number
        const targetY = cmd.payload.y as number
        if (targetX !== undefined && targetY !== undefined) {
          const dx = targetX - body.pos.x
          const dy = targetY - body.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0) {
            const speed = (cmd.payload.speed as number) ?? 1
            body.vel.vx = (dx / dist) * speed
            body.vel.vy = (dy / dist) * speed
            body.orientation = Math.atan2(dy, dx)
          }
        }
        break
      }
      case 'gesture':
        // Gestures are visual-only; no physics effect
        break
      case 'led':
      case 'sound':
        // These don't affect physics
        break
      case 'emergency_stop':
        body.vel.vx = 0
        body.vel.vy = 0
        body.angVel = 0
        break
    }
  }

  // ── Physics integration ─────────────────────────────────

  private integrate(body: SimBody, dt: number): void {
    // Apply gravity
    if (this._config.gravity > 0) {
      body.vel.vy += this._config.gravity * dt
    }

    // Apply damping
    body.vel.vx *= (1 - body.linearDamping)
    body.vel.vy *= (1 - body.linearDamping)
    body.angVel *= (1 - body.angularDamping)

    // Update position
    body.pos.x += body.vel.vx * dt * 100 // convert m/s → px/s
    body.pos.y += body.vel.vy * dt * 100

    // Update orientation
    body.orientation += body.angVel * dt
  }

  // ── Collision detection ─────────────────────────────────

  private resolveCollisions(): void {
    const bodies = Array.from(this.bodies.values())
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]
        const b = bodies[j]
        if (!a || !b) continue

        const dx = b.pos.x - a.pos.x
        const dy = b.pos.y - a.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = a.radius + b.radius

        if (dist < minDist && dist > 0) {
          // Normalize collision vector
          const nx = dx / dist
          const ny = dy / dist

          // Separate bodies
          const overlap = minDist - dist
          a.pos.x -= nx * overlap / 2
          a.pos.y -= ny * overlap / 2
          b.pos.x += nx * overlap / 2
          b.pos.y += ny * overlap / 2

          // Elastic collision response
          const relVx = a.vel.vx - b.vel.vx
          const relVy = a.vel.vy - b.vel.vy
          const relVn = relVx * nx + relVy * ny

          if (relVn > 0) continue // Moving apart

          const totalMass = a.mass + b.mass
          const impulse = (2 * relVn) / totalMass

          a.vel.vx -= impulse * b.mass * nx
          a.vel.vy -= impulse * b.mass * ny
          b.vel.vx += impulse * a.mass * nx
          b.vel.vy += impulse * a.mass * ny
        }
      }
    }
  }

  // ── Boundary clamping ───────────────────────────────────

  private clampBounds(): void {
    const w = this._config.width
    const h = this._config.height
    for (const body of this.bodies.values()) {
      if (!body) continue
      // Left
      if (body.pos.x < body.radius) {
        body.pos.x = body.radius
        body.vel.vx = Math.abs(body.vel.vx) * 0.5
      }
      // Right
      if (body.pos.x > w - body.radius) {
        body.pos.x = w - body.radius
        body.vel.vx = -Math.abs(body.vel.vx) * 0.5
      }
      // Top
      if (body.pos.y < body.radius) {
        body.pos.y = body.radius
        body.vel.vy = Math.abs(body.vel.vy) * 0.5
      }
      // Bottom
      if (body.pos.y > h - body.radius) {
        body.pos.y = h - body.radius
        body.vel.vy = -Math.abs(body.vel.vy) * 0.5
      }
    }
  }

  // ── Simulation control ──────────────────────────────────

  getSimTime(): number {
    return this.simTime
  }

  getStepCounter(): number {
    return this.stepCounter
  }

  /**
   * Run the simulation for a given number of steps.
   * Returns the final step snapshot.
   */
  run(steps: number, commandFn: (step: number) => SimCommand[]): SimStep {
    let lastStep: SimStep | undefined
    for (let i = 0; i < steps; i++) {
      lastStep = this.step(commandFn(i))
    }
    return lastStep!
  }
}
