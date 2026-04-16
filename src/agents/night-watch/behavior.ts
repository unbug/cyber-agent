import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦉 Night Watch
 *
 * Vigilant nocturnal guardian. Highly alert, stealthy movements,
 * responds strongly to intruders. Security-focused behavior.
 */
export const behavior: CharacterBehavior = {
  characterId: 'night-watch',
  tickIntervalMs: 60,
  defaults: { speed: 1.5, energy: 0.75 },
  tree: sel('Root',
    // Priority 1: Too tired → return to base
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Alert on detection → investigate
    seq('Detect & respond',
      cond('pointerNearby', { radius: 300 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Stealth patrol
    seq('Stealth patrol',
      act('setEmotion', { emotion: 'alert' }),
      act('decayExcitement'),
      act('wander', { speed: 1.2, stealth: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0015 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}