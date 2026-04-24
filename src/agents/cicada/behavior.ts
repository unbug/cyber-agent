import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🪲 Cicada
 *
 * Persistent buzzer. Flits erratically toward bright spots (pointer),
 * rests periodically, then resumes its relentless buzzing flight.
 */
export const behavior: CharacterBehavior = {
  characterId: 'cicada',
  tickIntervalMs: 40,
  defaults: { speed: 5, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Rest when exhausted
    seq('Rest when exhausted',
      cond('energyBelow', { threshold: 0.08 }),
      act('setEmotion', { emotion: 'idle' }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.006 }),
    ),
    // Priority 2: Pointer nearby → fly toward it
    seq('Buzz toward light',
      cond('pointerNearby', { radius: 300 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('erraticMove', { target: 'pointer', speed: 7, jitter: 0.8 }),
      act('drainEnergy', { rate: 0.006 }),
    ),
    // Priority 3: Erratic buzzing wander
    seq('Erratic buzzing',
      act('setEmotion', { emotion: 'playful' }),
      act('erraticMove', { speed: 6, jitter: 1.0 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.003 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
