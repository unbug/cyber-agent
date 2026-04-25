import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐋 Whale
 *
 * Majestic deep-sea drifter. Moves with slow, sweeping arcs,
 * occasionally "singing" (emitting pulse bursts) when excited.
 * Drawn to the pointer like a gentle giant seeking connection.
 */
export const behavior: CharacterBehavior = {
  characterId: 'whale',
  tickIntervalMs: 150,
  defaults: { speed: 1.5, energy: 0.95 },
  tree: sel('Root',
    // Priority 1: Sing when excited
    seq('Sing',
      cond('excitementHigh', { threshold: 0.6 }),
      act('setEmotion', { emotion: 'joyful' }),
      act('pulse', { speed: 0.5, durationMs: 500 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 2: Swell toward pointer gently
    seq('Approach',
      cond('pointerFarAway', { distance: 150 }),
      act('setEmotion', { emotion: 'curious' }),
      act('increaseExcitement', { amount: 0.04 }),
      act('moveToPointer', { speed: 2 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 3: Graceful drift — sweeping arcs
    seq('Drift',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1.2, arc: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0003 }),
      act('restoreEnergy', { rate: 0.0012 }),
    ),
  ),
}
