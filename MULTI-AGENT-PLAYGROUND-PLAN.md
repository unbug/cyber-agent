# Multi-Agent Playground Plan

> **目标**：让用户像搭积木一样，把任意多个 cyber-agent 角色拖到一个共享场景里（操场 / 公园 / 校园 / 游乐场），看他们如何感知彼此、互动、协作或对抗。模拟器中发生的一切，都能被 1:1 投射到真实环境中由多台被 cyber-agent 驱动的玩具机器人执行。
>
> **状态**：Planning（Q2 W7-W8 实验，Q3 W9-W12 正式落地，Q3 W13-W14 物理桥接）
>
> **责任人**：Core engine team
>
> **关联文档**：[Q2-2026-REVISED-PLAN.md](Q2-2026-REVISED-PLAN.md) · [TODO-Q2-2026.md](TODO-Q2-2026.md) · [PRODUCT.md](PRODUCT.md) · [SDK-SPEC.md](SDK-SPEC.md)

---

## 1. 竞品调研（Competitive Research）

为避免重复造轮子并吸取已有教训，我们调研了 7 个相关方向的代表项目：

| 项目 | 类型 | 借鉴点 | 与我们的差异 |
| --- | --- | --- | --- |
| **AI Town** ([a16z-infra/ai-town](https://github.com/a16z-infra/ai-town)) | Convex + PixiJS 多 LLM agent 小镇，9.8k★ | ① Tiled 瓦片地图作为场景；② 共享全局 state + 事务化 simulation engine；③ 可冻结/解冻世界；④ 角色 sprite + speed 配置 | 我们目标是**驱动物理机器人**，BT 决定行为、不是纯 LLM；scene 必须能映射到现实坐标 |
| **Smallville / Generative Agents** ([joonspk-research](https://github.com/joonspk-research/generative_agents), 21.2k★) | 25 个 LLM agent 在 Smallville 生活的研究项目 | ① 记忆流 (memory stream) 与 VAL 情感系统天然契合；② 可重播 (`/replay/<sim>/<step>`)；③ 历史 CSV 注入；④ Tiled 地图扩展；⑤ collision_block_id 概念 | 我们 BT 驱动而非每步 LLM 调用，所以 tick 频率是 10 Hz 而非 10 s/step |
| **NVIDIA Isaac Sim + Mega Blueprint** | 工业级多机器人仿真，USD 场景、GPU 物理 | ① 多机器人 fleet 广播；② sim→physical hardware-in-the-loop；③ ROS2 桥；④ 传感器噪声模型 | 我们走"轻量浏览器优先"，Isaac 的复杂度对玩具/儿童市场过重 |
| **Unity ML-Agents** | 多 agent 强化学习训练环境 | ① Behavior Parameters；② 决策协调（Decision Requester）；③ 课程式训练 | 我们不做 RL 训练（Q3 才会引入 learning v0.1），Unity 体积过大 |
| **PettingZoo / Gymnasium** | 多 agent RL Python 环境标准 | ① 多 agent step API（per-agent observation/action）；② Parallel & AEC 模式 | 是 Python 库，我们是 TypeScript / 浏览器 |
| **Project Malmo / Voyager** | Minecraft 多智能体研究 | ① 沙盒式自由探索；② skill library | 完全游戏内场景，无法物理映射 |
| **AI2-THOR / Habitat** | Meta/AI2 室内导航多 agent | ① 房间级别 scene；② 物理交互对象 | 学术导向，部署门槛高 |

**关键学习**：
1. **Tiled 瓦片地图** 是事实标准——AI Town 与 Smallville 都用它做场景制作。我们应直接复用，而不是重新发明。
2. **共享全局状态 + 事务化推进** 是 AI Town 引擎正确的核心抽象，对应我们的 `World + multi-executor`。
3. **可冻结、可重播、可注入历史**——这三件事在所有竞品中都是 Day-1 功能，必须在 MVP 阶段就支持。
4. **物理映射** 是我们的差异化护城河。AI Town/Smallville 永远停留在屏幕里，Isaac Sim 太重；cyber-agent 是唯一在 "浏览器多 agent 模拟" 与 "物理多机器人广播" 之间打通的项目。

---

## 2. 现状差距分析（Gap Analysis）

| 能力 | 现状 | Multi-Agent Playground 需要 |
| --- | --- | --- |
| 环境 | 单 canvas，`Blackboard` per-session | 共享 `World`，多 agent 注册到同一空间索引 |
| 行为树执行 | 单 `executor` per page | `multi-executor`：N 棵树并行 tick，确定性顺序 |
| 感知 | 仅 pointer 跟踪 | 邻居 agent 查询、emotion 观察、信号订阅 |
| 物理 | 无碰撞、无空间分块 | grid spatial index，半径查询 O(1) 平均 |
| 交互 | 无 | 互动事件总线（greet / chase / mimic / flee / signal） |
| 渲染 | 单角色 canvas overlay | 多角色 sprite 层，z-order，trail/glow per-agent |
| 场景 | 隐式 canvas | 显式 Scene 定义（playground / park / campus / schoolyard），含 POI（滑梯、长椅、教室门） |
| 物理桥 | 单机适配器（RoboMaster / mBot） | `multi-broadcast` 适配器，按 agent → robot 角色映射并行下发命令 |
| 录制/重播 | 无 | 时间序列录制、replay、share-link |

---

## 3. 系统架构（System Architecture）

```
┌─────────────────────────────────────────────────────────────┐
│                    PlaygroundPage (UI)                       │
│  Scene picker · Agent palette · Drag-drop spawn · Timeline  │
└────────────────────────┬────────────────────────────────────┘
                         │
                ┌────────▼────────┐
                │   World (state)  │  ← 共享 blackboard、time、entities[]
                └────────┬────────┘
       ┌─────────────────┼─────────────────┐
       │                 │                 │
┌──────▼──────┐  ┌───────▼───────┐ ┌──────▼──────┐
│ SpatialIdx  │  │ InteractionBus│ │ Recorder    │
│ grid query  │  │ events/signals│ │ ring buffer │
└──────┬──────┘  └───────┬───────┘ └──────┬──────┘
       │                 │                 │
       └────────┬────────┴────────┬────────┘
                │                 │
       ┌────────▼─────────────────▼────────┐
       │         MultiExecutor              │
       │   N × (BT executor + perception)   │
       └────────┬───────────────────────────┘
                │
   ┌────────────┼─────────────────────────┐
   │            │                         │
┌──▼──┐    ┌────▼─────┐           ┌───────▼──────────┐
│Agent│    │  Agent   │  ……       │ MultiBroadcast   │
│  A  │    │    B     │           │  Adapter (HW)    │
└─────┘    └──────────┘           └───────┬──────────┘
                                          │
                              ┌───────────┼──────────┐
                              │           │          │
                           Robot 1    Robot 2    Robot N
```

### 3.1 新增模块清单

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| `World` | `src/engine/world.ts` | 持有所有 entities、scene 元数据、global tick 时钟、冻结/解冻 |
| `SpatialIndex` | `src/engine/spatial-index.ts` | 均匀网格，提供 `nearest(k)`, `inRadius(r)`, `cellsOf(box)` |
| `MultiExecutor` | `src/engine/multi-executor.ts` | 调度 N 个 agent 的 BT，按 agent.id 字典序保证可重现 |
| `InteractionBus` | `src/engine/interaction-bus.ts` | 类型化事件 (`greet`, `chase`, `mimic`, `flee`, `signal:<topic>`)，支持 TTL |
| `Perception` | `src/engine/perception.ts` | 每 tick 为每个 agent 写入 `bb.neighbors`, `bb.nearestThreat` 等观察项 |
| `Recorder` | `src/engine/recorder.ts` | ring-buffer + 可导出 `.cap.json` 重播文件 |
| Scenes | `src/engine/scenes/{playground,park,campus,schoolyard}.ts` | 场景几何 + POI（滑梯、长椅、教室门、跑道）|
| Multi builtins | `src/engine/builtins-multi.ts` | 新 BT 节点：`findNearestAgent`, `isCloseTo`, `greet`, `follow`, `flee`, `emitSignal`, `onSignal` |
| `PlaygroundCanvas` | `src/components/PlaygroundCanvas.tsx` | 多角色渲染 + 场景背景 + POI 图层 |
| `PlaygroundControls` | `src/components/PlaygroundControls.tsx` | scene picker, agent palette, 拖拽生成 |
| `PlaygroundPage` | `src/pages/PlaygroundPage.tsx` | 顶级页面 + 路由 `/playground` |
| `MultiBroadcastAdapter` | `src/adapters/multi-broadcast.ts` | 按 agent.id → robotEndpoint 表，将 BT 输出的 `RobotCommand` 路由到对应物理机器人；支持背压、时基同步 |
| `MultiAgentEmulator` | `tests/hil-emulator/multi-agent.ts` | 多机器人 HIL 测试模拟器 |

### 3.2 核心数据结构

```ts
// src/engine/world.ts
export interface WorldEntity {
  id: string;                  // unique
  characterId: string;         // 引用 src/agents/<id>
  pose: { x: number; y: number; theta: number };
  blackboard: Blackboard;      // 自有黑板（含 emotion、energy）
  team?: string;               // 可选阵营，影响 isHostile 判定
  hwBinding?: string;          // 绑定到的物理机器人 endpoint id
}

export interface Scene {
  id: 'playground' | 'park' | 'campus' | 'schoolyard';
  bounds: { w: number; h: number };
  pois: Array<{ id: string; type: string; x: number; y: number; r: number }>;
  collisionMask?: ImageData;   // 可选：来自 Tiled 的碰撞图
}

export interface World {
  scene: Scene;
  entities: Map<string, WorldEntity>;
  spatial: SpatialIndex;
  bus: InteractionBus;
  tick: number;
  frozen: boolean;
}
```

```ts
// src/engine/builtins-multi.ts (摘录)
export const findNearestAgent = act('findNearestAgent', (ctx, params) => {
  const me = ctx.world.entities.get(ctx.entityId)!;
  const found = ctx.world.spatial.nearest(me.pose, params.maxRadius ?? 200, {
    excludeId: me.id,
    filter: params.team ? (e) => e.team === params.team : undefined,
  });
  ctx.bb.target = found ? { x: found.pose.x, y: found.pose.y, id: found.id } : null;
  return found ? 'success' : 'failure';
});
```

### 3.3 物理映射协议（Sim→Physical）

```ts
// src/adapters/multi-broadcast.ts
interface RobotBinding {
  agentId: string;             // 模拟器中的 entity.id
  endpoint: string;            // ws://..., serial://..., bt://...
  adapter: RobotAdapter;       // 已存在的单机适配器
  clockOffsetMs: number;       // NTP-like 时基同步
}

class MultiBroadcastAdapter implements RobotAdapter {
  bindings: Map<string, RobotBinding>;
  // 每个 tick 把 world 中各 entity 的 RobotCommand fan-out
  // 加入时间戳，物理机器人按时间戳重放，达成同步互动
  async sendCommand(cmd: RobotCommand & { agentId: string }): Promise<void>;
}
```

---

## 4. 任务拆解（Task Breakdown）

> 总工作量估算：~6 周 / 1 工程师（含测试）。可分两段执行。

### 阶段 A · MVP 浏览器多智能体（Q2 W7-W8，2 周，"实验性"）
- [ ] **A1** `World` + `SpatialIndex` 实现 + 单测（grid 查询 P95 < 50µs）
- [ ] **A2** `MultiExecutor` —— 改造现有 `executor`/`runner`，支持注册多棵树并以确定顺序 tick
- [ ] **A3** `Perception` 每 tick 写入邻居信息到各 agent blackboard
- [ ] **A4** `InteractionBus` —— 类型化事件 + TTL + 订阅匹配
- [ ] **A5** Multi builtins：`findNearestAgent` / `isCloseTo` / `greet` / `follow` / `flee` / `emitSignal` / `onSignal`
- [ ] **A6** Scene v0：`playground.ts`（4 POI：slide / swing / sandbox / bench）
- [ ] **A7** `PlaygroundCanvas` 多角色 sprite 渲染（沿用现 canvas-adapter）
- [ ] **A8** `PlaygroundPage` + 路由 `/playground`，含 scene picker + agent 拖拽
- [ ] **A9** Demo：在 playground 投放 `puppy + curious-cat + playground-buddy` 三只，验证 chase / greet / flee 闭环
- [ ] **A10** 集成测试：`tests/multi-agent/playground.spec.ts`（3 agent × 60 s 决定性回放）

**Exit criteria**：用户能从 Gallery 拖任意 ≥2 个角色到 `/playground`，看到他们彼此感知并互动；100 ticks 重播逐帧一致。

### 阶段 B · 场景与录制（Q3 W9-W10，2 周）
- [ ] **B1** Scene 库扩展：`park`, `campus`, `schoolyard`，每个 ≥6 个 POI
- [ ] **B2** Tiled 集成：`scripts/import-tiled.ts`，支持 `bgtiles` + `objmap` 两层（参考 AI Town 工具链）
- [ ] **B3** `Recorder` ring-buffer + `.cap.json` 导出/导入
- [ ] **B4** Replay UI：时间轴拖拽、暂停、单步、变速 0.25x–4x
- [ ] **B5** "Freeze world" 按钮（参考 AI Town）
- [ ] **B6** Share-link：把 `World` 初始化 + 录制压缩到 URL，类似 codepen
- [ ] **B7** VAL 情感系统接入：邻居观察影响自己 valence/arousal（与 Q3 W9-W10 emotion 系统并行）

### 阶段 C · 物理桥接（Q3 W11-W12，2 周）
- [ ] **C1** `MultiBroadcastAdapter` 骨架 + agent→robot 绑定 UI
- [ ] **C2** 时基同步：NTP-like 校准（见 SDK-SPEC，clockOffsetMs ± 5ms）
- [ ] **C3** 命令背压：robot 慢于 sim 时降级（最近邻插值），快于 sim 时丢帧
- [ ] **C4** HIL 测试：`tests/hil-emulator/multi-agent.ts`，模拟 4 台 RoboMaster + 2 台 mBot
- [ ] **C5** 端到端：浏览器 playground 中 2 只 puppy → 真实 2 台 RoboMaster S1，在客厅完成 "互相追逐 60 s"
- [ ] **C6** 安全：全局急停（一键停所有绑定机器人，<300 ms 触达，≥1 台绑定时 UI 顶部常驻"红按钮"）
- [ ] **C7** 文档 & 视频：3 分钟 demo + sim→physical fidelity 报告

**Exit criteria**：≥2 台 RoboMaster 物理机器人按浏览器中模拟的轨迹与互动行为执行，sim→physical 误差 < 10 cm / < 100 ms（与 Q3 W13-W14 transfer 项的 90% 目标对齐）。

### 阶段 D · Polish & DX（Q3 W13+，机会型）
- [ ] **D1** Playground Editor：BT 节点级 hot-swap（一边运行一边改 BT）
- [ ] **D2** 角色"剧本"：用 YAML 描述场景脚本（"3 分钟时让 puppy 主动接近 curious-cat"），便于复现实验
- [ ] **D3** Telemetry 多角色合并视图（2×3 网格，每格一个 agent）
- [ ] **D4** Gallery 联动：在角色详情页"在 playground 试试" 一键创建 1v1 / 3 角色场景模板
- [ ] **D5** Marketplace：用户可分享 Playground 录像（与 ChallengePage 联动）

---

## 5. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 多 agent tick 性能 (50 个角色) | 浏览器掉帧 | 分桶调度（10 ticks/s 但每 tick 只跑 1/10 的 agent），SpatialIndex 用 typed array |
| 行为树非确定性导致重播失败 | 用户信任崩塌 | 强制每 tick 用 seeded RNG（`world.rng = mulberry32(seed)`），禁用 `Date.now()` |
| 多机器人时基漂移 | 物理表现"鬼畜" | NTP-like 校准 + 命令携带 absolute timestamp，机器人侧本地排队执行 |
| 阶段 A 与现 single-agent 页面回归 | 已有 Agent 页崩 | 保留 single-agent runner 作 thin wrapper（`new World({ entities: [single] })`），不破坏 API |
| 与 VAL 情感系统耦合点过多 | 工期连环延迟 | 阶段 A 用占位 emotion API，阶段 B 再接入真实 VAL（与 W9-W10 同步开发） |
| 与 Q2 暂缓社区披露原则冲突 | 提前曝光技术 | 阶段 A/B 内部 staging 上线，不进官网导航；Q3 W11+ 与社区计划同步公开 |

---

## 6. 公开披露窗口

按 [Q2-2026-REVISED-PLAN.md](Q2-2026-REVISED-PLAN.md) 的"Q3 分阶段披露"原则：

- **Q3 W11**：随情感系统白皮书发布 Multi-Agent Playground 架构博客
- **Q3 W12**：发布 sim→physical 实测视频（2 台 RoboMaster 互动）
- **Q3 W14**：作为 SDK v1.0 beta 的旗舰示例公开

---

## 7. 与四大技术壁垒的关系

| 现壁垒 | Playground 如何强化 |
| --- | --- |
| ① 适配器广度 | `MultiBroadcastAdapter` 直接消费现有所有单机适配器，每多接一个机型就多一个 playground 物理玩法 |
| ② 情感深度 (VAL) | 邻居观察是 valence/arousal 最强的输入信号，playground 是 VAL 系统的最佳验证场 |
| ③ Sim→Physical 90% | playground 的多机时基同步是 transfer 项目的子集 + 加压测试 |
| ④ 实时性能 | 50+ agent 同 tick 是 ESP32 1ms tick 之外的另一条性能曲线（浏览器侧） |

**结论**：Multi-Agent Playground 不是"第五个独立壁垒"，而是把前四个壁垒合成可见可玩的"产品形态"——这正是从技术深度走向用户感知的关键一跃。

---

_Last updated: 2026-04-26_
