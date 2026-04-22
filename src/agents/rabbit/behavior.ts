import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐰 Rabbit
 *
 * Quick and skittish. Hops toward pointer eagerly, freezes
 * when startled, bounces away at edges. High speed, low stamina.
 */
export const behavior: CharacterBehavior = {
  characterId: 'rabbit',
  tickIntervalMs: 65,
  defaults: { speed: 4.5, energy: 0.5 },
  tree: sel('Root',
    // Priority 1: Rest when exhausted
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.08 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Hop toward pointer
    seq('Hop to pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.07 }),
      act('moveToPointer', { speed: 5.5 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Quick hopping
    seq('Quick hop',
      act('setEmotion', { emotion: 'playful' }),
      act('wander', { speed: 3.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0015 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
