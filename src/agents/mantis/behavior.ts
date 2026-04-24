import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦗 Mantis
 *
 * Patient warrior. Waits near the pointer, then launches a
 * lightning-fast strike when close enough, before retreating
 * to recover. High precision, high risk.
 */
export const behavior: CharacterBehavior = {
  characterId: 'mantis',
  tickIntervalMs: 90,
  defaults: { speed: 2, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Retreat to rest after striking
    seq('Retreat to rest',
      cond('energyBelow', { threshold: 0.18 }),
      act('setEmotion', { emotion: 'tired' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Strike at pointer when close and energized
    seq('Strike at intruder',
      cond('pointerNearby', { radius: 100 }),
      cond('energyAbove', { threshold: 0.25 }),
      act('setEmotion', { emotion: 'fierce' }),
      act('increaseExcitement', { amount: 0.15 }),
      act('moveToPointer', { speed: 8 }),
      act('drainEnergy', { rate: 0.006 }),
    ),
    // Priority 3: Wait patiently near pointer
    seq('Wait near pointer',
      cond('pointerActive'),
      act('setEmotion', { emotion: 'focused' }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.0005 }),
    ),
    // Priority 4: Wander and observe
    seq('Patrol and observe',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
