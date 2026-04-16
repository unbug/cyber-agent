import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 📦 Courier Bot
 *
 * Efficient delivery specialist. Navigates optimally,
 * stays focused on tasks. Productivity-driven behavior.
 */
export const behavior: CharacterBehavior = {
  characterId: 'courier-bot',
  tickIntervalMs: 90,
  defaults: { speed: 2.5, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Too tired → recharge
    seq('Recharge when tired',
      cond('energyBelow', { threshold: 0.25 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Destination nearby → quick delivery
    seq('Deliver quickly',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'happy' }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.0025 }),
    ),
    // Priority 3: Optimal patrol
    seq('Efficient patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 2, efficient: true }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}