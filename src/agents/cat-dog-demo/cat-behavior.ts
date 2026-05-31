/**
 * 🐱 Shy Cat behavior tree for cat-dog demo.
 *
 * Leverages social BT primitives:
 * - isCloseTo / isFarFrom — detect dog proximity
 * - flee — run from dog when too close
 * - mirror — adopt dog's emotion when calm
 * - broadcastEmotion — signal when feeling calm
 *
 * Believable loop:
 * 1. Dog approaches → cat flees (fear)
 * 2. Dog backs off → cat stops fleeing
 * 3. Dog far away → cat warms up, mirrors dog's mood
 * 4. Cat feels calm → broadcasts "calm" signal
 * 5. Dog hears calm → approaches gently
 * 6. Repeat
 */

import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'demo-cat',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.8 },
  tree: sel('Cat Root',
    // Priority 1: Dog is too close → flee in fear
    seq('Flee from dog',
      cond('isCloseTo', { targetId: 'demo-dog', distance: 100 }),
      act('setEmotion', { emotion: 'fear' }),
      act('flee', { targetId: 'demo-dog', speed: 4 }),
      act('drainEnergy', { rate: 0.003 }),
    ),

    // Priority 2: Dog is near but not too close → observe and mirror
    seq('Observe dog',
      cond('isCloseTo', { targetId: 'demo-dog', distance: 200 }),
      act('setEmotion', { emotion: 'curious' }),
      act('mirror', {}),
      act('wander', { speed: 0.5 }),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),

    // Priority 3: Dog is far away → warm up and broadcast calm
    seq('Warm up',
      cond('isFarFrom', { targetId: 'demo-dog', distance: 200 }),
      act('setEmotion', { emotion: 'calm' }),
      act('broadcastEmotion', { emotion: 'calm', radius: 300 }),
      act('wander', { speed: 1 }),
      act('bounceFromEdge', {}),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),

    // Default: idle
    seq('Idle',
      act('setEmotion', { emotion: 'idle' }),
      act('idle', {}),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
