import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🏄 Beach Cruiser
 *
 * Rhythmic performer that loves smooth, flowing movements.
 * Exhibits creative patterns and joyful expressions.
 */
export const behavior: CharacterBehavior = {
  characterId: 'beach-cruiser',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Pointer nearby → perform joyful motion
    seq('Perform for pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 2.5 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Flowing wander
    seq('Flowing wander',
      act('setEmotion', { emotion: 'joyful' }),
      act('decayExcitement'),
      act('wander', { speed: 1.5, smooth: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}