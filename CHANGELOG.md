# Changelog

所有重要的项目变更都将记录在此文件中。

## [1.0.0] - 2026-04-12

### ✨ 新增功能

#### 项目骨架
- ✅ 初始化 Next.js 14 + TypeScript + Tailwind CSS 项目
- ✅ 配置 GitHub Pages 部署基础架构
- ✅ 创建项目架构和路由系统

#### 行为树引擎
- ✅ 实现行为树类型系统 (`types.ts`)
- ✅ 实现行为树执行引擎 (`executor.ts`)
- ✅ 支持节点类型：
  - Root - 根节点
  - Sequence - 序列节点（所有子节点必须成功）
  - Selector - 选择节点（任一个成功即可）
  - TickOnce - 单 tick 节点
  - Repeat - 重复执行
  - Random - 随机执行
  - Action - 行动节点
  - Condition - 条件节点

#### 角色系统
- ✅ 小狗角色配置 (`dogCharacter`)
  - 包含探索、玩耍、互动行为
  - 饥饿、障碍检测逻辑
- ✅ 成年金毛角色配置 (`dogCharacterExtended`)
  - 包含巡逻、玩耍、撒娇行为
  - 随机触发机制

#### 角色系统 - 猫
- ✅ 小猫角色配置 (`catCharacter`)
  - 调皮探索、睡觉、玩耍
  - 随机触发玩耍机制
- ✅ 老年猫角色配置 (`oldCatCharacter`)
  - 更多休息行为
  - 安静休闲模式

#### 机器人驱动层
- ✅ 定义机器人驱动接口 (`types.ts`)
  - `RobotDriver` 抽象接口
  - `SimulatedRobotDriver` - 模拟器用于测试
  - `RoboMasterEPDriver` - RoboMaster EP 实际驱动框架
- ✅ 支持状态订阅和命令发送
- ✅ 机器人能力检测

#### 前端界面
- ✅ 主页 (`/`)
  - 角色画廊展示
  - 使用流程说明
  - 响应式设计
- ✅ 角色详情页 (`/agent/[id]`)
  - 角色信息展示
  - 机器人连接状态
  - 实时状态监控
  - 控制面板（启动/停止）
  - 行为树状态显示

#### 基础设施
- ✅ 角色注册中心 (`registry.ts`)
- ✅ 行为树执行器集成
- ✅ WebSocket/实时通信准备

### 🏗️ 架构决定

**行为树设计**:
- JSON 配置驱动，便于扩展和定制
- 支持自定义节点类型扩展
- 异步执行支持长时间操作

**机器人抽象**:
- 统一的 `RobotDriver` 接口
- 易于添加新的机器人型号
- 模拟器支持本地开发测试

**前端架构**:
- Next.js App Router 实现
- TypeScript 类型安全
- Tailwind CSS 样式系统
- 响应式设计

### 📝 下一步计划

1. **实时通信**
   - WebSocket 实现
   - 机器人状态实时推送

2. **更多角色**
   - 宠物角色扩展
   - 自定义机器人角色

3. **机器人支持**
   - RoboMaster EP 完整集成
   - 更多机器人型号支持

4. **用户功能**
   - 用户登录
   - 角色收藏
   - 使用统计

---

## [Unreleased]

### 🚧 开发中
