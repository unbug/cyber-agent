import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐨 Koala
 *
 * Sleepy companion. Clings to the center (tree), only moves
 * when gently prompted, yawns constantly. Very low energy, very sweet.
 */
export const behavior: CharacterBehavior = {
  characterId: 'koala',
  tickIntervalMs: 130,
  defaults: { speed: 0.6, energy: 0.5 },
  tree: sel('Root',
    // Priority 1: Deep sleep in tree
    seq('Deep sleep',
      cond('energyBelow', { threshold: 0.08 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.1 }),
      act('restoreEnergy', { rate: 0.006 }),
    ),
    // Priority 2: Slowly climb toward pointer
    seq('Slow climb',
      cond('pointerNearby', { radius: 100 }),
      act('setEmotion', { emotion: 'idle' }),
      act('moveToPointer', { speed: 0.8 }),
      act('drainEnergy', { rate: 0.0002 }),
    ),
    // Priority 3: Yawning wander
    seq('Yawning wander',
      act('setEmotion', { emotion: 'sleepy' }),
      act('wander', { speed: 0.4 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.003 }),
    ),
  ),
}
