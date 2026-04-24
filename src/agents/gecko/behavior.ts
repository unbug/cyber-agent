import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦎 Gecko
 *
 * Stealthy edge-climber. Darts along canvas borders, freezes
 * when pointer is nearby, then dashes away in a random direction.
 */
export const behavior: CharacterBehavior = {
  characterId: 'gecko',
  tickIntervalMs: 60,
  defaults: { speed: 3.5, energy: 0.75 },
  tree: sel('Root',
    // Priority 1: Freeze when pointer nearby
    seq('Freeze on sight',
      cond('pointerNearby', { radius: 180 }),
      cond('energyAbove', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'alert' }),
      act('stayStill', { duration: 1500 }),
      act('decayExcitement'),
    ),
    // Priority 2: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.12 }),
      act('setEmotion', { emotion: 'idle' }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 3: Edge patrol with sudden dashes
    seq('Edge patrol',
      cond('energyAbove', { threshold: 0.12 }),
      act('setEmotion', { emotion: 'curious' }),
      act('increaseExcitement', { amount: 0.02 }),
      act('erraticMove', { speed: 4, jitter: 0.3 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Wander
    seq('Wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 2 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
