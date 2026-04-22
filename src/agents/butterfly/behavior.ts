import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦋 Butterfly
 *
 * Graceful and delicate. Flits toward pointer with elegant curves,
 * rests on flowers (center), dances in breeze. Low energy, high beauty.
 */
export const behavior: CharacterBehavior = {
  characterId: 'butterfly',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Rest on flower
    seq('Rest on flower',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.25 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Flutter toward pointer
    seq('Flutter toward pointer',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 3: Dance in breeze
    seq('Dance in breeze',
      act('setEmotion', { emotion: 'playful' }),
      act('wander', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
