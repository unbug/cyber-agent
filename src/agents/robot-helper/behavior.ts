import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel, cooldown, wait } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'robot-helper',
  tickIntervalMs: 150,
  defaults: {
    speed: 1.5,
    energy: 0.8,
    emotion: 'happy',
    excitement: 0.3,
  },
  // Robot Helper behavior: focused and methodical movement pattern
  tree: sel('Root',
    // High energy: faster exploration
    cond('highEnergyCheck', { threshold: 0.7 }),
    seq('Active',
      act('forward', { speed: 0.8 }),
      cooldown(5000, cond('cursorDetected')),
      act('turnRandom', { speed: 0.5 }),
      cooldown(3000, cond('wallDetected')),
      act('wander', { speed: 0.6 }),
    ),
    
    // Medium energy: normal patrol
    cond('mediumEnergyCheck', { threshold: 0.4 }),
    seq('Patrol',
      act('forward', { speed: 0.5 }),
      cooldown(4000, cond('nearTarget', { minDistance: 40 })),
      act('turnRandom', { speed: 0.4 }),
      act('wander', { speed: 0.4 }),
    ),
    
    // Low energy: slow movement
    cond('lowEnergyCheck', { threshold: 0.2 }),
    seq('SlowDrift',
      act('forward', { speed: 0.2 }),
      cooldown(6000, cond('idleCheck', { threshold: 0.3 })),
      act('turnRandom', { speed: 0.2 }),
      wait(1500),
    ),
    
    // Idle: rest pattern
    seq('Rest',
      act('idle'),
      wait(2000),
      act('turnRandom', { speed: 0.1 }),
      wait(1000),
    ),
  ),
}
