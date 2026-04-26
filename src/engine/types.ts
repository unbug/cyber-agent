/**
 * CyberAgent Behavior Tree Engine — Core Types
 *
 * Architecture:
 *   BehaviorTree ← defines character logic as a tree of nodes
 *   Blackboard   ← shared key-value state (sensors, emotions, flags)
 *   RobotAdapter ← hardware abstraction (browser canvas, WebSocket, BLE, serial...
 *
 * Node types:
 *   Composite: Sequence, Selector, Parallel
 *   Decorator: Inverter, Repeater, Cooldown, Condition
 *   Leaf:      Action, Wait
 */

// ─── Node Status ────────────────────────────────────────────────

export type NodeStatus = 'success' | 'failure' | 'running'

// ─── Blackboard (shared world state) ────────────────────────────

export interface Blackboard {
  // Perception
  pointerX: number
  pointerY: number
  pointerActive: boolean
  canvasWidth: number
  canvasHeight: number

  // Agent state
  x: number
  y: number
  rotation: number    // degrees
  speed: number       // pixels per tick
  emotion: Emotion
  energy: number      // 0-1
  excitement: number  // 0-1

  // Timing
  tick: number
  deltaMs: number
  totalMs: number

  // Custom flags (extensible by character behaviors)
  [key: string]: unknown
}

export type Emotion = 'idle' | 'happy' | 'curious' | 'alert' | 'sleepy' | 'playful' | 'angry'

export function createBlackboard(canvasWidth = 400, canvasHeight = 300): Blackboard {
  return {
    pointerX: 0,
    pointerY: 0,
    pointerActive: false,
    canvasWidth,
    canvasHeight,
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    rotation: 0,
    speed: 2,
    emotion: 'idle',
    energy: 1,
    excitement: 0,
    tick: 0,
    deltaMs: 0,
    totalMs: 0,
  }
}

// ─── Node Definitions (serializable JSON) ───────────────────────

export type BehaviorNodeDef =
  | SequenceDef
  | SelectorDef
  | ParallelDef
  | InverterDef
  | RepeaterDef
  | CooldownDef
  | ConditionDef
  | ActionDef
  | WaitDef

interface BaseNodeDef {
  /** Optional label for debugging/visualization */
  name?: string
}

export interface SequenceDef extends BaseNodeDef {
  type: 'sequence'
  children: BehaviorNodeDef[]
}

export interface SelectorDef extends BaseNodeDef {
  type: 'selector'
  children: BehaviorNodeDef[]
}

export interface ParallelDef extends BaseNodeDef {
  type: 'parallel'
  /** Minimum successes required to return success. Default: all children */
  successThreshold?: number
  children: BehaviorNodeDef[]
}

export interface InverterDef extends BaseNodeDef {
  type: 'inverter'
  child: BehaviorNodeDef
}

export interface RepeaterDef extends BaseNodeDef {
  type: 'repeater'
  /** Number of times to repeat. -1 = forever */
  count: number
  child: BehaviorNodeDef
}

export interface CooldownDef extends BaseNodeDef {
  type: 'cooldown'
  /** Cooldown in milliseconds */
  durationMs: number
  child: BehaviorNodeDef
}

export interface ConditionDef extends BaseNodeDef {
  type: 'condition'
  /** Predicate key — resolved by the engine's condition registry */
  check: string
  /** Optional args passed to the condition function */
  args?: Record<string, unknown>
}

export interface ActionDef extends BaseNodeDef {
  type: 'action'
  /** Action key — resolved by the engine's action registry */
  action: string
  /** Optional args passed to the action function */
  args?: Record<string, unknown>
}

export interface WaitDef extends BaseNodeDef {
  type: 'wait'
  /** Wait duration in milliseconds */
  durationMs: number
}

// ─── Runtime Node (hydrated from def, carries state) ────────────

export interface RuntimeNode {
  def: BehaviorNodeDef
  status: NodeStatus | 'idle'
  /** Per-node ephemeral state (cooldown timers, repeat counters, etc.) */
  state: Record<string, unknown>
  children: RuntimeNode[]
}

// ─── Action / Condition Registries ──────────────────────────────

export type ActionFn = (
  bb: Blackboard,
  adapter: RobotAdapter,
  args?: Record<string, unknown>,
) => NodeStatus

export type ConditionFn = (
  bb: Blackboard,
  args?: Record<string, unknown>,
) => boolean

// ─── Robot Capabilities ───────────────────────────────────────

/**
 * Describes what a RobotAdapter can do. Used by the BTGraphEditor
 * to grey out incompatible node types in the palette.
 */
export interface RobotCapabilities {
  /** Can move the robot forward / backward */
  movement: boolean
  /** Can rotate the robot in place */
  rotation: boolean
  /** Can set speed (0-1 range) */
  speed: boolean
  /** Can control LEDs */
  led: boolean
  /** Can play sounds / beeps */
  sound: boolean
  /** Can perform complex gestures (dance, wave, etc.) */
  gesture: boolean
  /** Maximum speed (pixels/sec or equivalent) */
  maxSpeed: number
  /** Maximum rotation speed (degrees/sec) */
  maxRotationSpeed: number
}

