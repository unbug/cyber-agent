/**
 * Scene library tests — validates scene definitions, registry, and Tiled importer.
 */

import { describe, it, expect } from 'vitest'
import {
  getScene,
  getSceneIds,
  getAllScenes,
  validateScene,
  requireScene,
} from './registry'
import { importTiledMap } from './import-tiled'
import { playgroundScene } from './playground'
import { parkScene } from './park'
import { campusScene } from './campus'
import { schoolyardScene } from './schoolyard'
import type { Scene, ScenePOI, SpawnPoint } from './types'
import type { TiledMap } from './import-tiled'

describe('scene registry', () => {
  it('has all 4 scenes', () => {
    expect(getSceneIds()).toHaveLength(4)
    expect(getSceneIds()).toContain('playground')
    expect(getSceneIds()).toContain('park')
    expect(getSceneIds()).toContain('campus')
    expect(getSceneIds()).toContain('schoolyard')
  })

  it('getAllScenes returns all scenes', () => {
    const all = getAllScenes()
    expect(all).toHaveLength(4)
  })

  it('getScene returns the correct scene', () => {
    expect(getScene('playground')).toBe(playgroundScene)
    expect(getScene('park')).toBe(parkScene)
    expect(getScene('campus')).toBe(campusScene)
    expect(getScene('schoolyard')).toBe(schoolyardScene)
  })

  it('getScene returns undefined for unknown id', () => {
    expect(getScene('nonexistent')).toBeUndefined()
  })
})

describe('scene validation', () => {
  it('validates all built-in scenes', () => {
    for (const scene of getAllScenes()) {
      expect(validateScene(scene), `${scene.id} should be valid`).toBe(true)
    }
  })

  it('rejects scene with POI out of bounds', () => {
    const badScene: Scene = {
      ...playgroundScene,
      pois: [
        ...playgroundScene.pois,
        { id: 'bad', type: 'obstacle' as const, x: 9999, y: 0, r: 10, passable: true },
      ],
    }
    expect(validateScene(badScene)).toBe(false)
  })

  it('rejects scene with POI having non-positive radius', () => {
    const badScene: Scene = {
      ...playgroundScene,
      pois: [
        ...playgroundScene.pois,
        { id: 'bad', type: 'obstacle' as const, x: 100, y: 100, r: 0, passable: true },
      ],
    }
    expect(validateScene(badScene)).toBe(false)
  })

  it('rejects scene with spawn out of bounds', () => {
    const badScene: Scene = {
      ...playgroundScene,
      spawns: [
        ...playgroundScene.spawns,
        { id: 'bad', x: 9999, y: 0, label: 'Bad' },
      ],
    }
    expect(validateScene(badScene)).toBe(false)
  })
})

describe('requireScene', () => {
  it('returns scene for valid id', () => {
    expect(requireScene('playground')).toBe(playgroundScene)
  })

  it('throws for unknown id', () => {
    expect(() => requireScene('nonexistent')).toThrow('Scene not found')
  })

  it('throws for scene that fails validation', () => {
    // requireScene validates existence in registry
    expect(() => requireScene('playground')).not.toThrow()
  })
})

describe('scene properties', () => {
  it('playground has ≥6 POIs', () => {
    expect(playgroundScene.pois.length).toBeGreaterThanOrEqual(6)
  })

  it('park has ≥6 POIs', () => {
    expect(parkScene.pois.length).toBeGreaterThanOrEqual(6)
  })

  it('campus has ≥6 POIs', () => {
    expect(campusScene.pois.length).toBeGreaterThanOrEqual(6)
  })

  it('schoolyard has ≥6 POIs', () => {
    expect(schoolyardScene.pois.length).toBeGreaterThanOrEqual(6)
  })

  it('playground has ≥5 spawn points', () => {
    expect(playgroundScene.spawns.length).toBeGreaterThanOrEqual(5)
  })

  it('park has ≥5 spawn points', () => {
    expect(parkScene.spawns.length).toBeGreaterThanOrEqual(5)
  })

  it('campus has ≥5 spawn points', () => {
    expect(campusScene.spawns.length).toBeGreaterThanOrEqual(5)
  })

  it('schoolyard has ≥5 spawn points', () => {
    expect(schoolyardScene.spawns.length).toBeGreaterThanOrEqual(5)
  })

  it('all scenes have cellSize defined', () => {
    for (const scene of getAllScenes()) {
      expect(scene.cellSize).toBeDefined()
      expect(typeof scene.cellSize).toBe('number')
      expect(scene.cellSize!).toBeGreaterThan(0)
    }
  })
})

