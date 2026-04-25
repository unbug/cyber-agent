import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦄 Narwhal
 *
 * Glides slowly through the canvas as if swimming through water.
 * Horn emits a soft glow when excited. Bobs up and down gently.
 */
export const behavior: CharacterBehavior = {
  characterId: 'narwhal',
  tickIntervalMs: 100,
  defaults: { speed: 1.2, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Glow when excited
    seq('Glow and bob',
      cond('excitementHigh', { threshold: 0.6 }),
      act('setEmotion', { emotion: 'happy' }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.0015 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Priority 2: Gentle glide
    seq('Oceanic drift',
      act('setEmotion', { emotion: 'serene' }),
      act('wander', { speed: 1.0 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
