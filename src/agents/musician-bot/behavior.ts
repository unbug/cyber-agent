import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * 🎵 Musician Bot — Perception-driven character
 *
 * Dances when hearing sounds. Sings (spins + plays tone) when alone.
 * Only makes sense with microphone perception.
 */
export const behavior: CharacterBehavior = {
  characterId: 'musician-bot',
  tickIntervalMs: 100,
  defaults: { speed: 1.0, energy: 0.7 },
  tree: sel('Musician Root',
    // Dance on clap detection
    seq('Dance on clap',
      cond('perceive.sound', { type: 'clap', within: 5000 }),
      act('setEmotion', { emotion: 'happy' }),
      act('dance'),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // React to voice sounds
    seq('React to voice',
      cond('perceive.sound', { type: 'voice', within: 5000 }),
      act('setEmotion', { emotion: 'playful' }),
      act('spin'),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Sing when no recent sounds (singing into the void)
    seq('Solo singing',
      cond('energyAbove', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'playful' }),
      act('spin'),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Rest when energy low
    seq('Rest',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.003 }),
    ),
  ),
}
