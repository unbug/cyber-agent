import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🪼 Jellyfish
 *
 * Slow, graceful drift. Pulses with light when curious,
 * drifts toward pointer like magnetized, rests in dark corners.
 */
export const behavior: CharacterBehavior = {
  characterId: 'jellyfish',
  tickIntervalMs: 150,
  defaults: { speed: 1, energy: 0.95 },
  tree: sel('Root',
    // Priority 1: Rest in dark corner
    seq('Rest in darkness',
      cond('energyBelow', { threshold: 0.08 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.15 }),
      act('restoreEnergy', { rate: 0.006 }),
    ),
    // Priority 2: Drift toward pointer
    seq('Magnetized drift',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.04 }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.0005 }),
    ),
    // Priority 3: Ethereal wandering
    seq('Ethereal drift',
      act('setEmotion', { emotion: 'dreamy' }),
      act('wander', { speed: 0.8 }),
      act('bounceFromEdge'),
      act('restoreEnergy', { rate: 0.003 }),
    ),
  ),
}
