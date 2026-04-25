import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦦 Otter
 *
 * Playful aquatic companion. Rolls and flips toward the pointer,
 * nuzzles affectionately when close, and bobs up and down with joy.
 * An endless source of delight.
 */
export const behavior: CharacterBehavior = {
  characterId: 'otter',
  tickIntervalMs: 100,
  defaults: { speed: 3, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Nuzzle when pointer is very close
    seq('Nuzzle',
      cond('pointerNearby', { radius: 40 }),
      act('setEmotion', { emotion: 'joyful' }),
      act('increaseExcitement', { amount: 0.1 }),
      act('pulse', { speed: 1, durationMs: 300 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 2: Flip toward pointer
    seq('Flip approach',
      cond('pointerFarAway', { distance: 100 }),
      act('setEmotion', { emotion: 'excited' }),
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 4 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Playful rolling — erratic but joyful
    seq('Play',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('erraticMove', { speed: 2.5, jitter: 0.4 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
