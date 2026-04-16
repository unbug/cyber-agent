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
import * as unitreeLoyalDog from './unitree-loyal-dog'
import * as unitreeScout from './unitree-scout'
import * as unitreeGuardian from './unitree-guardian'
// New agents
import * as puppy from './puppy'
import * as oldDog from './old-dog'
import * as squirrelHunter from './squirrel-hunter'
import * as beachCruiser from './beach-cruiser'
import * as nightWatch from './night-watch'
import * as courierBot from './courier-bot'
import * as gardenerBot from './gardener-bot'
import * as securityDrone from './security-drone'
import * as playgroundBuddy from './playground-buddy'

// ─── Registry ────────────────────────────────────────────────

const characterMap = new Map<string, Character>()
const behaviorMap = new Map<string, CharacterBehavior>()

// Agent module export types
type AgentWithOnlyCharacter = { character: Character }
type AgentWithBehavior = { character: Character; behavior: CharacterBehavior }

function registerAgent(agent: AgentWithOnlyCharacter | AgentWithBehavior, id: string) {
  characterMap.set(id, agent.character)
  if ('behavior' in agent && agent.behavior) {
    behaviorMap.set(id, agent.behavior)
  }
}

registerAgent(loyalDog, 'loyal-dog')
registerAgent(curiousCat, 'curious-cat')
registerAgent(guardDino, 'guard-dino')
registerAgent(danceBot, 'dance-bot')
registerAgent(zenTurtle, 'zen-turtle')
registerAgent(scoutEagle, 'scout-eagle')
registerAgent(wsDemo, 'ws-demo')
registerAgent(robotHelper, 'robot-helper')
registerAgent(unitreeLoyalDog, 'unitree-loyal-dog')
registerAgent(unitreeScout, 'unitree-scout')
registerAgent(unitreeGuardian, 'unitree-guardian')
registerAgent(puppy, 'puppy')
registerAgent(oldDog, 'old-dog')
registerAgent(squirrelHunter, 'squirrel-hunter')
registerAgent(beachCruiser, 'beach-cruiser')
registerAgent(nightWatch, 'night-watch')
registerAgent(courierBot, 'courier-bot')
registerAgent(gardenerBot, 'gardener-bot')
registerAgent(securityDrone, 'security-drone')
registerAgent(playgroundBuddy, 'playground-buddy')

const agentList: Array<{ character: Character }> = [
  loyalDog, curiousCat, guardDino, danceBot, zenTurtle,
  scoutEagle, wsDemo, robotHelper,
  unitreeLoyalDog, unitreeScout, unitreeGuardian,
  puppy, oldDog, squirrelHunter, beachCruiser, nightWatch,
  courierBot, gardenerBot, securityDrone, playgroundBuddy
]

// ─── Public API ──────────────────────────────────────────────

export const characters: Character[] = agentList.map((a) => a.character)

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

// ─── Re-exports ──────────────────────────────────────────────

export type { Character } from './types'
export type { CharacterBehavior, Blackboard, BehaviorNodeDef, NodeStatus, Emotion, RobotAdapter, AdapterCommand, ActionFn, ConditionFn } from '../engine/types'
export { cond, act, seq, sel, wait, cooldown, repeat } from './helpers'
