# Q2-Q3 2026 Revised Execution Plan

> **战略调整**: 从"社区优先" → "技术壁垒优先"

---

## 核心原则重塑

### ❌ 旧原则 (已废弃)
- "开源 = 快速社区化"
- "PR 数量 = 进步速度"  
- "Discord 活跃度 = 社区健康"

### ✅ 新原则 (已生效)
- **开源 = 公开标准 + 技术壁垒**
- **深度工作 = 连续专注 4-8 周**
- **社区 = 技术成熟后自然聚集**

---

## Q2-Q3 2026 目标：四大技术壁垒

### 1. 机器人适配广度 (50+ platforms)

**交付物**:
- RoboMaster Adapter v2.0 (实时性提升 10x)
- mBot Adapter + mBot Matrix Adapter
- Esp32 DIY Adapter (最低成本入门)
- Unitree Go + Go1 Adapters
- 30+ DIY/玩具机器人适配器

**KPI**:
- Q2 end: 10+ platforms supported
- Q3 end: 50+ platforms supported
- 旗舰适配器: 生产级质量 (0 超时)

**为什么不可替代**:
- 每台机器人通信协议不同
- 需要现场测试 + SDK 逆向
- **这是时间壁垒，非技术壁垒**

---

### 2. Agent 情感系统深度 (Valence-Arousal-Loyalty)

**交付物**:
- VAL 情感数学模型 v1.0
- 情感状态机集成到行为树
- 情感→电机映射 (物理限制下的表达)
- 短期记忆系统
- 行为学习系统 v0.1

**KPI**:
- Q2 end: VAL 系统原型完成 (内部测试)
- Q3 end: 情感系统公开技术白皮书
- Q3 end: 模拟用户行为测试成功率 > 80%

**为什么不可替代**:
- 需要人类行为研究经验
- 心理学 + 机器人学交叉领域
- **需要 100+ 小时测试验证**

---

### 3. 仿真→物理迁移精度 (90%+)

**交付物**:
- 传感器噪声模拟库 (超声波/相机/IMU)
- 环境摩擦系数模型
- 通信延迟模拟层
- 虚拟→物理 transfer learning 框架
- 自动化测试套件

**KPI**:
- Q2 end: 传感器模拟完成
- Q3 end: 物理参数校准完成
- Q3 end: **90% virtual→physical 成功率**

**为什么不可替代**:
- 需要真实硬件测试数据
- 每台机器人的传感器特性不同
- **这是资源 + 时间壁垒**

---

### 4. 实时性能 (ESP32 1ms tick, 50KB)

**交付物**:
- Rust 核心引擎重构
- ESP32 静态内存管理
- 行为树预编译优化
- CBOR 零拷贝序列化
- 实时通信栈 (WebSocket over ESP-NET)

**KPI**:
- Q2 end: Rust 引擎完成，Node.js 等价版
- Q3 end: ESP32 1ms tick 延迟达成
- Q3 end: ESP32 < 50KB 内存占用

**为什么不可替代**:
- 需要 Rust + ESP32 双深度知识
- CPU 周期级优化
- **这是技术难度壁垒**

---

## 详细时间线

### Q2 2026 (April-June 2026)

#### W1-W2: RoboMaster Adapter v2.0
```typescript
// 关键改进:
- 通信栈重构：零拷贝 → 1ms tick
- 心跳机制升级：0.1s → 10ms
- 命令队列：环形缓冲区实现
- 错误恢复：<1s → <100ms

Deliverables:
- src/adapters/robo-master-v2.ts
- 性能基准测试
- 10 小时稳定性验证
```

#### W3-W4: mBot/MBot Matrix Adapter
```typescript
// 关键设计:
- I2C over BLE 桥接
- 电机控制抽象层
- LED 矩阵驱动
- 超声波传感器集成

Deliverables:
- src/adapters/mbot.ts
- src/adapters/mbot-matrix.ts
- mBot 机器人套件兼容性测试
```

#### W5-W6: Esp32 DIY Adapter
```typescript
// 关键实现:
- ESP-NET WiFi 栈
- UART 通信协议
- GPIO 电机控制
- 内存安全验证 (Valgrind + AddressSanitizer)

Deliverables:
- src/adapters/esp32.ts (TypeScript/Node.js)
- cyberagent/src/drivers/esp32.rs (Rust embedded)
- 完整 ESP32 固件
- Arduino IDE 一键部署包
```

#### W7-W8: Unitree Go/Go1 Adapter
```typescript
// 关键集成:
- Unitree SDK 封装
- 电机 IMU 通信协议
- SLAM 数据接入
- 安全急停机制

Deliverables:
- src/adapters/unitree.ts
- 四足机器人行为库
- 地形响应机制
```

**Q2 里程碑**:
- ✅ 4 个旗舰适配器生产级
- ✅ Esp32 DIY 完整方案
- ✅ **社区计划暂停，不发布**

