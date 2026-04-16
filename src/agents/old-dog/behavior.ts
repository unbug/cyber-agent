import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐕 Old Dog
 *
 * Calm elderly companion. Moves slowly, rarely gets excited,
 * prefers to rest. Low-energy relaxation personality.
 */
export const behavior: CharacterBehavior = {
  characterId: 'old-dog',
  tickIntervalMs: 120,
  defaults: { speed: 0.8, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Priority 2: Pointer nearby → slow approach
    seq('Approach pointer',
      cond('pointerNearby', { radius: 150 }),
      act('setEmotion', { emotion: 'curious' }),
      act('moveToPointer', { speed: 1.2 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 3: Slow wander
    seq('Slow wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.6 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}