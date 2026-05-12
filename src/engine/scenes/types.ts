/**
 * Scene library — typed scene definitions for multi-agent playground.
 *
 * Each scene defines:
 *   - Bounded world area (width × height)
 *   - Points of Interest (POIs) with type, position, radius
 *   - Optional collision mask (from Tiled export)
 *   - Default agent spawn positions
 *
 * Scenes can be authored as JSON/YAML configs or imported from Tiled maps.
 */

// ─── Types ───────────────────────────────────────────────────────

/** POI types that agents can interact with */
export type PoiType =
  | 'slide'
  | 'swing'
  | 'sandbox'
  | 'bench'
  | 'tree'
  | 'fountain'
  | 'classroom'
  | 'door'
  | 'track'
  | 'playground'
  | 'campus'
  | 'schoolyard'
  | 'gate'
  | 'path'
  | 'obstacle'
  | 'rest_area'
  | 'water'
  | 'flower_bed'
  | 'statue'
  | 'fence'
  | 'wall'
  | 'gate'
  | 'awning'
  | 'stage'
  | 'food_stand'
  | 'library'
  | 'gym'
  | 'playground'
  | 'parking'
  | 'garden'
  | 'pond'
  | 'bridge'
  | 'well'
  | 'bell_tower'
  | 'clock_tower'

/** A point of interest in a scene */
export interface ScenePOI {
  /** Unique ID within the scene */
  id: string
  /** POI type (slide, swing, bench, etc.) */
  type: PoiType
  /** Center X coordinate */
  x: number
  /** Center Y coordinate */
  y: number
  /** Interaction radius in pixels */
  r: number
  /** Optional label shown in debug panels */
  label?: string
  /** Whether agents can pass through this POI (false = collision) */
  passable?: boolean
}

/** Agent spawn point in a scene */
export interface SpawnPoint {
  /** Unique ID */
  id: string
  /** Position */
  x: number
  y: number
  /** Optional label */
  label?: string
}

/** Scene definition */
export interface Scene {
  /** Scene identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description */
  description: string
  /** World bounds in pixels */
  bounds: { width: number; height: number }
  /** Points of interest */
  pois: ScenePOI[]
  /** Default spawn points for agents */
  spawns: SpawnPoint[]
  /** Optional collision mask (ImageData from Tiled, or Uint8Array in Node) */
  collisionMask?: ImageData | Uint8Array
  /** Tiled map source file (optional) */
  tiledMap?: string
  /** Default cell size for spatial index */
  cellSize?: number
}

/** Registry of all available scenes */
export interface SceneRegistry {
  [id: string]: Scene
}

// ─── Scene IDs ───────────────────────────────────────────────────

export const SCENE_IDS = [
  'playground',
  'park',
  'campus',
  'schoolyard',
] as const

export type SceneId = (typeof SCENE_IDS)[number]
