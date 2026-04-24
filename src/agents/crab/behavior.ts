import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦀 Crab
 *
 * Beach explorer with a sideways gait. Scuttles near the pointer,
 * retreats into its shell when the pointer gets too close,
 * then peeks back out once things calm down.
 */
export const behavior: CharacterBehavior = {
  characterId: 'crab',
  tickIntervalMs: 100,
  defaults: { speed: 2.5, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Hide when pointer is too close
    seq('Hide in shell',
      cond('pointerNearby', { radius: 120 }),
      act('setEmotion', { emotion: 'scared' }),
      act('moveAway', { direction: 'away', speed: 1.5 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 2: Scuttle toward pointer (sideways)
    seq('Scuttle toward pointer',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Wander the beach
    seq('Beach patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}
