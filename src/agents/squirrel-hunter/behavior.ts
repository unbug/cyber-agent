import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦫 Squirrel Hunter
 *
 * Hyper-focused predator. Instantly detects movement and pursues
 * with high speed. Always alert to potential targets.
 */
export const behavior: CharacterBehavior = {
  characterId: 'squirrel-hunter',
  tickIntervalMs: 50,
  defaults: { speed: 3.5, energy: 0.7 },
  tree: sel('Root',
    // Priority 1: Too tired → sleep
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Target spotted → pursue aggressively
    seq('Pursue target',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'angry' }),
      act('increaseExcitement', { amount: 0.1 }),
      act('moveToPointer', { speed: 5 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 3: Scan environment
    seq('Scan & patrol',
      act('setEmotion', { emotion: 'alert' }),
      act('wander', { speed: 2.2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}