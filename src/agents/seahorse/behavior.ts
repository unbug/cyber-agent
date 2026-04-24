import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐴 Seahorse
 *
 * Gentle companion that sways gracefully. Moves with slow,
 * sinusoidal motion, drifts toward pointer affectionately,
 * rests near the center when tired.
 */
export const behavior: CharacterBehavior = {
  characterId: 'seahorse',
  tickIntervalMs: 100,
  defaults: { speed: 1.5, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Nuzzle pointer when nearby
    seq('Nuzzle pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.03 }),
      act('erraticMove', { target: 'pointer', speed: 2, jitter: 0.2 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Graceful sway wander
    seq('Graceful sway',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 1 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
