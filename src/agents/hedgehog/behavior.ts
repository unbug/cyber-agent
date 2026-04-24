import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦔 Hedgehog
 *
 * Shy explorer that curls into a ball when startled (pointer too close),
 * then cautiously approaches when safe.
 */
export const behavior: CharacterBehavior = {
  characterId: 'hedgehog',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Pointers too close → curl up
    seq('Curl when scared',
      cond('pointerNearby', { radius: 120 }),
      act('setEmotion', { emotion: 'scared' }),
      act('stayStill', { duration: 2000 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 2: Safe → approach pointer cautiously
    seq('Approach cautiously',
      cond('pointerFarAway', { radius: 120 }),
      act('setEmotion', { emotion: 'curious' }),
      act('increaseExcitement', { amount: 0.03 }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Wander slowly
    seq('Slow wander',
      act('setEmotion', { emotion: 'calm' }),
      act('decayExcitement'),
      act('wander', { speed: 1 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.003 }),
    ),
  ),
}
