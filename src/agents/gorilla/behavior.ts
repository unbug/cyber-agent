import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦍 Gorilla
 *
 * A powerful silverback guardian that beats its chest when threats approach
 * and charges with unstoppable force. Territorial and intimidating.
 */
export const behavior: CharacterBehavior = {
  characterId: 'gorilla',
  tickIntervalMs: 80,
  defaults: { speed: 2.0, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Chest beat when pointer nearby (threat display)
    seq('Chest beat display',
      cond('pointerNearby', { radius: 300 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Charge when very close
    seq('Charge at threat',
      cond('pointerVeryNearby', { radius: 100 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.15 }),
      act('moveToPointer', { speed: 6.0 }),
      act('drainEnergy', { rate: 0.008 }),
    ),
    // Priority 3: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 4: Patrol territory
    seq('Territorial patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
