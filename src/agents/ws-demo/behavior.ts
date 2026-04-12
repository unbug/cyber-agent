import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'ws-demo',
  tickIntervalMs: 100,
  defaults: { speed: 3, energy: 0.8, excitement: 0.5 },
  tree: sel('Root',
    seq('Follow Pointer',
      cond('pointerActive'),
      act('moveToPointer', { speed: 4 })
    ),
    seq('Patrol',
      cond('energyAbove', { threshold: 0.2 }),
      act('patrol')
    ),
    seq('Wander',
      act('wander')
    )
  ),
}
