import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'unitree-loyal-dog',
  tickIntervalMs: 100,
  defaults: {
    balance: 80,
    gait: 'walk',
    terrainType: 'flat',
    walkSpeed: 100,
  },
  tree: sel('Root',
    seq('Heartbeat', act('heartbeat')),
    sel('Behaviors',
      seq('EnergyCheck', cond('energyLow'), act('restAndRecharge')),
      seq('TerrainCheck', cond('onRoughTerrain'), act('walkOnTerrain', { speed: 50 })),
      seq('FollowWithBalance', act('followWithBalanceCheck')),
      cond('balanceCritical'),
      act('adaptToTerrain')
    )
  )
}
