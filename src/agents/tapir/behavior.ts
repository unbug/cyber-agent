import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦓 Tapir
 *
 * Gentle companion that wanders slowly, stops to graze (restore energy),
 * and nuzzles toward the pointer affectionately.
 */
export const behavior: CharacterBehavior = {
  characterId: 'tapir',
  tickIntervalMs: 150,
  defaults: { speed: 1.5, energy: 0.95 },
  tree: sel('Root',
    // Priority 1: Hungry → graze (restore energy)
    seq('Graze',
      cond('energyBelow', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'hungry' }),
      act('stayStill', { duration: 3000 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Pointer nearby → nuzzle toward it
    seq('Nuzzle to pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.02 }),
      act('moveToPointer', { speed: 2 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 3: Slow wander
    seq('Slow wander',
      act('setEmotion', { emotion: 'calm' }),
      act('decayExcitement'),
      act('wander', { speed: 1 }),
      act('pauseRandomly', { minMs: 3000, maxMs: 6000 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
