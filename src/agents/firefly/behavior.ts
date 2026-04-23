import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * ✨ Firefly
 *
 * Floats erratically like a real firefly. Attracted to pointer (light source).
 * Glows brighter when near pointer, dims when far.
 */
export const behavior: CharacterBehavior = {
  characterId: 'firefly',
  tickIntervalMs: 120,
  defaults: { speed: 1.0, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.2 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Attracted to pointer (light)
    seq('Fly toward light',
      cond('pointerActive'),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.03 }),
      act('moveToPointer', { speed: 2 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Erratic floating
    seq('Float erratically',
      cond('random', { chance: 0.3 }),
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.6 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Idle drift
    seq('Idle drift',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.0005 }),
    ),
  ),
}
