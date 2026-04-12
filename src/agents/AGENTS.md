# Agent 架构规范

> 本文件定义了 `src/agents/` 的目录结构、契约接口及迭代规则。
> **所有新增、修改 Agent 的 PR 必须遵守此规范。**

---

## 目录结构

```
src/agents/
├── index.ts            # 中央注册表 — 聚合所有 Agent，暴露公共查询 API
├── types.ts            # Character 接口定义（纯数据契约）
├── helpers.ts          # 行为树 DSL 辅助函数 (cond, act, seq, sel, wait, cooldown, repeat)
│
├── loyal-dog/          # ← 每个 Agent 一个目录，目录名 = Agent ID
│   ├── index.ts        #    桶文件，导出 { character, behavior }
│   ├── character.ts    #    角色数据定义（实现 Character 接口）
│   └── behavior.ts     #    行为树定义（实现 CharacterBehavior 接口）
│
├── curious-cat/
│   ├── ...
└── ...
```

---

## 契约接口

### 1. `Character`（角色数据）— `src/agents/types.ts`

```ts
interface Character {
  id: string                                              // 唯一标识，等于目录名
  name: string                                            // 显示名称
  emoji: string                                           // 单个 emoji
  category: 'companion' | 'guard' | 'performer' | 'explorer'
  description: string                                     // 一句话描述
  tags: string[]                                          // 搜索标签
  personality: string[]                                   // 性格关键词
  difficulty: 'easy' | 'medium' | 'hard'
}
```

**不变量:**
- `id` 必须等于其所在目录名（kebab-case）
- `id` 全局唯一
- `emoji` 只允许单个 emoji 字符
- `category` 只能是上述 4 种枚举之一
- `personality` 和 `tags` 各至少 1 项

### 2. `CharacterBehavior`（行为定义）— `src/engine/types.ts`

```ts
interface CharacterBehavior {
  characterId: string              // 必须 === 对应 Character.id
  tree: BehaviorNodeDef            // 行为树根节点
  defaults?: Partial<Blackboard>   // 初始黑板覆盖值
  tickIntervalMs?: number          // 逻辑帧间隔（默认 100ms）
}
```

**不变量:**
- `characterId` 必须与同目录 `character.ts` 中的 `id` 完全一致
- `tree` 根节点推荐使用 `sel('Root', ...)` 选择器
- `defaults` 中 `speed`, `energy` 为常用必填项

### 3. Agent 模块导出契约

每个 `src/agents/<agent-id>/index.ts` 必须且仅导出：

```ts
export { character } from './character'   // Character 类型
export { behavior } from './behavior'     // CharacterBehavior 类型
```

注册表 `src/agents/index.ts` 依赖此约定进行自动聚合。

---

## 新增 Agent 的步骤

### 1. 创建目录

```bash
mkdir src/agents/<agent-id>
```

目录名即 Agent ID，使用 kebab-case。

### 2. 创建 `character.ts`

```ts
import type { Character } from '../types'

export const character: Character = {
  id: '<agent-id>',          // 必须等于目录名
  name: 'Display Name',
  emoji: '🦊',
  category: 'companion',     // companion | guard | performer | explorer
  description: '...',
  tags: ['...'],
  personality: ['...'],
  difficulty: 'easy',        // easy | medium | hard
}
```

### 3. 创建 `behavior.ts`

```ts
import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: '<agent-id>', // 必须等于 character.id
  tickIntervalMs: 100,
  defaults: { speed: 2, energy: 0.8 },
  tree: sel('Root',
    // ... 行为子树
  ),
}
```

行为树使用 `helpers.ts` 提供的 DSL：
| 函数 | 说明 | 引擎节点类型 |
|------|------|-------------|
| `sel(name, ...children)` | 选择器 — 依次尝试直到成功 | Selector |
| `seq(name, ...children)` | 序列 — 全部成功才成功 | Sequence |
| `cond(check, args?)` | 条件检查 | Condition |
| `act(action, args?)` | 执行动作 | Action |
| `wait(ms)` | 等待 | Wait |
| `cooldown(ms, child)` | 冷却装饰器 | Cooldown |
| `repeat(count, child)` | 重复装饰器 | Repeater |

可用的内置 condition/action 名称见 `src/engine/builtins.ts`。

### 4. 创建 `index.ts`

```ts
export { character } from './character'
export { behavior } from './behavior'
```

### 5. 注册到 `src/agents/index.ts`

添加两行：

```ts
import * as myAgent from './my-agent'
```

并将 `myAgent` 加到 `agents` 数组。

### 6. 更新测试

在 `src/engine/behaviors.test.ts` 的 ID 列表中添加新 Agent ID，确保：
- `getBehavior('<agent-id>')` 返回有效定义
- 行为树可以 hydrate 和 tick 不崩溃

---

## 禁止事项

| 规则 | 原因 |
|------|------|
| ❌ 不要在 `src/data/characters.ts` 中新增角色数据 | 该文件已废弃，仅做兼容代理导出 |
| ❌ 不要在 `src/engine/behaviors.ts` 中新增行为树 | 同上 |
| ❌ 不要在 Agent 目录外定义 character 或 behavior | 破坏一 Agent 一目录原则 |
| ❌ 不要让 `character.id` 与目录名不一致 | 注册表依赖此约定 |
| ❌ 不要让 `behavior.characterId` 与 `character.id` 不一致 | 行为绑定靠此字段 |
| ❌ Agent 的 `index.ts` 不要导出 character/behavior 以外的东西 | 保持模块接口最小化 |
| ❌ 不要在 behavior.ts 中直接 import engine 的 executor/builtins | behavior 只声明树结构，不耦合执行逻辑 |

---

## 层级依赖关系

```
消费层 (pages, hooks)
      ↓
  src/agents/index.ts    ← 唯一公共入口
      ↓
  src/agents/<id>/       ← 各 Agent 模块
      ↓
  src/agents/types.ts    ← Character 接口
  src/agents/helpers.ts  ← BT DSL
      ↓
  src/engine/types.ts    ← CharacterBehavior, BehaviorNodeDef 等引擎类型
```

**关键原则：**
- 消费层只从 `@/agents` 或 `@/engine` 导入，不直接引用 Agent 子目录
- Agent 模块只依赖 `../types`、`../helpers` 和 `../../engine/types`
- Agent 模块**不**导入引擎的运行时代码（executor, runner, builtins）
- 引擎层完全不感知具体 Agent 的存在

---

## 扩展点

未来可在 Agent 目录下新增的可选文件：

| 文件 | 用途 | 状态 |
|------|------|------|
| `character.ts` | 角色数据 | ✅ 必需 |
| `behavior.ts` | 行为树 | ✅ 必需 |
| `index.ts` | 桶文件 | ✅ 必需 |
| `actions.ts` | Agent 专属自定义 action | 🔮 预留 |
| `conditions.ts` | Agent 专属自定义 condition | 🔮 预留 |
| `adapter.ts` | Agent 专属硬件适配器 | 🔮 预留 |
| `*.test.ts` | Agent 级别单元测试 | 🔮 预留 |
