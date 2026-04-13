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
    cond('energyAbove', { threshold: 0.7 }),
    seq('Active',
      act('wander', { speed: 0.8 }),
      cooldown(5000, cond('pointerNearby')),
      act('moveToCenter', { speed: 0.5 }),
      cooldown(3000, cond('nearEdge', { margin: 30 })),
      act('wander', { speed: 0.6 }),
    ),
    
    // Medium energy: normal patrol
    cond('energyAbove', { threshold: 0.4 }),
    seq('Patrol',
      act('patrol', { speed: 0.5 }),
      cooldown(4000, cond('tickModulo', { mod: 10 })),
      act('patrol', { speed: 0.4 }),
      act('wander', { speed: 0.4 }),
    ),
    
    // Low energy: slow movement
    cond('energyBelow', { threshold: 0.2 }),
    seq('SlowDrift',
      act('moveToCenter', { speed: 0.2 }),
      cooldown(6000, cond('energyBelow', { threshold: 0.3 })),
      act('wander', { speed: 0.2 }),
      wait(1500),
    ),
    
    // Idle: rest pattern
    seq('Rest',
      act('idle'),
      wait(2000),
      act('wander', { speed: 0.1 }),
      wait(1000),
    ),
  ),
}
