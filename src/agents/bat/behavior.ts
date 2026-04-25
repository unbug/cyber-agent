import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦇 Bat
 *
 * Flits erratically like a real bat — quick direction changes,
 * then dives toward the pointer with sonar-like swoops.
 */
export const behavior: CharacterBehavior = {
  characterId: 'bat',
  tickIntervalMs: 60,
  defaults: { speed: 3.5, energy: 0.75 },
  tree: sel('Root',
    // Priority 1: Sonar dive at pointer
    seq('Sonar dive',
      cond('pointerNearby', { radius: 150 }),
      act('setEmotion', { emotion: 'curious' }),
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 4.5 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Erratic flitting
    seq('Nocturnal flit',
      act('setEmotion', { emotion: 'mysterious' }),
      act('erraticMove', { speed: 3.0 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}
