import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦢 Crane
 *
 * An elegant performer that sweeps its wings and performs graceful neck circles.
 * Wings flare when pointer is near, otherwise drifts with slow wing beats.
 */
export const behavior: CharacterBehavior = {
  characterId: 'crane',
  tickIntervalMs: 100,
  defaults: { speed: 1.5, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Wing sweep when pointer nearby
    seq('Wing sweep display',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'excited' }),
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 2.0 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Graceful wing-sweep wander
    seq('Graceful wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 1.2 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Idle drift
    seq('Idle drift',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.0005 }),
    ),
  ),
}
