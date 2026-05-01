import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐦 Curious Bird — Perception-driven character
 *
 * Flies toward detected objects. Sings (spins + plays tone) when alone.
 * Avoids faces (skittish bird). Only makes sense with perception.
 */
export const behavior: CharacterBehavior = {
  characterId: 'curious-bird',
  tickIntervalMs: 80,
  defaults: { speed: 3.0, energy: 0.6 },
  tree: sel('Curious Bird Root',
    // Avoid faces (skittish bird)
    seq('Flee face',
      cond('perceive.face', { within: 3000 }),
      act('setEmotion', { emotion: 'alert' }),
      act('fleeFromPointer', { speed: 4 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Fly toward objects (curious bird)
    seq('Investigate object',
      cond('perceive.object', { within: 2000 }),
      act('setEmotion', { emotion: 'curious' }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Sing when alone (no recent perception)
    seq('Solo song',
      cond('energyAbove', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'playful' }),
      act('spin'),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Rest when energy low
    seq('Rest',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.004 }),
    ),
  ),
}
