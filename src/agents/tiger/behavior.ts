import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐯 Tiger
 *
 * Territorial guard. Patrols perimeter aggressively, charges at
 * pointer as if defending territory, rests between patrols.
 */
export const behavior: CharacterBehavior = {
  characterId: 'tiger',
  tickIntervalMs: 85,
  defaults: { speed: 3, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Rest when exhausted
    seq('Rest between patrols',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Charge at pointer (territorial)
    seq('Territorial charge',
      cond('pointerNearby', { radius: 350 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.12 }),
      act('moveToPointer', { speed: 5 }),
      act('drainEnergy', { rate: 0.0035 }),
    ),
    // Priority 3: Patrolling
    seq('Patrol territory',
      act('setEmotion', { emotion: 'focused' }),
      act('wander', { speed: 2.2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
