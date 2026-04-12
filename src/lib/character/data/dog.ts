/**
 * 小狗角色行为树
 * Dog Character Behavior Tree
 */
import { BehaviorTree } from '@/lib/behaviorTree/types';

export const dogBehaviorTree: BehaviorTree = {
  id: 'dog-v1',
  name: '小狗日常行为',
  description: '让小狗表现得像一只真实的狗狗：探索、玩耍、休息、吠叫',
  version: '1.0.0',
  createdAt: '2026-04-12T00:00:00Z',
  updatedAt: '2026-04-12T00:00:00Z',
  root: {
    id: 'root',
    type: 'root',
    name: '每日活动',
    children: [
      {
        id: 'selector_main',
        type: 'selector',
        name: '主行为选择器',
        children: [
          // 高优先级：检查电池
          {
            id: 'seq_low_battery',
            type: 'sequence',
            name: '低电量处理',
            children: [
              {
                id: 'cond_low_battery',
                type: 'condition',
                name: 'checkBatteryLow',
                description: '电池低于 20% 时返回 true',
                metadata: {},
                children: []
              },
              {
                id: 'action_return',
                type: 'action',
                name: 'returnToCharge',
                description: '返回充电',
                metadata: {},
                children: []
              }
            ],
            status: 'idle'
          },
          // 高优先级：避免障碍物
          {
            id: 'seq_avoid_obstacles',
            type: 'sequence',
            name: '避障行为',
            children: [
              {
                id: 'cond_obstacle',
                type: 'condition',
                name: 'checkObstacleFront',
                description: '前方 30cm 内有障碍物',
                children: []
              },
              {
                id: 'action_turn',
                type: 'action',
                name: 'turnRight',
                metadata: {},
                children: []
              }
            ],
            status: 'idle'
          },
          // 日常行为：探索
          {
            id: 'seq_explore',
            type: 'sequence',
            name: '探索模式',
            children: [
              {
                id: 'cond_battery_ok',
                type: 'condition',
                name: 'alwaysTrue',
                children: []
              },
              {
                id: 'action_explore',
                type: 'action',
                name: 'explore',
                metadata: { distance: 2 },
                children: []
              },
              {
                id: 'rand_explode',
                type: 'random',
                name: '随机行为触发',
                metadata: { probability: 0.6 },
                children: [
                  {
                    id: 'selector_random_action',
                    type: 'selector',
                    name: '随机活动',
                    children: [
                      {
                        id: 'action_wag',
                        type: 'action',
                        name: 'waveTail',
                        metadata: {},
                        children: []
                      },
                      {
                        id: 'action_bark',
                        type: 'action',
                        name: 'bark',
                        metadata: {},
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
                  }
                ],
                status: 'idle'
              }
            ],
            status: 'idle'
          },
          // 休息时间：坐下
          {
            id: 'seq_rest',
            type: 'sequence',
            name: '休息模式',
            children: [
              {
                id: 'time_condition',
                type: 'condition',
                name: 'alwaysTrue',
                children: []
              },
              {
                id: 'action_sit',
                type: 'action',
                name: 'sit',
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
 * 小狗角色配置文件
 * Dog Character Settings
 */
export interface DogCharacter {
  id: 'dog';
  name: string;
  nameZn: string;
  description: string;
  behaviorTreeId: string;
  emoji: string;
  icon: string;
  tags: string[];
}

export const dogCharacter: DogCharacter = {
  id: 'dog',
  name: 'Barkley',
  nameZn: '巴克力',
  description: '充满活力的小狗，喜欢在院子里探索并和你玩耍！',
  behaviorTreeId: 'dog-v1',
  emoji: '🐕',
  icon: 'dog-icon',
  tags: ['loyal', 'playful', 'energetic', 'protective']
};
