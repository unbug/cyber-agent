import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐍 Cobra
 *
   * Stealth guard. Slithers in slow arcs, coils when threatened,
  * and makes sudden strikes at intruders.
 */
export const behavior: CharacterBehavior = {
  characterId: 'cobra',
  tickIntervalMs: 100,
  defaults: { speed: 2.2, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Strike at pointer if close
    seq('Strike',
      cond('pointerNearby', { radius: 120 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.12 }),
      act('moveToPointer', { speed: 5.0 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Coil and wait
    seq('Coil and wait',
      act('setEmotion', { emotion: 'alert' }),
      act('wander', { speed: 1.2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
