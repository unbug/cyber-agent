import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐵 Mandrill
 *
 * Expressive social companion. Mimics pointer movements with
 * playful energy, beats chest (increases excitement) when close
 * to pointer, seeks attention and interaction.
 */
export const behavior: CharacterBehavior = {
  characterId: 'mandrill',
  tickIntervalMs: 70,
  defaults: { speed: 3, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Chest beat when pointer very close
    seq('Beat chest',
      cond('isNear', { distance: 60 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.2 }),
      act('stayStill', { duration: 800 }),
      act('decayExcitement'),
    ),
    // Priority 2: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Mimic pointer movement
    seq('Mimic pointer',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 4 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 4: Seek attention wander
    seq('Seek attention',
      act('setEmotion', { emotion: 'playful' }),
      act('erraticMove', { speed: 3, jitter: 0.5 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
