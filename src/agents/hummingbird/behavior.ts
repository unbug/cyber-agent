import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐦 Hummingbird
 *
 * Tiny but wildly energetic. Darts around the canvas, hovers near the pointer,
 * and performs rapid zigzag movements. High energy, short attention span.
 */
export const behavior: CharacterBehavior = {
  characterId: 'hummingbird',
  tickIntervalMs: 60,
  defaults: { speed: 4.5, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Hover near pointer
    seq('Hover near pointer',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.1 }),
      act('moveToPointer', { speed: 5.5 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Rapid zigzag wander
    seq('Zigzag wander',
      act('setEmotion', { emotion: 'excited' }),
      act('wander', { speed: 4.0 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.003 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
