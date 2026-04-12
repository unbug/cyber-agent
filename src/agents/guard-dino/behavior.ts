import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦖 Guard Dino
 *
 * Patrols the perimeter. Goes alert when pointer enters.
 * Charges toward intruders.
 */
export const behavior: CharacterBehavior = {
  characterId: 'guard-dino',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.9 },
  tree: sel('Root',
    // ALERT: Intruder detected!
    seq('Intercept intruder',
      cond('pointerActive'),
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Tired → rest at center
    seq('Rest',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Default: patrol
    seq('Patrol perimeter',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('patrol', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.0005 }),
    ),
  ),
}
