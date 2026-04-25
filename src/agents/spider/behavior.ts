import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🕷️ Spider
 *
 * Stealthy eight-legged guardian. Weaves web-like movement patterns,
 * waits patiently then pounces when prey (pointer) gets too close.
 * Coils and strikes with precision.
 */
export const behavior: CharacterBehavior = {
  characterId: 'spider',
  tickIntervalMs: 80,
  defaults: { speed: 3, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Pounce when pointer is very close
    seq('Pounce',
      cond('pointerNearby', { radius: 80 }),
      act('setEmotion', { emotion: 'aggressive' }),
      act('increaseExcitement', { amount: 0.15 }),
      act('moveToPointer', { speed: 5 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Web weaving pattern when pointer is nearby
    seq('Weave web',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'focused' }),
      act('zigzag', { speed: 2.5, amplitude: 30 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Patient waiting — wander slowly
    seq('Patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
