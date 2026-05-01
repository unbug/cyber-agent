import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🛡️ Guardian Bot — Perception-driven character
 *
 * Patrols and alerts when detecting faces, proximity events, or bumps.
 * Only makes sense with perception — without sensors, it's just a wanderer.
 */
export const behavior: CharacterBehavior = {
  characterId: 'guardian-bot',
  tickIntervalMs: 80,
  defaults: { speed: 1.2, energy: 1.0 },
  tree: sel('Guardian Root',
    // Alert on face detection — approach cautiously
    seq('Face alert',
      cond('perceive.face', { within: 3000 }),
      act('setEmotion', { emotion: 'alert' }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Alert on proximity — investigate
    seq('Proximity alert',
      cond('perceive.near', { distance: 50 }),
      act('setEmotion', { emotion: 'alert' }),
      act('wander', { speed: 2 }),
      act('drainEnergy', { rate: 0.0015 }),
    ),
    // Bump — investigate and report
    seq('Bump investigation',
      cond('perceive.bump', { within: 5000 }),
      act('setEmotion', { emotion: 'curious' }),
      act('spin'),
      act('setEmotion', { emotion: 'alert' }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Patrol mode — steady wandering
    seq('Patrol',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.8 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0003 }),
      act('restoreEnergy', { rate: 0.0005 }),
    ),
  ),
}
