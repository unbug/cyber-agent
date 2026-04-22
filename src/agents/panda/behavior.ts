import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐼 Panda
 *
 * Slow and deliberate. Eats when hungry, naps often, only moves
 * for food or when gently prompted. Low energy, high comfort.
 */
export const behavior: CharacterBehavior = {
  characterId: 'panda',
  tickIntervalMs: 120,
  defaults: { speed: 0.8, energy: 0.6 },
  tree: sel('Root',
    // Priority 1: Sleep when tired
    seq('Deep sleep',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.2 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Move toward pointer (slowly)
    seq('Slow follow',
      cond('pointerNearby', { radius: 150 }),
      act('setEmotion', { emotion: 'idle' }),
      act('moveToPointer', { speed: 1.2 }),
      act('drainEnergy', { rate: 0.0003 }),
    ),
    // Priority 3: Wander slowly
    seq('Slow wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.6 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
