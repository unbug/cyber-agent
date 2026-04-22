import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦜 Parrot
 *
 * Social performer. Flies toward pointer, mimics actions with
 * quick movements, gets excited by attention, naps when alone.
 */
export const behavior: CharacterBehavior = {
  characterId: 'parrot',
  tickIntervalMs: 70,
  defaults: { speed: 3.5, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Sleep when low energy
    seq('Nap time',
      cond('energyBelow', { threshold: 0.12 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Fly toward pointer (mimic)
    seq('Mimic pointer',
      cond('pointerNearby', { radius: 300 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.1 }),
      act('moveToPointer', { speed: 4.5 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Social wandering
    seq('Social wander',
      act('setEmotion', { emotion: 'playful' }),
      act('wander', { speed: 2.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.0012 }),
    ),
  ),
}
