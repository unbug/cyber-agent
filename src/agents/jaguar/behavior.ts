import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐆 Jaguar
 *
 * Stealth guard that patrols the perimeter with growing intensity.
 * Charges at the pointer when excited, but retreats to rest when
 * energy runs low. High-risk, high-reward behavior.
 */
export const behavior: CharacterBehavior = {
  characterId: 'jaguar',
  tickIntervalMs: 80,
  defaults: { speed: 3.5, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Retreat to rest when energy is critical
    seq('Retreat when exhausted',
      cond('energyBelow', { threshold: 0.12 }),
      act('setEmotion', { emotion: 'tired' }),
      act('moveToCenter', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Charge at pointer when excited
    seq('Charge at intruder',
      cond('pointerNearby', { radius: 220 }),
      cond('energyAbove', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'fierce' }),
      act('increaseExcitement', { amount: 0.12 }),
      act('moveToPointer', { speed: 7 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 3: Alert patrol when pointer is visible
    seq('Alert patrol',
      cond('pointerActive'),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.03 }),
      act('moveToPointer', { speed: 4 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 4: Default perimeter patrol
    seq('Perimeter patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('patrol', { speed: 2.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}
