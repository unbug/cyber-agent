/**
 * v2.0 — Sim ↔ Real bridge types
 *
 * Core types for the browser-embedded physics simulator.
 * The simulator runs on a 2D plane and simulates rigid-body dynamics
 * for robot characters. It can record runs and replay them on real hardware.
 */

/** A 2D point in the simulation plane */
export interface Vec2 {
  x: number
  y: number
}

/** A 2D velocity vector */
export interface Vel2 {
  vx: number
  vy: number
}

/** Orientation in radians (0 = facing right, CCW positive) */
export type Orientation = number

/**
 * A simulated rigid body (robot character).
 * Position is in pixels relative to the simulation origin.
 */
export interface SimBody {
  /** Unique body ID */
  id: string
  /** Position */
  pos: Vec2
  /** Velocity */
  vel: Vel2
  /** Orientation in radians */
  orientation: Orientation
  /** Angular velocity (rad/s) */
  angVel: number
  /** Radius (for circle-based collision) */
  radius: number
  /** Mass (kg) */
  mass: number
  /** Internal: base mass for randomization (not serialized) */
  _baseMass?: number
  /** Linear damping coefficient (0 = no damping, 1 = full) */
  linearDamping: number
  /** Angular damping coefficient */
  angularDamping: number
  /** Color for rendering */
  color: string
  /** Trail positions (last N points) */
  trail: Vec2[]
  /** Trail max length */
  trailMax: number
}

/** A single simulation step output */
export interface SimStep {
  /** Wall-clock timestamp (ms) */
  t: number
  /** Monotonic simulation time (ms) */
  simTime: number
  /** All bodies after this step */
  bodies: SimBody[]
  /** Commands issued this step (from BT → sim) */
  commands: SimCommand[]
}

/** A recorded simulation run */
export interface SimRun {
  /** Run ID (unique) */
  id: string
  /** Character ID this run was for */
  characterId: string
  /** Start timestamp */
  startedAt: number
  /** End timestamp */
  endedAt: number
  /** Duration in ms */
  duration: number
  /** All recorded steps */
  steps: SimStep[]
  /** Number of steps recorded */
  stepCount: number
}

/** A single command from the BT engine to the simulator */
export interface SimCommand {
  /** Command type */
  type: 'move' | 'rotate' | 'stop' | 'moveTo' | 'gesture' | 'led' | 'sound' | 'emergency_stop'
  /** Command payload */
  payload: Record<string, unknown>
  /** Timestamp when command was issued */
  t: number
}

/** Simulation configuration */
export interface SimConfig {
  /** Width of the simulation plane (pixels) */
  width: number
  /** Height of the simulation plane (pixels) */
  height: number
  /** Gravity (m/s², downward positive) */
  gravity: number
  /** Time step (ms) */
  dt: number
  /** Max trail length per body */
  trailMax: number
  /** Whether to enable collision detection */
  collisions: boolean
  /** Whether to enable boundary clamping */
  clampBounds: boolean
}

/** Default simulation config */
export const DEFAULT_SIM_CONFIG: SimConfig = {
  width: 800,
  height: 600,
  gravity: 0,
  dt: 16,
  trailMax: 50,
  collisions: true,
  clampBounds: true,
}

/**
 * Domain randomization parameters.
 * Used to inject variation into the simulator for sim→real transfer research.
 * Each slider in the debugger maps to one field.
 */
export interface DomainRandomization {
  /** Randomize body mass: multiplier range [min, max]. 1 = no randomization */
  mass: { min: number; max: number; current: number }
  /** Randomize linear friction (damping): offset range. 0 = no randomization */
  friction: { min: number; max: number; current: number }
  /** Randomize command latency in ms: range [min, max] */
  latency: { min: number; max: number; current: number }
  /** Randomize sensor noise (position perturbation in px): range [min, max] */
  sensorNoise: { min: number; max: number; current: number }
}

/** Default domain randomization (all zeroed = no randomization) */
export const DEFAULT_RANDOMIZATION: DomainRandomization = {
  mass: { min: 0.5, max: 2.0, current: 1.0 },
  friction: { min: -0.05, max: 0.05, current: 0.0 },
  latency: { min: 0, max: 100, current: 0 },
  sensorNoise: { min: 0, max: 10, current: 0 },
}

/** Simulation state for replay */
export interface SimReplayState {
  /** Current step index in the recorded run */
  stepIndex: number
  /** Current sim step */
  currentStep: SimStep | null
  /** Is replaying */
  playing: boolean
  /** Playback speed multiplier */
  speed: number
}
