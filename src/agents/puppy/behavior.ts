import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐶 Puppy
 *
 * Energetic young companion. Follows pointer eagerly, wags tail when excited,
 * gets sleepy when low on energy. High-energy startup personality.
 */
export const behavior: CharacterBehavior = {
  characterId: 'puppy',
  tickIntervalMs: 80,
  defaults: { speed: 3, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Too tired → sleep
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Pointer nearby → follow excitedly
    seq('Follow pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 4 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Wander around energetically
    seq('Wander',
      act('setEmotion', { emotion: 'playful' }),
      act('decayExcitement'),
      act('wander', { speed: 2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}