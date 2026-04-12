/**
 * Character Behavior Definitions
 *
 * Each character has a unique behavior tree that defines its personality
 * in terms of decisions and actions. These are pure data — no imports
 * needed, fully serializable to JSON.
 */

import type { CharacterBehavior, BehaviorNodeDef } from './types'

// ─── Helper: shorten common patterns ──────────────────────────

const cond = (check: string, args?: Record<string, unknown>): BehaviorNodeDef =>
  ({ type: 'condition', check, args })

const act = (action: string, args?: Record<string, unknown>): BehaviorNodeDef =>
  ({ type: 'action', action, args })

const seq = (name: string, ...children: BehaviorNodeDef[]): BehaviorNodeDef =>
  ({ type: 'sequence', name, children })

const sel = (name: string, ...children: BehaviorNodeDef[]): BehaviorNodeDef =>
  ({ type: 'selector', name, children })

const _wait = (ms: number): BehaviorNodeDef =>
  ({ type: 'wait', durationMs: ms })

const _cooldown = (ms: number, child: BehaviorNodeDef): BehaviorNodeDef =>
  ({ type: 'cooldown', durationMs: ms, child })

const _repeat = (count: number, child: BehaviorNodeDef): BehaviorNodeDef =>
  ({ type: 'repeater', count, child })

// Re-export for future use
export { _wait as wait, _cooldown as cooldown, _repeat as repeat }

// ═══════════════════════════════════════════════════════════════
//  🐕 Loyal Dog
// ═══════════════════════════════════════════════════════════════
//  Behavior: Follows pointer eagerly, wanders when bored,
//  gets happy near pointer, drains energy, rests when tired

