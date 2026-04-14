# 贡献者指南 —— CyberAgent 开放标准项目

## 🦾 为什么参与贡献？

**构建机器人行业的通用语言**

- **你的贡献会被** 10000+ 机器人实时使用
- **学习真实的机器人行为树架构** (工业级技能)
- **直接获得硬件赞助** (年度最佳角色开发奖 $5000+)
- **成为行业先驱**：参与制定 IEEE/W3C 标准基础

## 🎯 你可以贡献什么？

### Tier 1: 角色开发 (入门级)
- 为现有机器人平台创建新角色
- 优化现有行为树逻辑
- 添加新的情绪状态和反应机制

### Tier 2: 硬件适配器 (中级)
- ESP32/Arduino 通信协议
- ROS/ROS2 集成
- BLE/WiFi/Pi 专用驱动

### Tier 3: 核心引擎 (专家级)
- 行为树运行时优化
- CDF 格式扩展
- 跨语言运行时实现

## 🚀 30 分钟启动你的贡献

### 1. 克隆项目
```bash
git clone https://github.com/unbug/cyber-agent
cd cyber-agent
npm install
```

### 2. 找到第一个贡献任务
- 查看标记为 `good-first-issue` 的 issue
- 查看 `help-wanted` 标签的复杂任务
- 浏览 `src/characters` 文件夹，添加你的角色

### 3. 提交你的第一个 PR
- Fork 仓库
- 创建特性分支 `feature/your-rolex-name`
- 添加测试 ( vitest run)
- 推送并打开 Pull Request

## 📚 学习路径

### 新手 → 角色开发者
- 阅读 `ENGINE.md`：行为树基础概念
- 研究 `src/characters/loyal-dog.ts`：示例角色
- 实践：创建你的第一个角色 "my-pet-cyberdog"

### 开发者 → 硬件工程师
- 阅读 `ADAPTERS.md`：适配器设计模式
- 研究 `src/adapters/ws-demo.ts`：WebSocket 示例
- 实践：为你的机器人平台实现适配器

### 工程师 → 核心贡献者
- 参与 RFC 讨论：新功能提案
- 审查社区 PR
- 贡献核心运行时优化

## 🏆 贡献者激励

- **Monthly Hack**: 每月一次全球协作黑客松
- **Hardware Grants**: 每月最佳角色获得定制硬件
- **Title System**: contributor → expert → master → legendary
- **Conference Speaking**: 年度 CyberAgent 大会演讲机会

## 🤝 协作工具

- **GitHub Issues**: 任务追踪、Bug 报告
- **GitHub Discussions**: 社区讨论、问题解答
- **Discord**: 实时协作频道 (#builders, #role-design, #hardware)

## 📜 行为准则

遵循 [Contributor Covenant v2.0](https://www.contributor-covenant.org/version/2/0/code_of_conduct/)

- 尊重所有贡献者
- 建设性反馈
- 包容、多元

## 🎁 第一次贡献

### 最小可行贡献 (MVP)
```bash
# 1. 选择一个任务：https://github.com/unbug/cyber-agent/issues?q=is:issue+is:open+label:"good-first-issue"

# 2. 克隆并运行：
git clone https://github.com/your-username/cyber-agent
cd cyber-agent
npm install
npm dev

# 3. 修改一个文件并提交：
git add -A && git commit -m "feat: add my-char" 
git push origin feature/my-char
```

### 最佳第一次贡献
- 修复文档错误
- 更新 README
- 添加一个简单角色
- 优化一个翻译字符串

## 🙏 谢谢你的贡献！

**我们正在构建一个全新的行业标准。你的每一行代码，都在为 10000+ 机器人赋予灵魂。**
