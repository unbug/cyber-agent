import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐙 Octopus
 *
 * Deep sea wanderer. Drifts with flowing, tentacle-like movements.
 * Sucks in (shrinks) when pointer is too close, then drifts away.
 */
export const behavior: CharacterBehavior = {
  characterId: 'octopus',
  tickIntervalMs: 100,
  defaults: { speed: 1.8, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Pointer too close → suck in and drift away
    seq('Drift away from pointer',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'scared' }),
      act('drainEnergy', { rate: 0.001 }),
      act('moveAwayFromPointer', { speed: 2.5 }),
    ),
    // Priority 2: Gentle wander with flowing motion
    seq('Flowing wander',
      act('setEmotion', { emotion: 'curious' }),
      act('increaseExcitement', { amount: 0.01 }),
      act('erraticMove', { speed: 1.8, jitter: 0.8 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
