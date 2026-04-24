import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel, cooldown } from '../helpers'

/**
 * 🐬 Dolphin
 *
 * Playful and fast. Darts in zigzag patterns, circles the pointer
 * with joyful energy, and bursts into speed when excited.
 */
export const behavior: CharacterBehavior = {
  characterId: 'dolphin',
  tickIntervalMs: 80,
  defaults: { speed: 3.5, energy: 0.75 },
  tree: sel('Root',
    // Priority 1: Rest when exhausted
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Circle pointer playfully
    seq('Circle pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.1 }),
      act('moveToPointer', { speed: 5 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Zigzag patrol
    seq('Zigzag patrol',
      act('setEmotion', { emotion: 'playful' }),
      act('decayExcitement'),
      act('wander', { speed: 3 }),
      act('bounceFromEdge'),
      // Playful burst every so often
      cooldown(2500,
        seq('Speed burst',
          act('setEmotion', { emotion: 'happy' }),
          act('moveToPointer', { speed: 6 }),
          act('drainEnergy', { rate: 0.003 }),
        ),
      ),
      act('drainEnergy', { rate: 0.0015 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