export const DEFAULT_CAPABILITIES: RobotCapabilities = {
  movement: true,
  rotation: true,
  speed: true,
  led: false,
  sound: false,
  gesture: false,
  maxSpeed: 100,
  maxRotationSpeed: 180,
}

// ─── Robot Adapter (hardware abstraction) ───────────────────────

/**
 * RobotAdapter is the bridge between the behavior tree engine and
 * any physical/virtual output. Implement this interface to support
 * a new robot platform.
 *
 * Built-in adapters:
 *   - CanvasAdapter: renders agent on a 2D <canvas> (browser demo)
 *
 * Future adapters:
 *   - WebSocketAdapter: sends commands over WebSocket to a robot
 *   - BLEAdapter: communicates via Web Bluetooth
 *   - SerialAdapter: communicates via Web Serial
 */
export interface RobotAdapter {
  /** Unique identifier for this adapter type */
  readonly type: string

  /** Human-readable name */
  readonly name: string

  /** Called once when the behavior tree starts */
  init(bb: Blackboard): void

  /** Called every tick — render/send the current state */
  update(bb: Blackboard): void

  /** Called when the behavior tree stops */
  destroy(): void

  /** Send a specific command (motor, LED, sound, etc.) */
  sendCommand(command: AdapterCommand): void

  /** Report what this adapter can do (for editor capability discovery) */
  capabilities(): RobotCapabilities
}

export interface AdapterCommand {
  type: string
  payload: Record<string, unknown>
}

// ─── Character Behavior Definition ──────────────────────────────

export interface CharacterBehavior {
  /** Must match a Character.id */
  characterId: string
  /** Root of the behavior tree */
  tree: BehaviorNodeDef
  /** Initial blackboard overrides */
  defaults?: Partial<Blackboard>
  /** Tick interval in ms (default: 100 = 10 FPS for logic) */
  tickIntervalMs?: number
}

// ─── Simplified node type for editor ────────────────────────────

export interface BTNodeWithChildren {
  type: string
  id: string
  children: BTNodeWithChildren[]
  args?: any
}

export type BTNodeType = 'root' | 'sequence' | 'selector' | 'parallel' | 'inverter' | 'repeater' | 'cooldown' | 'condition' | 'action' | 'wait'

export type BTNode = 
  | { type: 'sequence'; children?: BTNodeWithChildren[]; id?: string }
  | { type: 'selector'; children?: BTNodeWithChildren[]; id?: string }
  | { type: 'parallel'; successThreshold?: number; children?: BTNodeWithChildren[]; id?: string }
  | { type: 'inverter'; child: BTNode; id?: string }
  | { type: 'repeater'; count: number; child: BTNode; id?: string }
  | { type: 'cooldown'; durationMs: number; child: BTNode; id?: string }
  | { type: 'condition'; condition: string; args?: any; id?: string }
  | { type: 'action'; name: string; args?: any; id?: string }
  | { type: 'wait'; durationMs?: number; id?: string }
  | { type: 'root'; children?: BTNodeWithChildren[]; id?: string }

// ─── BT Editor-specific types ─────────────────────────────

export interface BTEditionNode {
  type: string
  id: string
  children?: BTEditionNode[]
  args?: any
  condition?: string
  name?: string
  durationMs?: number
  count?: number
  child?: BTEditionNode
  successThreshold?: number
}

// ─── BT Node compatibility helpers ─────────────────────────────

/**
 * Check if a BT node type requires capabilities the adapter lacks.
 * Returns true if the node IS compatible (adapter supports what it needs).
 */
export function isNodeCompatible(
  nodeType: string,
  caps: RobotCapabilities,
): boolean {
  switch (nodeType) {
    case 'sequence':
    case 'selector':
    case 'parallel':
    case 'inverter':
    case 'repeater':
    case 'cooldown':
    case 'root':
      // Composite / decorator nodes work with any adapter
      return true
    case 'condition':
      // Conditions are pure blackboard checks — always compatible
      return true
    case 'wait':
      // Wait is a local timer — always compatible
      return true
    case 'action':
      // Actions need at least one output capability
      return caps.movement || caps.led || caps.sound || caps.gesture
    default:
      return true
  }
}

// ─── Built-in actions/conditions ─────────────────────────────────

export const actions: Record<string, string> = {
  moveToPointer: 'moves to cursor position',
  turnToPointer: 'turns to face cursor',
  wagTail: 'wags tail/tail-like appendage',
  speak: 'speaks a phrase',
  jump: 'performs a jump animation',
  spin: 'spins around',
  dance: 'performs a dance routine',
  attack: 'attacks nearby objects',
  follow: 'follows target',
  idle: 'performs idle animations',
}

export const conditions: Record<string, string> = {
  isHovering: 'pointer is over a region',
  isColliding: 'agent is colliding with another object',
  isNear: 'agent is near a specific point',
  hasLowEnergy: 'energy is below threshold',
  isFacingTarget: 'agent is facing a target',
  isObstacleAhead: 'there is an obstacle ahead',
  isPathClear: 'path to target is clear',
  isNight: 'environment is dark/nighttime',
  isDaylight: 'environment is bright/daytime',
}
