import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🪼 Manta Ray
 *
 * Sweeps its enormous wings through an invisible ocean. Moves with
 * slow, graceful wing beats that ripple across the canvas. Drawn to
 * pointer like a deep-sea creature to bioluminescence.
 */
export const behavior: CharacterBehavior = {
  characterId: 'manta',
  tickIntervalMs: 150,
  defaults: { speed: 1.0, energy: 0.6 },
  tree: sel('Root',
    // Priority 1: Drift toward pointer (bioluminescence attraction)
    seq('Drift toward light',
      cond('pointerActive'),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.02 }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 2: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.2 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Wing-sweep wander
    seq('Wing-sweep wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.8 }),
      act('restoreEnergy', { rate: 0.0005 }),
    ),
    // Priority 4: Idle sway
    seq('Idle sway',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.0003 }),
    ),
  ),
}
