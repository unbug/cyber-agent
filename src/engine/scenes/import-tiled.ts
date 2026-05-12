/**
 * Tiled map importer — converts Tiled JSON maps to Scene definitions.
 *
 * Supports:
 *   - `bgtiles` layer (background tiles, used as collision mask)
 *   - `objmap` layer (objects → POIs)
 *   - Object properties: `type`, `r` (radius), `label`
 *
 * Usage:
 *   import { importTiledMap } from './engine/scenes/import-tiled'
 *   const scene = importTiledMap(tiledJson, 'playground')
 */

import type { Scene, ScenePOI, SpawnPoint } from './types'

/** Tiled object layer entry */
interface TiledObject {
  id: number
  name: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  properties?: Record<string, unknown>
  visible?: boolean
}

/** Tiled layer */
interface TiledLayer {
  name: string
  type: string
  visible?: boolean
  objects?: TiledObject[]
  width?: number
  height?: number
  tilewidth?: number
  tileheight?: number
  content?: number[]
  encoding?: string
  compression?: string
}

/** Tiled map root */
export interface TiledMap {
  width: number
  height: number
  tilewidth: number
  tileheight: number
  layers: TiledLayer[]
  orientation?: string
  renderorder?: string
  nextobjectid: number
}

/** Options for importing a Tiled map */
export interface ImportOptions {
  /** Scene id to use */
  sceneId: string
  /** Scene name (defaults to sceneId if not provided) */
  name?: string
  /** Scene description (defaults to a generated one) */
  description?: string
  /** Map layer name for objects (defaults to 'objmap') */
  objectLayer?: string
  /** Map layer name for background tiles (defaults to 'bgtiles') */
  bgLayer?: string
  /** Tile-to-pixel scale factor (defaults to 1.0) */
  tileScale?: number
}

/**
 * Import a Tiled JSON map into a Scene definition.
 */
export function importTiledMap(
  map: TiledMap,
  options: string | ImportOptions,
): Scene {
  if (typeof options === 'string') {
    options = { sceneId: options }
  }

  const {
    sceneId,
    name,
    description,
    objectLayer = 'objmap',
    bgLayer = 'bgtiles',
    tileScale = 1.0,
  } = options

  const width = map.width * map.tilewidth * tileScale
  const height = map.height * map.tileheight * tileScale

  // Extract POIs from object layer
  const poiLayer = map.layers.find((l) => l.name === objectLayer)
  const pois: ScenePOI[] = []
  if (poiLayer?.objects) {
    for (const obj of poiLayer.objects) {
      if (obj.visible === false) continue
      const props = obj.properties ?? {}
      pois.push({
        id: obj.name || `obj_${obj.id}`,
        type: (props.type as ScenePOI['type']) ?? obj.type ?? 'obstacle',
        x: obj.x * tileScale,
        y: obj.y * tileScale,
        r: (props.r as number) ?? ((obj.width ?? obj.height) ?? 20) * tileScale,
        label: (props.label as string) ?? obj.name,
        passable: (props.passable as boolean) ?? true,
      })
    }
  }

  // Extract spawn points from a 'spawns' object group or layer
  const spawnLayer = map.layers.find((l) => l.name === 'spawns')
  const spawns: SpawnPoint[] = []
  if (spawnLayer?.objects) {
    for (const obj of spawnLayer.objects) {
      spawns.push({
        id: obj.name || `spawn_${obj.id}`,
        x: obj.x * tileScale,
        y: obj.y * tileScale,
        label: obj.name,
      })
    }
  }

  // Collect background tiles as collision mask hint
  const bgLayerDef = map.layers.find((l) => l.name === bgLayer)
  let collisionMask: ImageData | Uint8Array | undefined
  if (bgLayerDef?.content) {
    // Build a minimal collision mask from tile layer
    // In production, decode the compressed tile data properly
    const maskWidth = Math.floor(width)
    const maskHeight = Math.floor(height)
    collisionMask = buildCollisionMask(bgLayerDef, maskWidth, maskHeight, tileScale)
  }

  const result: Scene = {
    id: sceneId,
    name: name ?? sceneId.charAt(0).toUpperCase() + sceneId.slice(1),
    description: description ?? `Imported from Tiled map: ${sceneId}`,
    bounds: { width, height },
    pois,
    spawns,
    collisionMask,
    tiledMap: `maps/${sceneId}.tmj`,
    cellSize: 50,
  }
  return result
}

/**
 * Build a minimal collision mask from a Tiled tile layer.
 * Tiles with gid > 0 are marked as solid (alpha = 255).
 */
function buildCollisionMask(
  layer: TiledLayer,
  width: number,
  height: number,
  tileScale: number,
): Uint8Array {
  const tileW = (layer.tilewidth ?? 32) * tileScale
  const tileH = (layer.tileheight ?? 32) * tileScale
  const cols = Math.ceil(width / tileW)
  const rows = Math.ceil(height / tileH)
  const data = new Uint8Array(cols * rows * 4)

  if (layer.content) {
    for (let i = 0; i < layer.content.length; i++) {
      const gid = layer.content[i]
      if (gid === 0) continue // Empty tile
      const col = i % cols
      const row = Math.floor(i / cols)
      for (let dy = 0; dy < tileH; dy++) {
        for (let dx = 0; dx < tileW; dx++) {
          const idx = ((row * tileH + dy) * cols + col) * 4 + dx
          if (idx < data.length) {
            data[idx] = 255 // R (solid)
            data[idx + 1] = 255 // G
            data[idx + 2] = 255 // B
            data[idx + 3] = 255 // A (opaque)
          }
        }
      }
    }
  }

  return data
}

/**
 * Generate a default scene for a given scene id (used when no Tiled map exists).
 */
export function createDefaultScene(_sceneId: string): Scene | undefined {
  // This is a fallback — in practice scenes are defined in their own files
  // and imported from the registry.
  return undefined
}