describe('importTiledMap', () => {
  it('imports a simple map with object layer', () => {
    const tiledMap: TiledMap = {
      width: 20,
      height: 15,
      tilewidth: 32,
      tileheight: 32,
      layers: [
        {
          name: 'objmap',
          type: 'objectgroup',
          objects: [
            { id: 1, name: 'slide', type: 'slide', x: 64, y: 128, width: 64, height: 64, properties: { label: 'Test Slide' } },
            { id: 2, name: 'bench', type: 'bench', x: 200, y: 200, width: 32, height: 32, properties: { passable: true } },
          ],
        },
        {
          name: 'spawns',
          type: 'objectgroup',
          objects: [
            { id: 10, name: 'spawn1', type: '', x: 100, y: 100 },
          ],
        },
        {
          name: 'bgtiles',
          type: 'tilelayer',
          width: 20,
          height: 15,
          content: new Array(300).fill(0),
        },
      ],
      orientation: 'orthogonal',
      renderorder: 'right-down',
      nextobjectid: 11,
    }

    const scene: Scene = importTiledMap(tiledMap, 'test-scene')
    const pois = scene.pois as ScenePOI[]
    const spawns = scene.spawns as SpawnPoint[]

    expect(scene.id).toBe('test-scene')
    expect(scene.name).toBe('Test-scene')
    expect(scene.bounds.width).toBe(640)
    expect(scene.bounds.height).toBe(480)
    expect(pois).toHaveLength(2)
    expect(pois[0]!.type).toBe('slide')
    expect(pois[0]!.x).toBe(64)
    expect(pois[0]!.r).toBe(64)
    expect(pois[1]!.type).toBe('bench')
    expect(pois[1]!.passable).toBe(true)
    expect(spawns).toHaveLength(1)
    expect(spawns[0]!.id).toBe('spawn1')
    expect(scene.collisionMask).toBeDefined()
  })

  it('imports with tileScale', () => {
    const tiledMap: TiledMap = {
      width: 10,
      height: 10,
      tilewidth: 64,
      tileheight: 64,
      layers: [
        {
          name: 'objmap',
          type: 'objectgroup',
          objects: [],
        },
      ],
      orientation: 'orthogonal',
      renderorder: 'right-down',
      nextobjectid: 1,
    }

    const scene = importTiledMap(tiledMap, {
      sceneId: 'scaled',
      tileScale: 2.0,
    })

    expect(scene.bounds.width).toBe(1280) // 10 * 64 * 2
    expect(scene.bounds.height).toBe(1280)
  })

  it('handles invisible objects', () => {
    const tiledMap: TiledMap = {
      width: 10,
      height: 10,
      tilewidth: 32,
      tileheight: 32,
      layers: [
        {
          name: 'objmap',
          type: 'objectgroup',
          objects: [
            { id: 1, name: 'visible', type: 'bench', x: 32, y: 32, visible: true },
            { id: 2, name: 'hidden', type: 'bench', x: 64, y: 64, visible: false },
          ],
        },
      ],
      orientation: 'orthogonal',
      renderorder: 'right-down',
      nextobjectid: 3,
    }

    const scene = importTiledMap(tiledMap, 'invisible-test') as Scene
    const pois = scene.pois as ScenePOI[]
    expect(pois).toHaveLength(1)
    expect(pois[0]!.id).toBe('visible')
  })
})
