import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦁 Lion
 *
 * Majestic territorial guardian. Patrols in wide arcs,
 * charges at pointer when alerted, rests between patrols.
 */
export const behavior: CharacterBehavior = {
  characterId: 'lion',
  tickIntervalMs: 80,
  defaults: { speed: 3, energy: 0.9 },
  tree: sel('Root',
    // Priority 1: Rest when tired
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'idle' }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Alert → charge at pointer
    seq('Charge at threat',
      cond('pointerNearby', { radius: 150 }),
      cond('energyAbove', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.15 }),
      act('erraticMove', { target: 'pointer', speed: 6, jitter: 0.1 }),
      act('drainEnergy', { rate: 0.005 }),
    ),
    // Priority 3: Patrol territory
    seq('Territorial patrol',
      cond('energyAbove', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'idle' }),
      act('patrol', { speed: 2.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
    // Priority 4: Idle wander
    seq('Idle wander',
      act('setEmotion', { emotion: 'happy' }),
      act('wander', { speed: 1.5 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
