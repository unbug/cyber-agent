/**
 * CyberAgent Affect Engine — Barrel exports
 */

// Explicit re-exports to avoid ambiguity
export type { ValState, ValBias, ValEvent, EmotionDSL } from './types'
export { emotionPresets, composeEmotions, createValState, cloneValState, valenceToString, arousalToString, dominanceToString, valToString, evaluateBias, biasMatchScore, clamp } from './types'
export * from './engine'
export * from './emotions'
