import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🤖 Dance Bot
 *
 * Always moving rhythmically. Gets more excited near pointer.
 * Performs when excited.
 */
export const behavior: CharacterBehavior = {
  characterId: 'dance-bot',
  tickIntervalMs: 60,
  defaults: { speed: 3, energy: 1, excitement: 0.3 },
  tree: sel('Root',
    // Performing when excited!
    seq('Perform',
      cond('excitementAbove', { threshold: 0.7 }),
      act('setEmotion', { emotion: 'playful' }),
      act('wander', { speed: 4 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Audience detected → get excited
    seq('Audience hype',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.03 }),
      act('moveToPointer', { speed: 2.5 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Recharge
    seq('Recharge',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Default: freestyle
    seq('Freestyle',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
