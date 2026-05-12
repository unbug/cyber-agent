/**
 * v2.0 — Dataset module barrel export
 *
 * Provides episode recording in `.cybertrace` format and
 * HuggingFace Hub upload capabilities for the Sim ↔ Real bridge.
 */

export { EpisodeRecorder } from './recorder'
export type { EpisodeMeta, Dataset } from './recorder'
export { uploadToHub, uploadDatasetFiles, checkHubToken, getHubUserInfo } from './upload'
export type { HubUploadConfig, HubUploadResult } from './upload'
export { DatasetPanel } from './dataset-panel'
