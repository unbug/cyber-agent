import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐢 Zen Turtle
 *
 * Very slow, very peaceful. Barely reacts to pointer.
 * Mostly meditates at center.
 */
export const behavior: CharacterBehavior = {
  characterId: 'zen-turtle',
  tickIntervalMs: 200,
  defaults: { speed: 0.5, energy: 0.6 },
  tree: sel('Root',
    // Meditate when tired
    seq('Meditate',
      cond('energyBelow', { threshold: 0.4 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.2 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Slightly acknowledge pointer
    seq('Notice visitor',
      cond('pointerNearby', { radius: 60 }),
      act('setEmotion', { emotion: 'curious' }),
      act('idle'),
    ),
    // Slow wander
    seq('Gentle wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.3 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
