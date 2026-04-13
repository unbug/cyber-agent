/**
 * CyberAgent — Agent Registry
 *
 * Central module that aggregates all agents. Each agent lives in its own
 * directory with a character definition (data) and behavior tree (logic).
 */

import type { Character } from './types'
import type { CharacterBehavior } from '../engine/types'

// ─── Import all agents ────────────────────────────────────────

import * as loyalDog from './loyal-dog'
import * as curiousCat from './curious-cat'
import * as guardDino from './guard-dino'
import * as danceBot from './dance-bot'
import * as zenTurtle from './zen-turtle'
import * as scoutEagle from './scout-eagle'
import * as wsDemo from './ws-demo'
import * as robotHelper from './robot-helper'

// ─── Registry ─────────────────────────────────────────────────

const agents = [loyalDog, curiousCat, guardDino, danceBot, zenTurtle, scoutEagle, wsDemo, robotHelper]

const characterMap = new Map<string, Character>(
  agents.map((a) => [a.character.id, a.character]),
)

const behaviorMap = new Map<string, CharacterBehavior>(
  agents.map((a) => [a.behavior.characterId, a.behavior]),
)

// ─── Public API ───────────────────────────────────────────────

export const characters: Character[] = agents.map((a) => a.character)

export function getCharacter(id: string): Character | undefined {
  return characterMap.get(id)
}

export function getCharactersByCategory(category: Character['category']): Character[] {
  return characters.filter((c) => c.category === category)
}

export function getBehavior(characterId: string): CharacterBehavior | undefined {
  return behaviorMap.get(characterId)
}

export function getAllBehaviors(): CharacterBehavior[] {
  return Array.from(behaviorMap.values())
}

// ─── Re-exports ───────────────────────────────────────────────

export type { Character } from './types'
export type { CharacterBehavior, Blackboard, BehaviorNodeDef, NodeStatus, Emotion, RobotAdapter, AdapterCommand, ActionFn, ConditionFn } from '../engine/types'
export { cond, act, seq, sel, wait, cooldown, repeat } from './helpers'