---

### Q3 2026 (July-September 2026)

#### W9-W10: VAL 情感系统原型
```typescript
// 核心设计:
// Valence-Arousal-Loyalty 数学模型
class EmotionSystem {
  state: {
    valence: number;      // -1.0 (愤怒) → +1.0 (喜悦)
    arousal: number;      // 0.0 (困倦) → 1.0 (兴奋)
    loyalty: number;      // 0.0 (陌生) → 1.0 (依恋)
  }
  
  // 衰减计算：模拟心理学遗忘曲线
  decay(t: number): {
    valence: 0.05;        // 每天 5%
    arousal: 0.10;        // 每天 10%
    loyalty: 0.02;        // 每天 2%
  }
  
  // 刺激响应
  onInteraction(
    type: 'positive' | 'negative' | 'neutral',
    intensity: 0.0-1.0,
    duration: number
  ): void
  
  // 情感→行为树决策耦合
  getReinforcementSignal(): number;
}

Deliverables:
- src/engine/emotion-system.ts
- src/engine/memory-short-term.ts
- 100+ 测试案例
```

#### W11-W12: 情感系统深度集成
```typescript
// 关键实现:
- 情感状态机与行为树结合
- 情感记忆持久化
- 情感→电机映射 (物理限制下的表达)

Deliverables:
- src/engine/emotion-behavior-coupling.ts
- src/engine/emotion-motor-mapping.ts
- 情感表达评估 (0-100 分)
```

#### W13-W14: 仿真精度提升
```typescript
// 模拟层实现:
class SensorNoiseSimulator {
  ultrasonic(distance: number): number {
    // 真实噪声模型
    return distance + gaussian(0, 0.05 * distance);
  }
  
  camera(img: Image): Image {
    // 添加 JPEG 压缩噪声 + 运动模糊
    return applyJPEGNoise(applyMotionBlur(img));
  }
  
  imu(readings: IMU): IMU {
    // 漂移 + 噪声
    return readings + gyroDrift() + accNoise();
  }
}

Deliverables:
- src/engine/sensor-noise.ts
- src/engine/environment-friction.ts
- 虚拟→物理 transfer learning
```

#### W15-W16: ESP32 性能优化
```rust
// Rust 重写的关键:
pub struct CyberAgentRuntime {
    // 静态分配内存 (无 GC)
    blackboard: BlackboardStatic,
    // 行为树预编译
    bt_precompiled: BTGraph,
    // 零拷贝序列化
    communication: ZeroCopyBuffer,
}

impl CyberAgentRuntime {
    pub fn tick(&mut self) -> 1ms;
    pub fn memory_usage() -> < 50KB;
}

Deliverables:
- src/sdk/rust/src/runtime.rs
- ESP32 固件 (50KB < size < 70KB)
- CPU 周期级性能测试
```

**Q3 里程碑**:
- ✅ 情感系统公开白皮书
- ✅ 仿真精度 90%+
- ✅ **Multi-Agent Playground 阶段 A+B+C 全量上线**（详见 [MULTI-AGENT-PLAYGROUND-PLAN.md](MULTI-AGENT-PLAYGROUND-PLAN.md)）
- ✅ **社区计划正式启动**

---

## 第五条产品形态：Multi-Agent Playground

> **不是第五壁垒，而是把前四个壁垒"产品化"的旗舰场景**。详细任务拆解见
> [MULTI-AGENT-PLAYGROUND-PLAN.md](MULTI-AGENT-PLAYGROUND-PLAN.md)。

**做什么**：让用户在浏览器里把任意多个 cyber-agent 角色拖到一个共享场景（操场 / 公园 / 校园 / 游乐场），看他们彼此感知、互动；同时把这一切 1:1 投射到由 cyber-agent 驱动的物理玩具机器人上。

**竞品对照**：
- AI Town（a16z, 9.8k★）：纯 LLM 小镇，无物理映射
- Smallville / Generative Agents（21.2k★）：研究项目，每步 10 秒粒度
- NVIDIA Isaac Sim Mega：工业级，对玩具市场过重
- → cyber-agent 的差异化：**唯一打通"浏览器多 agent 模拟 ↔ 多台物理机器人广播"** 的开源项目

**与四大壁垒的耦合**：

| 壁垒 | Playground 中的体现 |
| --- | --- |
| ① 适配器广度 | `MultiBroadcastAdapter` 复用所有单机适配器；每多 1 个机型 = 多 1 种 playground 玩法 |
| ② VAL 情感深度 | 邻居观察是 valence/arousal 最强输入；playground 是 VAL 的最佳验证场 |
| ③ Sim→Physical 90% | 多机时基同步是 transfer 项目的加压测试 |
| ④ 实时性能 | 50+ agent 同 tick 是浏览器侧的另一条性能曲线 |

