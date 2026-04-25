import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🦥 Sloth
 *
 * Moves at a snail's pace. Occasionally pauses to yawn, then resumes
 * its dreamy drift. Energy drains very slowly.
 */
export const behavior: CharacterBehavior = {
  characterId: 'sloth',
  tickIntervalMs: 200,
  defaults: { speed: 0.4, energy: 0.95 },
  tree: sel('Root',
    // Priority 1: Yawn and pause
    seq('Yawn and nap',
      cond('pauseRandomly', { minMs: 3000, maxMs: 8000 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('stayStill', { durationMs: 2000 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Ultra slow wander
    seq('Dreamy drift',
      act('setEmotion', { emotion: 'chill' }),
      act('wander', { speed: 0.3 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0003 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
