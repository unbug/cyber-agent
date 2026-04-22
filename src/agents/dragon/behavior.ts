import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐉 Dragon
 *
 * Majestic performer. Flies to pointer with dramatic flair,
 * breathes fire (rapid movements), rests on high ground.
 */
export const behavior: CharacterBehavior = {
  characterId: 'dragon',
  tickIntervalMs: 75,
  defaults: { speed: 4, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Perch and rest
    seq('Perch and rest',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Dramatic flight to pointer
    seq('Dramatic flight',
      cond('pointerNearby', { radius: 400 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.15 }),
      act('moveToPointer', { speed: 6 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Soaring patrol
    seq('Soaring patrol',
      act('setEmotion', { emotion: 'proud' }),
      act('wander', { speed: 3 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}
