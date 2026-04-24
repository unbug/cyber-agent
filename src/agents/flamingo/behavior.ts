import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦩 Flamingo
 *
 * Elegant performer. Alternates between standing on one leg (idle),
 * strutting toward pointer, and dramatic poses.
 */
export const behavior: CharacterBehavior = {
  characterId: 'flamingo',
  tickIntervalMs: 120,
  defaults: { speed: 2.5, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Too tired → rest (stand on one leg)
    seq('Rest on one leg',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('stayStill', { duration: 3000 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Pointer nearby → strut dramatically
    seq('Strut to pointer',
      cond('pointerNearby', { radius: 300 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Stride and pose
    seq('Stride and pose',
      act('setEmotion', { emotion: 'proud' }),
      act('increaseExcitement', { amount: 0.01 }),
      act('wander', { speed: 2 }),
      act('pauseRandomly', { minMs: 1500, maxMs: 4000 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
