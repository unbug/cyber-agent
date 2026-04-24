import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐝 Bee
 *
 * Erratic pollinator. Flits around with sudden bursts of speed,
 * drawn to pointer (like a flower), retreats when tired.
 */
export const behavior: CharacterBehavior = {
  characterId: 'bee',
  tickIntervalMs: 60,
  defaults: { speed: 4, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Too tired → retreat to center
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.12 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 1.5 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Pointer nearby → fly toward it (erratically)
    seq('Fly to pointer',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.12 }),
      act('erraticMove', { target: 'pointer', speed: 5 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Erratic wander
    seq('Erratic wander',
      act('setEmotion', { emotion: 'playful' }),
      act('increaseExcitement', { amount: 0.02 }),
      act('erraticMove', { speed: 4, jitter: 0.6 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
