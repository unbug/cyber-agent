# 角色开发模板

## 角色信息

```typescript
{
  id: string,                      // 唯一标识符：忠诚狗、好奇猫等
  name: string,                    // 人类可读名称：Loyal Dog
  description: string,             // 角色描述
  category: "companion" | "guard" | "entertainer" | "educator",
  author: string,                  // 你的 GitHub 用户名
  version: string                  // 语义版本：1.0.0
}
```

## 行为树设计

### 状态机

```
├── 空闲状态 (Idle)
│   └── 等待环境刺激
├── 跟随状态 (Follow)
│   └── 追踪用户/物体
├── 玩耍状态 (Play)
│   └── 与用户互动
└── 休息状态 (Rest)
    └── 充电/恢复
```

### 决策逻辑

```json
{
  "type": "Selector",
  "children": [
    { "type": "Sequence", "children": [
      { "condition": "lowBattery" },
      { "action": "returnToCharger" }
    ]},
    { "type": "Sequence", "children": [
      { "condition": "userNearby" },
      { "action": "greetUser" }
    ]},
    { "type": "Action" }
  ]
}
```

## 实现步骤

1. 在 `src/characters/` 创建你的角色文件
2. 定义角色元数据 (id, name, category)
3. 实现行为树结构 (使用 BT 节点组合)
4. 添加自定义动作节点 (与硬件交互的方法)
5. 在 `src/data/characters.ts` 中注册角色
6. 编写测试：角色行为符合预期
7. 打开 PR!

## 参考实现

- `loyal-dog.ts`：基础跟随行为
- `guard-dino.ts`：警戒状态机
- `dance-bot.ts`：时间序列驱动

## 需要帮助？

- 阅读 `ENGINE.md` 了解行为树 API
- GitHub Issues 提问
- Discord #role-design 频道讨论
