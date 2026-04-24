import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel, wait, cooldown } from '../helpers'

/**
 * 🦎 Chameleon
 *
 * Slow, deliberate explorer. Wanders with a calm gaze, pauses
 * to observe the pointer, and shifts its "color" (emotion) based
 * on proximity and excitement level.
 */
export const behavior: CharacterBehavior = {
  characterId: 'chameleon',
  tickIntervalMs: 120,
  defaults: { speed: 1.5, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Observe pointer closely
    seq('Observe pointer',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'focused' }),
      act('increaseExcitement', { amount: 0.04 }),
      act('moveToPointer', { speed: 2 }),
      act('drainEnergy', { rate: 0.0015 }),
    ),
    // Priority 3: Wander slowly and observe surroundings
    seq('Slow wander',
      act('setEmotion', { emotion: 'curious' }),
      act('decayExcitement'),
      act('wander', { speed: 1.2 }),
      act('bounceFromEdge'),
      // Pause to observe every so often
      cooldown(3000,
        seq('Pause and observe',
          act('setEmotion', { emotion: 'focused' }),
          wait(500),
          act('setEmotion', { emotion: 'curious' }),
        ),
      ),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
