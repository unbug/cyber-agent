# CyberAgent SDK Design Specification

## 战略定位：双语言 SDK 策略

**目标**：覆盖从 Web 前端到嵌入式设备的全栈机器人开发场景。

### 双语言架构决策

| SDK 组件 | 语言 | 目标平台 | 使用场景 | 理由 |
|-----|-----|-----|-----|-----|
| `@cyber-agent/core` | TypeScript/JavaScript | Web 浏览器、Node.js、Edge 设备 | 角色设计器、仿真环境、Web 应用 | 利用 React 生态、类型安全、社区庞大 |
| `cyberagent` | Rust | ESP32、Raspberry Pi、嵌入式系统 | 机器人板载控制、低功耗运行 | 内存安全、零成本抽象、性能优异 |

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                                │
│  • Web Character Editor (React + Vite)                          │
│  • Mobile Companion App (React Native)                          │
│  • Desktop Dashboard (Electron)                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME LAYER (@cyber-agent/core)                              │
│  • Behavior Tree Executor (JS)                                  │
│  • Blackboard State Management                                  │
│  • Action/Condition Registry                                    │
│  • Serialization/Deserialization (CDF JSON)                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ADAPTER LAYER                                                   │
│  • WebSocket Transport                                            │
│  • BLE Transport                                                │
│  • Serial/USB Transport                                          │
│  • RoboMaster Proprietary SDK (Rust wrapper)                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  HARDWARE LAYER                                                  │
│  • ESP32 (cyberagent runtime)                                   │
│  • Raspberry Pi (cyberagent runtime + ROS2)                     │
│  • DJI RoboMaster (Motor Controller + IMU)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## TypeScript SDK (@cyber-agent/core) 设计

### 核心 API 定义

```typescript
// types.ts
export interface CharacterSpec {
  id: string;
  name: string;
  category: CharacterCategory;
  version: string;
  behaviorTree: BTNode;
  blackboardInitial: Blackboard;
}

export type BTNode = 
  | ActionNode
  | ConditionNode
  | SequenceNode
  | SelectorNode
  | InverterNode
  | ParallelNode
  | RepeaterNode
  | CooldownNode;

export interface BTExecutor {
  tick(character: CharacterSpec, adapter: RobotAdapter): Promise<void>;
  subscribe(onTick: (telemetry: BTTelemetry) => void): () => void;
  stop(): void;
}

export interface RobotAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeAction(action: RobotAction): Promise<RobotActionResult>;
  subscribeSensor(callback: (sensorData: SensorData) => void): () => void;
}
```

### 使用示例

```typescript
import { BTExecutor, createWebSocketAdapter } from '@cyber-agent/core';
import { loyalDogCharacter } from '@cyber-agent/characters';

async function main() {
  const adapter = createWebSocketAdapter({
    host: '192.168.1.100',
    port: 8080
  });

  const executor = new BTExecutor(loyalDogCharacter, adapter);
  
  executor.subscribe((telemetry) => {
    console.log('Current state:', telemetry.currentState);
    console.log('Active action:', telemetry.activeAction);
  });

  await executor.start();
}
```

---

## Rust SDK (cyberagent) 设计

### 核心 API 定义

```rust
// src/lib.rs
pub struct CyberAgentRuntime {
    character: CharacterSpec,
    blackboard: Blackboard,
    executor: BTExecutor,
}

impl CyberAgentRuntime {
    pub fn new(character: CharacterSpec) -> Self {
        // 初始化行为树执行器
    }

    pub async fn tick(&mut self, sensor_data: SensorData) -> Vec<RobotAction> {
        // 执行一次行为树 tick
        // 返回需要执行的动作列表
    }

    pub fn update_character(&mut self, new_behavior_tree: BTTree) {
        // 运行时更新行为树配置
    }
}

// 硬件抽象层
pub trait HardwareInterface {
    async fn read_sensors(&self) -> Result<SensorData>;
    async fn write_actions(&self, actions: &[RobotAction]) -> Result<()>;
}
```

### ESP32 集成示例

```rust
// src/drivers/esp32.rs
use esp_wifi::tcp::TcpClient;

pub struct Esp32Adapter {
    tcp: TcpClient,
    sensor_reader: SensorBus
}

impl HardwareInterface for Esp32Adapter {
    async fn read_sensors(&self) -> Result<SensorData> {
        // 读取超声波、IMU、摄像头数据
        Ok(SensorData { ... })
    }

    async fn write_actions(&self, actions: &[RobotAction]) -> Result<()> {
        // 通过 UART 发送电机控制指令
        for action in actions {
            self.tcp.send(action.to_bytes()).await?;
        }
        Ok(())
    }
}
```

---

## CDF (Character Description Format) 版本化策略

### CDF 1.0 (当前)
- Core BT nodes (Sequence, Selector, Inverter, etc.)
- Basic condition predicates
- Action execution parameters

### CDF 1.1 (计划)
- Emotion system (multi-dimensional)
- Memory system (character history)
- Learning hooks (reinforcement signals)

### CDF 2.0 (愿景)
- LLM integration (behavior synthesis)
- Cross-robot inheritance
- Version control (git-style history)

---

## 发布策略

| SDK 类型 | 发布频率 | 渠道 | 测试要求 |
|-----|-----|-----|-----|
| TypeScript | Monthly | npm | Vitest suite, integration tests |
| Rust | Quarterly | crates.io | Clippy, cross-compilation tests |

### 版本化原则
- **SemVer** 严格遵循：MAJOR.MINOR.PATCH
- **Breaking changes** 通过 major version 标注
- **Deprecation** 提供至少 2 minor versions transition

---

## 安全性

### TypeScript SDK
- Zero external dependencies for core runtime
- Content Security Policy (CSP) compliant
- No eval, no dynamic imports

### Rust SDK
- Memory safety guarantees from Rust
- No unsafe code in public API
- Fuzzing tests for input validation

---

## 性能目标

| Metric | Target |
|-----|-----|
| BT tick latency (TypeScript) | < 10ms |
| BT tick latency (Rust) | < 1ms |
| Memory footprint (Rust, ESP32) | < 50KB |
| Startup time (Web) | < 200ms |
| Serialization overhead | < 5% CPU |

---

## 生态扩展路线

1. **Year 1**: Python bindings (for educational/prototype use)
2. **Year 2**: C bindings (for legacy robot SDKs)
3. **Year 3**: Node.js native addon (for performance-critical scenarios)

---

## 社区集成

- **VS Code Extension**: BT visualization in editor
- **JetBrains Plugin**: Auto-complete for CDF JSON
- **Unity/Unreal Plugins**: 3D simulation integration
- **ROS 2 Packages**: Standard robot middleware integration

**目标**：让 CyberAgent 成为机器人开发的标准工具链一部分，而不仅仅是一个库。
