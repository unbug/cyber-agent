import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦢 Heron
 *
 * Patient wading bird. Stands motionless for long periods, then
 * strikes with lightning speed when the pointer enters range.
 * A master of ambush and patience.
 */
export const behavior: CharacterBehavior = {
  characterId: 'heron',
  tickIntervalMs: 120,
  defaults: { speed: 2.5, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Strike when pointer is very close
    seq('Strike',
      cond('pointerNearby', { radius: 60 }),
      act('setEmotion', { emotion: 'aggressive' }),
      act('increaseExcitement', { amount: 0.25 }),
      act('moveToPointer', { speed: 7 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Hold position when pointer is nearby
    seq('Hold position',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'focused' }),
      act('stayStill', { durationMs: 3000 }),
      act('drainEnergy', { rate: 0.0001 }),
    ),
    // Priority 3: Slow patrol — wading gait
    seq('Wade',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.8 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
