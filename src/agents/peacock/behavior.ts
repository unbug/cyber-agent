import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦚 Peacock
 *
 * Struts around showing off. Fans tail when excited.
 * Drains energy during display, restores when idle.
 */
export const behavior: CharacterBehavior = {
  characterId: 'peacock',
  tickIntervalMs: 100,
  defaults: { speed: 1.5, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Pointer nearby → show off dramatically
    seq('Show off near pointer',
      cond('pointerNearby', { radius: 150 }),
      cond('energyAbove', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('orbit', { radius: 40 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Strut around proudly
    seq('Strut around',
      cond('excitementAbove', { threshold: 0.5 }),
      act('setEmotion', { emotion: 'proud' }),
      act('wander', { speed: 1.8 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Idle wander
    seq('Idle wander',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.8 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
