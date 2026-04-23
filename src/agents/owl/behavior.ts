import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦉 Owl
 *
 * Silent watcher of the night. Patrols in slow, deliberate circles,
 * pauses to observe, and swoops when something interesting appears.
 */
export const behavior: CharacterBehavior = {
  characterId: 'owl',
  tickIntervalMs: 120,
  defaults: { speed: 1.8, energy: 0.85 },
  tree: sel('Root',
    // Priority 1: Swoop at nearby pointer
    seq('Swoop at pointer',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'focused' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 4.0 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Silent patrol
    seq('Silent patrol',
      act('setEmotion', { emotion: 'calm' }),
      act('wander', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
  ),
}
