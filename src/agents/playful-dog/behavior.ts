import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🐕 Playful Dog — Perception-driven character
 *
 * Chases detected objects. Wagging tail when sounds are heard.
 * Reacts to faces by approaching (friendly dog).
 */
export const behavior: CharacterBehavior = {
  characterId: 'playful-dog',
  tickIntervalMs: 100,
  defaults: { speed: 2.5, energy: 0.9 },
  tree: sel('Playful Dog Root',
    // Chases detected objects
    seq('Chase object',
      cond('perceive.object', { within: 1000 }),
      act('setEmotion', { emotion: 'playful' }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Approaches faces (friendly dog)
    seq('Greet face',
      cond('perceive.face', { within: 2000 }),
      act('setEmotion', { emotion: 'happy' }),
      act('moveToPointer', { speed: 2 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Reacts to sounds — gets excited
    seq('Sound reaction',
      cond('perceive.sound', { type: 'clap', within: 3000 }),
      act('setEmotion', { emotion: 'excited' }),
      act('dance'),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Bump reaction — confused but curious
    seq('Bump reaction',
      cond('perceive.bump', { within: 5000 }),
      act('setEmotion', { emotion: 'curious' }),
      act('spin'),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Low energy — rest
    seq('Rest time',
      cond('energyBelow', { threshold: 0.25 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Default: wander happily
    seq('Happy wandering',
      act('setEmotion', { emotion: 'happy' }),
      act('wander', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}
