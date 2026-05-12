/**
 * Scene library — barrel export.
 *
 * Scenes define the physical environment where multi-agent simulation happens.
 * Each scene has bounds, POIs (points of interest), and spawn points.
 */

export type {
  Scene,
  ScenePOI,
  SpawnPoint,
  SceneRegistry,
  PoiType,
  SceneId,
} from './types'

export {
  SCENE_IDS,
} from './types'

export {
  sceneRegistry,
  getScene,
  getSceneIds,
  getAllScenes,
  validateScene,
  requireScene,
} from './registry'

export {
  importTiledMap,
  createDefaultScene,
} from './import-tiled'
export type {
  TiledMap,
  ImportOptions,
} from './import-tiled'

export { playgroundScene } from './playground'
export { parkScene } from './park'
export { campusScene } from './campus'
export { schoolyardScene } from './schoolyard'
