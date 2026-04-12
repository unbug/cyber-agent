/**
 * 角色注册表
 * Character Registry
 */
import { dogCharacter } from './data/dog';
import { catCharacter } from './data/cat';
import type { BehaviorTree } from '@/lib/behaviorTree/types';

/**
 * 所有可用角色
 */
export const availableCharacters = [dogCharacter, catCharacter];

/**
 * 获取指定 ID 的角色
 */
export function getCharacter(characterId: string) {
  return availableCharacters.find((c) => c.id === characterId);
}

/**
 * 获取所有角色
 */
export function getAllCharacters() {
  return availableCharacters;
}

/**
 * 按标签筛选角色
 */
export function filterCharactersByTag(tag: string) {
  return availableCharacters.filter((c) => c.tags.includes(tag));
}

// Placeholder behavior trees
const placeholderDogTree: BehaviorTree = {
  id: 'dog-v1',
  name: '小狗日常行为',
  description: '让小狗表现得像一只真实的狗狗',
  version: '1.0.0',
  root: {
    id: 'root',
    type: 'root',
    name: '每日活动',
    children: []
  }
};

const placeholderCatTree: BehaviorTree = {
  id: 'cat-v1',
  name: '小猫日常行为',
  description: '让小猫表现得像一只独立优雅的小猫',
  version: '1.0.0',
  root: {
    id: 'root',
    type: 'root',
    name: '猫咪的日常',
    children: []
  }
};

/**
 * 所有行为树定义
 */
export const behaviorTrees: Record<string, BehaviorTree> = {
  'dog-v1': placeholderDogTree,
  'cat-v1': placeholderCatTree
};

/**
 * 获取指定 ID 的行为树
 */
export function getBehaviorTree(treeId: string) {
  return behaviorTrees[treeId] ?? null;
}

/**
 * 注册新角色
 */
export function registerCharacter(
  character: typeof availableCharacters[0] & { behaviorTree?: BehaviorTree }
): void {
  availableCharacters.push(character);
  if (character.behaviorTree) {
    behaviorTrees[character.behaviorTree.id] = character.behaviorTree;
  }
}

/**
 * 角色类型
 */
export type Character = typeof dogCharacter;
