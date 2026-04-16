import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🌱 Gardener Bot
 *
 * Peaceful plant caretaker. Moves methodically and slowly,
 * nurturing presence, brings calm to surroundings.
 */
export const behavior: CharacterBehavior = {
  characterId: 'gardener-bot',
  tickIntervalMs: 150,
  defaults: { speed: 1, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Too tired → rest peacefully
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Priority 2: Gentle approach to pointer
    seq('Gentle approach',
      cond('pointerNearby', { radius: 150 }),
      act('setEmotion', { emotion: 'happy' }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.0008 }),
    ),
    // Priority 3: Meditative wander
    seq('Meditative wander',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.8, smooth: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}