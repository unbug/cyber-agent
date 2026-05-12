/**
 * Scene registry — loads all available scenes and provides lookup helpers.
 */

import { playgroundScene } from './playground'
import { parkScene } from './park'
import { campusScene } from './campus'
import { schoolyardScene } from './schoolyard'
import type { Scene, SceneId, SceneRegistry } from './types'

/** All available scenes keyed by id */
export const sceneRegistry: SceneRegistry = {
  playground: playgroundScene,
  park: parkScene,
  campus: campusScene,
  schoolyard: schoolyardScene,
}

/** Get a scene by id */
export function getScene(id: string): Scene | undefined {
  return sceneRegistry[id]
}

/** Get all available scene IDs */
export function getSceneIds(): SceneId[] {
  return Object.keys(sceneRegistry) as SceneId[]
}

/** Get all scenes as an array */
export function getAllScenes(): Scene[] {
  return Object.values(sceneRegistry)
}

/** Validate that a scene's POIs are within bounds */
export function validateScene(scene: Scene): boolean {
  const { width, height } = scene.bounds
  for (const poi of scene.pois) {
    if (poi.x < 0 || poi.x > width || poi.y < 0 || poi.y > height) {
      console.warn(`[Scene] POI "${poi.id}" (${poi.x},${poi.y}) out of bounds (${width}×${height})`)
      return false
    }
    if (poi.r <= 0) {
      console.warn(`[Scene] POI "${poi.id}" has non-positive radius: ${poi.r}`)
      return false
    }
  }
  for (const spawn of scene.spawns) {
    if (spawn.x < 0 || spawn.x > width || spawn.y < 0 || spawn.y > height) {
      console.warn(`[Scene] Spawn "${spawn.id}" (${spawn.x},${spawn.y}) out of bounds (${width}×${height})`)
      return false
    }
  }
  return true
}

/** Validate a scene and throw if invalid */
export function requireScene(id: string): Scene {
  const scene = sceneRegistry[id]
  if (!scene) {
    throw new Error(`Scene not found: "${id}". Available: ${getSceneIds().join(', ')}`)
  }
  if (!validateScene(scene)) {
    throw new Error(`Scene "${id}" failed validation`)
  }
  return scene
}
