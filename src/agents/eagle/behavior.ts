import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦅 Eagle
 *
 * Soars high in wide circles, then dives toward the pointer with
 * dramatic flair. Loves open space and hates boundaries.
 */
export const behavior: CharacterBehavior = {
  characterId: 'eagle',
  tickIntervalMs: 70,
  defaults: { speed: 4.0, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Dive at pointer when close
    seq('Dive at pointer',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'excited' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 5.0 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Soar in wide circles
    seq('Soar high',
      act('setEmotion', { emotion: 'free' }),
      act('wander', { speed: 3.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
