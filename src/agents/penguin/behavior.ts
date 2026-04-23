import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐧 Penguin
 *
 * Waddles around clumsily. Slides on belly when happy.
 * Wobbles near pointer. Loves to follow the cursor.
 */
export const behavior: CharacterBehavior = {
  characterId: 'penguin',
  tickIntervalMs: 110,
  defaults: { speed: 1.2, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Too tired → rest
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Slide toward pointer (belly slide)
    seq('Belly slide to pointer',
      cond('pointerNearby', { radius: 120 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Waddle around
    seq('Waddle around',
      cond('energyAbove', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.8 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Stand still
    seq('Stand still',
      act('setEmotion', { emotion: 'idle' }),
      act('idle'),
    ),
  ),
}
