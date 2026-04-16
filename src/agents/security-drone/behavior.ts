import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🚁 Security Drone
 *
 * Aerial surveillance specialist. Constant scanning,
 * methodical patterns, high alert responsiveness.
 */
export const behavior: CharacterBehavior = {
  characterId: 'security-drone',
  tickIntervalMs: 70,
  defaults: { speed: 2.2, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Too tired → return to base
    seq('Recharge when needed',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.4 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Anomaly detected → investigate
    seq('Investigate anomaly',
      cond('pointerNearby', { radius: 350 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.07 }),
      act('moveToPointer', { speed: 3.2 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 3: Systematic patrol
    seq('Systematic patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1.8, efficient: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}