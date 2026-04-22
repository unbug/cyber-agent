import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐺 Wolf
 *
 * Lone guardian. Patrols perimeter methodically, howls at pointer
 * (rapid oscillation), returns to den when tired.
 */
export const behavior: CharacterBehavior = {
  characterId: 'wolf',
  tickIntervalMs: 80,
  defaults: { speed: 2.5, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Return to den
    seq('Return to den',
      cond('energyBelow', { threshold: 0.12 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Howl at pointer
    seq('Howl at pointer',
      cond('pointerNearby', { radius: 300 }),
      act('setEmotion', { emotion: 'focused' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Perimeter patrol
    seq('Perimeter patrol',
      act('setEmotion', { emotion: 'focused' }),
      act('wander', { speed: 2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0006 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
