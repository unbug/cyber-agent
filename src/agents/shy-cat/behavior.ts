import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🙀 Shy Cat — Perception-driven character
 *
 * Hides when faces are detected nearby. Warms up when alone.
 * Reacts to proximity (runs from close objects).
 * Only makes sense with webcam / proximity perception.
 */
export const behavior: CharacterBehavior = {
  characterId: 'shy-cat',
  tickIntervalMs: 100,
  defaults: { speed: 1.5, energy: 0.8 },
  tree: sel('Shy Cat Root',
    // Hides when a face is detected (within 2 seconds)
    seq('Hide from face',
      cond('perceive.face', { within: 2000 }),
      act('setEmotion', { emotion: 'angry' }),
      act('fleeFromPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Runs from nearby objects (bump / proximity)
    seq('Flee from proximity',
      cond('perceive.near', { distance: 30 }),
      act('setEmotion', { emotion: 'alert' }),
      act('fleeFromPointer', { speed: 2.5 }),
      act('drainEnergy', { rate: 0.0015 }),
    ),
    // Calm when alone — explores gently
    seq('Calm exploration',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Normal shy behavior
    seq('Shy wandering',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.6 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}
