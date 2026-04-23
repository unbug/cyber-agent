import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🔥 Phoenix
 *
 * Dramatic performer. Rises, circles, bursts into flame.
 * High energy drain when excited. Restores energy by resting.
 */
export const behavior: CharacterBehavior = {
  characterId: 'phoenix',
  tickIntervalMs: 90,
  defaults: { speed: 2.0, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Too tired → rest (rebirth cycle)
    seq('Rebirth cycle',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.008 }),
    ),
    // Priority 2: Pointer nearby → dramatic flight
    seq('Dramatic flight',
      cond('pointerNearby', { radius: 200 }),
      cond('energyAbove', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.1 }),
      act('orbit', { radius: 50 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Ascend and circle
    seq('Ascend',
      cond('excitementAbove', { threshold: 0.4 }),
      act('setEmotion', { emotion: 'proud' }),
      act('wander', { speed: 2.5 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 4: Idle hover
    seq('Idle hover',
      cond('energyAbove', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1.0 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
