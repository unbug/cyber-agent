import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦊 Fox
 *
 * Clever and playful. Steals the spotlight, investigates new things,
 * and retreats when startled. High curiosity, moderate energy.
 */
export const behavior: CharacterBehavior = {
  characterId: 'fox',
  tickIntervalMs: 90,
  defaults: { speed: 2.8, energy: 0.75 },
  tree: sel('Root',
    // Priority 1: Startled → hide
    seq('Hide when startled',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'scared' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Priority 2: Investigate pointer (steal the show)
    seq('Investigate pointer',
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.0025 }),
    ),
    // Priority 3: Playful mischief
    seq('Playful mischief',
      act('setEmotion', { emotion: 'playful' }),
      act('wander', { speed: 2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),
  ),
}
