/**
 * 🐶 Playful Dog behavior tree for cat-dog demo.
 *
 * Leverages social BT primitives:
 * - findNearestAgent — find the cat
 * - isCloseTo / isFarFrom — gauge distance
 * - greet — approach and greet when close
 * - emitSignal — broadcast friendly intent
 * - broadcastEmotion — share happy emotion
 *
 * Believable loop:
 * 1. Seek out cat (wander until found)
 * 2. Cat near → greet playfully
 * 3. Cat flees → back off, broadcast calm
 * 4. Cat far → approach gently with calm signal
 * 5. Cat calm → approach more boldly
 * 6. Repeat
 */

import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'demo-dog',
  tickIntervalMs: 100,
  defaults: { speed: 2.5, energy: 0.9 },
  tree: sel('Dog Root',
    // Priority 1: Cat is fleeing → back off gently
    seq('Back off from fleeing cat',
      cond('agentHasEmotion', { targetId: 'demo-cat', emotion: 'fear' }),
      act('setEmotion', { emotion: 'concerned' }),
      act('isFarFrom', { targetId: 'demo-cat', distance: 150 }),
      act('emitSignal', { topic: 'calm', payload: { intensity: 0.5 } }),
      act('wander', { speed: 0.3 }),
      act('drainEnergy', { rate: 0.0005 }),
    ),

    // Priority 2: Cat is calm → approach playfully
    seq('Approach calm cat',
      cond('agentHasEmotion', { targetId: 'demo-cat', emotion: 'calm' }),
      cond('isFarFrom', { targetId: 'demo-cat', distance: 100 }),
      act('setEmotion', { emotion: 'happy' }),
      act('findNearestAgent', { targetId: 'demo-cat', maxRadius: 500 }),
      act('moveToPointer', { speed: 2 }),
      act('broadcastEmotion', { emotion: 'happy', radius: 200 }),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),

    // Priority 3: Cat is curious → greet playfully
    seq('Greet curious cat',
      cond('agentHasEmotion', { targetId: 'demo-cat', emotion: 'curious' }),
      cond('isCloseTo', { targetId: 'demo-cat', distance: 150 }),
      act('setEmotion', { emotion: 'playful' }),
      act('findNearestAgent', { targetId: 'demo-cat', maxRadius: 200 }),
      act('greet', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),

    // Priority 4: Cat near but not curious → try to engage
    seq('Engage nearby cat',
      cond('isCloseTo', { targetId: 'demo-cat', distance: 200 }),
      cond('isFarFrom', { targetId: 'demo-cat', distance: 80 }),
      act('setEmotion', { emotion: 'playful' }),
      act('findNearestAgent', { targetId: 'demo-cat', maxRadius: 300 }),
      act('moveToPointer', { speed: 1.5 }),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),

    // Priority 5: Cat far → seek and wander
    seq('Seek and wander',
      cond('isFarFrom', { targetId: 'demo-cat', distance: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('wander', { speed: 1.5 }),
      act('bounceFromEdge', {}),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.0015 }),
    ),

    // Default: idle
    seq('Idle',
      act('setEmotion', { emotion: 'idle' }),
      act('idle', {}),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}