const loyalDog: CharacterBehavior = {
  characterId: 'loyal-dog',
  tickIntervalMs: 80,
  defaults: { speed: 2.5, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Too tired → sleep
    seq('Rest when tired',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Priority 2: Pointer nearby → follow excitedly
    seq('Follow pointer',
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.05 }),
      act('moveToPointer', { speed: 3 }),
      act('drainEnergy', { rate: 0.002 }),
    ),
    // Priority 3: Wander around
    seq('Wander',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 1.2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}

// ═══════════════════════════════════════════════════════════════
//  🐈 Curious Cat
// ═══════════════════════════════════════════════════════════════
//  Behavior: Independent. Approaches pointer cautiously, then
//  ignores it. Explores corners. Naps frequently.

const curiousCat: CharacterBehavior = {
  characterId: 'curious-cat',
  tickIntervalMs: 120,
  defaults: { speed: 1.8, energy: 0.7 },
  tree: sel('Root',
    // Sleepy cat naps a lot
    seq('Nap time',
      cond('energyBelow', { threshold: 0.3 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Occasionally curious about pointer
    seq('Investigate pointer',
      cond('pointerNearby', { radius: 120 }),
      cond('random', { chance: 0.3 }),
      act('setEmotion', { emotion: 'curious' }),
      act('moveToPointer', { speed: 1 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Ignore pointer and be independent
    seq('Independent exploration',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 0.8 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0003 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}

// ═══════════════════════════════════════════════════════════════
//  🦖 Guard Dino
// ═══════════════════════════════════════════════════════════════
//  Behavior: Patrols the perimeter. Goes alert when pointer
//  enters. Charges toward intruders.

const guardDino: CharacterBehavior = {
  characterId: 'guard-dino',
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.9 },
  tree: sel('Root',
    // ALERT: Intruder detected!
    seq('Intercept intruder',
      cond('pointerActive'),
      cond('pointerNearby', { radius: 250 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.08 }),
      act('moveToPointer', { speed: 3.5 }),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Tired → rest at center
    seq('Rest',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.003 }),
    ),
    // Default: patrol
    seq('Patrol perimeter',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('patrol', { speed: 1.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0008 }),
      act('restoreEnergy', { rate: 0.0005 }),
    ),
  ),
}

// ═══════════════════════════════════════════════════════════════
//  🤖 Dance Bot
// ═══════════════════════════════════════════════════════════════
//  Behavior: Always moving rhythmically. Gets more excited
//  near pointer. Performs when excited.

const danceBot: CharacterBehavior = {
  characterId: 'dance-bot',
  tickIntervalMs: 60,
  defaults: { speed: 3, energy: 1, excitement: 0.3 },
  tree: sel('Root',
    // Performing when excited!
    seq('Perform',
      cond('excitementAbove', { threshold: 0.7 }),
      act('setEmotion', { emotion: 'playful' }),
      act('wander', { speed: 4 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.003 }),
    ),
    // Audience detected → get excited
    seq('Audience hype',
      cond('pointerNearby', { radius: 180 }),
      act('setEmotion', { emotion: 'happy' }),
      act('increaseExcitement', { amount: 0.03 }),
      act('moveToPointer', { speed: 2.5 }),
      act('drainEnergy', { rate: 0.001 }),
    ),
    // Recharge
    seq('Recharge',
      cond('energyBelow', { threshold: 0.1 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.5 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Default: freestyle
    seq('Freestyle',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('wander', { speed: 2 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}

// ═══════════════════════════════════════════════════════════════
//  🐢 Zen Turtle
// ═══════════════════════════════════════════════════════════════
//  Behavior: Very slow, very peaceful. Barely reacts to pointer.
//  Mostly meditates at center.

const zenTurtle: CharacterBehavior = {
  characterId: 'zen-turtle',
  tickIntervalMs: 200,
  defaults: { speed: 0.5, energy: 0.6 },
  tree: sel('Root',
    // Meditate when tired
    seq('Meditate',
      cond('energyBelow', { threshold: 0.4 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.2 }),
      act('restoreEnergy', { rate: 0.002 }),
    ),
    // Slightly acknowledge pointer
    seq('Notice visitor',
      cond('pointerNearby', { radius: 60 }),
      act('setEmotion', { emotion: 'curious' }),
      act('idle'),
    ),
    // Slow wander
    seq('Gentle wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 0.3 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.0002 }),
      act('restoreEnergy', { rate: 0.001 }),
    ),
  ),
}

// ═══════════════════════════════════════════════════════════════
//  🦅 Scout Eagle
// ═══════════════════════════════════════════════════════════════
//  Behavior: Fast, strategic. Sweeps the entire canvas.
//  Dives toward pointer then pulls away.

const scoutEagle: CharacterBehavior = {
  characterId: 'scout-eagle',
  tickIntervalMs: 60,
  defaults: { speed: 4, energy: 0.9 },
  tree: sel('Root',
    // Dive attack on pointer
    seq('Reconnaissance dive',
      cond('pointerActive'),
      cond('pointerNearby', { radius: 200 }),
      act('setEmotion', { emotion: 'alert' }),
      act('increaseExcitement', { amount: 0.06 }),
      act('moveToPointer', { speed: 5 }),
      act('drainEnergy', { rate: 0.004 }),
    ),
    // Rest when exhausted
    seq('Roost',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 1 }),
      act('restoreEnergy', { rate: 0.004 }),
    ),
    // Default: wide sweeps
    seq('Aerial sweep',
      act('setEmotion', { emotion: 'idle' }),
      act('decayExcitement'),
      act('patrol', { speed: 3.5 }),
      act('bounceFromEdge'),
      act('drainEnergy', { rate: 0.001 }),
      act('restoreEnergy', { rate: 0.0008 }),
    ),
  ),
}

// ─── Registry ─────────────────────────────────────────────────

const behaviorMap = new Map<string, CharacterBehavior>([
  ['loyal-dog', loyalDog],
  ['curious-cat', curiousCat],
  ['guard-dino', guardDino],
  ['dance-bot', danceBot],
  ['zen-turtle', zenTurtle],
  ['scout-eagle', scoutEagle],
])

export function getBehavior(characterId: string): CharacterBehavior | undefined {
  return behaviorMap.get(characterId)
}

export function getAllBehaviors(): CharacterBehavior[] {
  return Array.from(behaviorMap.values())
}