**时间线**：
- Q2 W7-W8：阶段 A MVP（与 sim→physical 并行，内部 staging）
- Q3 W9-W10：阶段 B 场景库 / Recorder / Replay
- Q3 W11-W12：阶段 C 物理桥接 + ≥2 台 RoboMaster 实机互动
- Q3 W13+：阶段 D Playground Editor / 剧本 YAML / Marketplace 联动

---

## 资源分配调整

### 核心团队成员 (当前 1 人 → Q3 前需 3 人)

| 角色 | 技能要求 | 优先级 |
|------|--------|-------|
| 机器人通信引擎师 | ESP32 + Rust + 实时系统 | 🔴 CRITICAL |
| 机器人硬件专家 | RoboMaster/Unitree SDK + 硬件调试 | 🔴 CRITICAL |
| 行为系统设计员 | 心理学 + AI 行为建模 | 🟠 HIGH |

**招聘策略**:
- 通过 IEEE papers / GitHub profiles 寻找
- 优先招聘有 RoboMaster/Unitree SDK 经验的候选人
- 远程工作，提供股权/分红激励

---

## 技术披露策略

### Q2 2026: ❌ 不公开
- 不发布技术白皮书
- 不展示未完成的功能
- 不创建社区计划

### Q3 2026: ✅ 分阶段披露
```
Week 1: 公开 RoboMaster Adapter v2.0 架构
Week 2: 发布 RoboMaster v2.0 性能基准报告 (公开对比数据)
Week 3: 公开情感系统数学模型 (技术白皮书)
Week 4: 发布仿真精度测试报告
Week 5: 公开 ESP32 性能优化技术细节
Week 6: 举办首次技术分享会 (IEEE/ACM joint)
Week 7-8: 社区计划启动 + SDK v1.0 beta
```

**为什么延迟公开?**
- 先建立技术壁垒，后公开标准
- 社区技术分享建立在"已验证成功"基础上
- 避免"过早开源导致被抄走"

---

## 与旧计划的对比

| 维度 | 旧计划 (错误) | 新计划 (正确) |
|------|----------|--|--------|
| 社区计划 | Q2 start | Q3 end (技术成熟后) |
| 公开披露 | 立即公开 | Q3 start 后 |
| 招聘重点 | Discord/社区运营 | ESP32/Rust/机器人专家 |
| MVP 目标 | 6+ 社区 PRs | 4+ 旗舰适配器 + 情感系统 |
| KPI | GitHub stars | 技术深度指标 |

---

## 执行检查清单

### Week 1 (April 21-25)
- [ ] RoboMaster Adapter v2.0 开始实现
- [ ] 招聘 ESP32/Rust 工程师 (3 个候选人)
- [ ] VAL 情感系统技术文档初稿

### Week 2 (April 28-May 2)
- [ ] RoboMaster v2.0 完成
- [ ] 性能基准测试完成
- [ ] mBot Adapter 开始实现

### Week 3 (May 5-9)
- [ ] mBot/MBot Matrix Adapter 完成
- [ ] Esp32 adapter 开始实现
- [ ] 招聘进展 review

### Week 4 (May 12-16)
- [ ] Unitree Go Adapter 开始实现
- [ ] Esp32 adapter 完成
- [ ] 内部技术评审

### Week 5 (May 19-23)
- [ ] 情感系统原型开始实现
- [ ] Unitree adapter 完成
- [ ] 技术规划：Q3 公开计划

### Week 6 (May 26-30)
- [ ] 情感系统完成
- [ ] Q2 所有里程碑完成
- [ ] **Q3 计划正式确定**

**Q2 关键**: Q2 end 时，**所有技术完成，公开披露，社区尚未启动**。

---

## 风险预案

### 风险 1: 招聘困难
- **应对**: 核心团队成员承担额外工作量
- **时间**: Q3 start 前，核心成员 60hrs/week

### 风险 2: RoboMaster Adapter 实现超出预期
- **应对**: 拆分 MVP (先实现基础功能)
- **时间**: 预留 2 周 buffer

### 风险 3: 情感系统难以工程化
- **应对**: 先实现简化版 (3 情绪状态)
- **时间**: Q3 start 时，简化版可用

### 风险 4: ESP32 性能不足
- **应对**: 回退 Node.js runtime (Q3 start 后降级)
- **时间**: 不延迟社区启动，先发布 Node.js 版

### 风险 5: 技术壁垒被竞品抢先
- **应对**: 加快技术披露节奏
- **时间**: Q2 end 时，评估竞品进度

---

## 总结

**Q2-Q3 2026 的核心使命**: 建立 4 大技术壁垒，在 Q3 end 时形成无法被竞争对手快速复制的护城河。

**然后**：
1. 公开技术白皮书
2. 启动社区计划
3. SDK v1.0 正式发布

**不是因为"时间到了"才启动社区，而是因为"技术壁垒已建立"才启动社区。**

这才是长期竞争力的正确路径。
