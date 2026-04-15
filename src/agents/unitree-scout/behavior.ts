import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'unitree-scout',
  tickIntervalMs: 100,
  defaults: {
    speed: 15,
    balance: 85,
    gait: 'walk',
    terrainType: 'flat',
    walkSpeed: 100,
  },
  tree: sel('Root',
    seq('Heartbeat', act('heartbeat')),
    sel('Behaviors',
      seq('MapCheck', cond('shouldMap'), act('terrainScan')),
      seq('AnomalyCheck', cond('anomalyDetected'), act('investigateAnomaly')),
      seq('PatrolHighSpeed', act('walkOnTerrain', { speed: 120 })),
      cond('positioningComplete')
    )
  )
}
