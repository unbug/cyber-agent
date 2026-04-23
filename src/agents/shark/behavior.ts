import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦈 Shark
 *
 * Relentless hunter. Circles the arena with growing intensity,
  * charges at the pointer with full speed when close enough.
 */
export const behavior: CharacterBehavior = {
  characterId: 'shark',
  tickIntervalMs: 80,
  defaults: { speed: 3.5, energy: 0.65 },
  tree: sel('Root',
    // Priority 1: Charge at pointer
    seq('Charge',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'fierce' }),
      act('increaseExcitement', { amount: 0.15 }),
      act('moveToPointer', { speed: 6.0 }),
      act('drainEnergy', { rate: 0.006 }),
    ),
    // Priority 2: Circle patrol
    seq('Circle patrol',
      act('setEmotion', { emotion: 'focused' }),
      act('wander', { speed: 3.0 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}
