import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐕 Loyal Dog
 *
 * Follows pointer eagerly, wanders when bored,
 * gets happy near pointer, drains energy, rests when tired.
 */
export const behavior: CharacterBehavior = {
  characterId: 'loyal-dog',
  tickIntervalMs: 80,
  defaults: { speed: 2.5, energy: 0.8 },
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
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Wander around
    seq('Wander',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1.2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
