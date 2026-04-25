import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦏 Rhino
 *
 * Powerful territorial guardian. Charges at anything that enters its
 * territory (pointer within 200px), then stands its ground with
 * imposing presence. Slow but unstoppable.
 */
export const behavior: CharacterBehavior = {
  characterId: 'rhino',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Charge at threats
    seq('Charge',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.2 }),
      act('moveToPointer', { speed: 6 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Stand ground when excited
    seq('Stand ground',
      cond('excitementHigh', { threshold: 0.5 }),
      act('setEmotion', { emotion: 'alert' }),
      act('stayStill', { durationMs: 2000 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Priority 3: Slow patrol
    seq('Patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0004 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}
