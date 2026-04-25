import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦗 Cricket
 *
 * Hops erratically across the canvas. Performs rhythmic jump patterns
 * when excited. Loves to investigate the pointer with quick hops.
 */
export const behavior: CharacterBehavior = {
  characterId: 'cricket',
  tickIntervalMs: 80,
  defaults: { speed: 3.0, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Investigate pointer with hops
    seq('Hop to pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'excited' }),
      act('increaseExcitement', { amount: 0.07 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 2: Erratic hopping
    seq('Erratic hops',
      act('setEmotion', { emotion: 'playful' }),
      act('erraticMove', { speed: 2.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}
