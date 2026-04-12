import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦅 Scout Eagle
 *
 * Fast, strategic. Sweeps the entire canvas.
 * Dives toward pointer then pulls away.
 */
export const behavior: CharacterBehavior = {
  characterId: 'scout-eagle',
  tickIntervalMs: 60,
  defaults: { speed: 4, energy: 0.9 },
  tree: sel('Root',
    // Dive attack on pointer
    seq('Reconnaissance dive',
      cond('pointerActive'),
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 5 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Rest when exhausted
    seq('Roost',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Default: wide sweeps
    seq('Aerial sweep',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('patrol', { speed: 3.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}
