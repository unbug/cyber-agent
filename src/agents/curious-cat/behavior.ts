import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐈 Curious Cat
 *
 * Independent. Approaches pointer cautiously, then ignores it.
 * Explores corners. Naps frequently.
 */
export const behavior: CharacterBehavior = {
  characterId: 'curious-cat',
  tickIntervalMs: 120,
  defaults: { speed: 1.8, energy: 0.7 },
  tree: sel('Root',
    // Sleepy cat naps a lot
    seq('Nap time',
      cond('energyBelow', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Occasionally curious about pointer
    seq('Investigate pointer',
      cond('pointerNearby', { radius: 120 }),
      cond('random', { chance: 0.3 }),
      act('setEmotion', { emotion: 'curious' }),
      act('moveToPointer', { speed: 1 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Ignore pointer and be independent
    seq('Independent exploration',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.8 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0003 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}
