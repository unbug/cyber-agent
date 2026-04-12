/**
 * 小猫角色行为树
 * Cat Character Behavior Tree
 */
import { BehaviorTree } from '@/lib/behaviorTree/types';

export const catBehaviorTree: BehaviorTree = {
  id: 'cat-v1',
  name: '小猫日常行为',
  description: '让小猫表现得像一只独立优雅的小猫：探索、打盹、撒娇、玩耍',
  version: '1.0.0',
  createdAt: '2026-04-12T00:00:00Z',
  updatedAt: '2026-04-12T00:00:00Z',
  root: {
    id: 'root',
    type: 'root',
    name: '猫咪的日常',
    children: [
      {
        id: 'selector_main',
        type: 'selector',
        name: '主行为选择器',
        children: [
          // 高优先级：电量检查
          {
            id: 'seq_low_battery',
            type: 'sequence',
            name: '低电量处理',
            children: [
              {
                id: 'cond_low_battery',
                type: 'condition',
                name: 'checkBatteryLow',
                description: '电池低于 20%',
                metadata: {},
                children: []
              },
              {
                id: 'action_return',
                type: 'action',
                name: 'returnToCharge',
                metadata: {},
                children: []
              }
            ],
            status: 'idle'
          },
          // 避障行为
          {
            id: 'seq_avoid',
            type: 'sequence',
            name: '避障',
            children: [
              {
                id: 'cond_obstacle_f',
                type: 'condition',
                name: 'checkObstacleSide',
                children: []
              },
              {
                id: 'action_turn',
                type: 'action',
                name: 'turnLeft',
                children: []
              }
            ],
            status: 'idle'
          },
          // 日常：探索
          {
            id: 'seq_explore',
            type: 'sequence',
            name: '探索',
            children: [
              {
                id: 'cond_always',
                type: 'condition',
                name: 'alwaysTrue',
                children: []
              },
              {
                id: 'action_explore',
                type: 'action',
                name: 'explore',
                metadata: { distance: 1.5 },
                children: []
              },
              {
                id: 'random_behavior',
                type: 'random',
                name: '随机喵星人行为',
                metadata: { probability: 0.5 },
                children: [
                  {
                    id: 'selector_cat_action',
                    type: 'selector',
                    name: '猫咪行为',
                    children: [
                      {
                        id: 'action_meow',
                        type: 'action',
                        name: 'meow',
                        metadata: {},
                        children: []
                      },
                      {
                        id: 'action_play',
                        type: 'action',
                        name: 'play',
                        metadata: {},
                        children: []
                      },
                      {
                        id: 'action_rest',
                        type: 'action',
                        name: 'rest',
                        metadata: {},
                        children: []
                      }
                    ],
                    status: 'idle'
                  }
                ],
                status: 'idle'
              }
            ],
            status: 'idle'
          },
          // 撒娇行为
          {
            id: 'seq_pet_response',
            type: 'sequence',
            name: '撒娇',
            children: [
              {
                id: 'cond_always',
                type: 'condition',
                name: 'alwaysTrue',
                children: []
              },
              {
                id: 'action_play',
                type: 'action',
                name: 'play',
                metadata: {},
                children: []
              }
            ],
            status: 'idle'
          },
          // 休息
          {
            id: 'seq_rest',
            type: 'sequence',
            name: '打盹',
            children: [
              {
                id: 'cond_idle',
                type: 'condition',
                name: 'checkIsMoving',
                children: []
              },
              {
                id: 'action_rest',
                type: 'action',
                name: 'rest',
                metadata: {},
                children: []
              }
            ],
            status: 'idle'
          }
        ],
        status: 'idle'
      }
    ],
    status: 'idle'
  }
};

/**
 * 小猫角色配置文件
 * Cat Character Settings
 */
export interface CatCharacter {
  id: 'cat';
  name: string;
  nameZn: string;
  description: string;
  behaviorTreeId: string;
  emoji: string;
  icon: string;
  tags: string[];
}

export const catCharacter: CatCharacter = {
  id: 'cat',
  name: 'Luna',
  nameZn: '露娜',
  description: '高贵优雅的小猫，喜欢探索又偶尔撒娇的独立小猫咪',
  behaviorTreeId: 'cat-v1',
  emoji: '🐱',
  icon: 'cat-icon',
  tags: ['elegant', 'independent', 'playful', 'curious']
};
