import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦂 Scorpion
 *
 * Patient desert sentinel. Moves slowly and deliberately,
 * coils when threatened, and delivers a swift strike at intruders.
 */
export const behavior: CharacterBehavior = {
  characterId: 'scorpion',
  tickIntervalMs: 130,
  defaults: { speed: 1.5, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Strike at pointer
    seq('Venom strike',
      cond('pointerNearby', { radius: 150 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.14 }),
      act('moveToPointer', { speed: 4.5 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Slow patrol
    seq('Slow patrol',
      act('setEmotion', { emotion: 'calm' }),
      act('wander', { speed: 1.0 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.0025 }),
    ),
  ),
}
