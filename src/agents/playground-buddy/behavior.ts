import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🎪 Playground Buddy
 *
 * Enthusiastic kid's playmate. High social energy,
 * loves interactive play, teaches new games.
 */
export const behavior: CharacterBehavior = {
  characterId: 'playground-buddy',
  tickIntervalMs: 80,
  defaults: { speed: 2.5, energy: 0.95 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Kids nearby → engage playfully
    seq('Playful interaction',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.07 }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.0025 }),
    ),
    // Priority 3: Search for playmates
    seq('Seek playmates',
      act('setEmotion', { emotion: 'playful' }),
      act('decayExcitement'),
      act('wander', { speed: 2, efficient: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0015 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}