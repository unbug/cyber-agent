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
// New agents
import * as fox from './fox'
import * as parrot from './parrot'
import * as panda from './panda'
import * as tiger from './tiger'
import * as jellyfish from './jellyfish'
import * as dragon from './dragon'
import * as rabbit from './rabbit'
import * as wolf from './wolf'
import * as butterfly from './butterfly'
import * as koala from './koala'

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
registerAgent(fox, 'fox')
registerAgent(parrot, 'parrot')
registerAgent(panda, 'panda')
registerAgent(tiger, 'tiger')
registerAgent(jellyfish, 'jellyfish')
registerAgent(dragon, 'dragon')
registerAgent(rabbit, 'rabbit')
registerAgent(wolf, 'wolf')
registerAgent(butterfly, 'butterfly')
registerAgent(koala, 'koala')

const agentList: Array<{ character: Character }> = [
  loyalDog, curiousCat, guardDino, danceBot, zenTurtle,
  scoutEagle, wsDemo, robotHelper,
  unitreeLoyalDog, unitreeScout, unitreeGuardian,
  puppy, oldDog, squirrelHunter, beachCruiser, nightWatch,
  courierBot, gardenerBot, securityDrone, playgroundBuddy,
  fox, parrot, panda, tiger, jellyfish,
  dragon, rabbit, wolf, butterfly, koala
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

/**
 * Save a custom character definition as a JSON file
 */
export function saveCharacterAsJSON(
  name: string,
  description: string,
  tags: string[],
  difficulty: string,
  emoji: string,
  behaviorTree: any
): void {
  const characterData = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    emoji,
    description,
    tags,
    difficulty,
    category: 'custom' as const,
    behaviorTree,
  }

  const blob = new Blob([JSON.stringify(characterData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${characterData.id}-character.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Re-exports ──────────────────────────────────────────────

export type { Character } from './types'
export type { CharacterBehavior, Blackboard, BehaviorNodeDef, NodeStatus, Emotion, RobotAdapter, AdapterCommand, ActionFn, ConditionFn, BTEditionNode } from '../engine/types'
export { cond, act, seq, sel, wait, cooldown, repeat } from './helpers'
