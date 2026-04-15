import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'unitree-guardian',
  tickIntervalMs: 100,
  defaults: {
    speed: 10,
    balance: 80,
    gait: 'walk',
    terrainType: 'flat',
    walkSpeed: 80,
  },
  tree: sel('Root',
    seq('Heartbeat', act('heartbeat')),
    sel('Behaviors',
      cond('isAlerted'),
      seq('RespondToIntruder', cond('balanceStable'), act('respondToIntruder')),
      seq('PatrolTerritory', cond('notAlerted'), act('patrolTerritory', { mode: 'secure' }))
    )
  )
}
