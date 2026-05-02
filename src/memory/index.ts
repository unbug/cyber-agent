/**
 * Episodic Memory — Barrel export.
 */

export type {
  ValenceArousalDominance,
  EpisodicMemory,
  RecallQuery,
  RecallResult,
  EpisodicStoreBackend,
  ForgettingCurveParams,
  MemoryStats,
} from './types'

export {
  DEFAULT_FORGETTING_PARAMS,
} from './types'

export {
  InMemoryEpisodicStore,
  computeMemoryStats,
} from './episodic-store'
