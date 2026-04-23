import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐘 Elephant
 *
 * Slow, deliberate movements. Trumpets at pointer.
 * Calm demeanor, protective when pointer is near.
 */
export const behavior: CharacterBehavior = {
  characterId: 'elephant',
  tickIntervalMs: 150,
  defaults: { speed: 0.6, energy: 1.0 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.2 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Pointer nearby → trumpet (alert)
    seq('Alert at pointer',
      cond('pointerNearby', { radius: 100 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.04 }),
      act('moveToPointer', { speed: 1.0 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 3: Slow wander
    seq('Slow wander',
      cond('energyAbove', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Stand still
    seq('Stand still',
      act('setEmotion', { emotion: 'idle' }),
      act('idle'),
    ),
  ),
}
