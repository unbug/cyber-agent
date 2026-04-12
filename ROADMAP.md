# CyberAgent 项目路线图

## 项目愿景
CyberAgent 是一个让虚拟 AI Agent 驱动真实机器人/玩具的平台。用户打开网站，选择一个角色（如小狗），连接机器人（如 RoboMaster），启动后机器人就像那个角色一样在家里互动。

## 当前阶段：MVP 构建 (Phase 1)

### Phase 1.0: 基础架构
- [x] 创建仓库和 README
- [x] 初始化 Next.js + TypeScript + Tailwind CSS 项目
- [x] 配置 GitHub Pages 部署
- [ ] 创建项目骨架和基础路由
- [ ] 实现行为树引擎核心

### Phase 1.1: 角色系统
- [ ] 设计行为树 JSON 格式
- [ ] 实现小狗角色行为树
- [ ] 实现小猫角色行为树
- [ ] 创建角色管理系统前端

### Phase 1.2: 机器人适配层
- [ ] 研究 RoboMaster SDK API
- [ ] 设计硬件抽象层 (HAL)
- [ ] 实现 RoboMaster EP/EDR 驱动
- [ ] 编写机器人配对前端

### Phase 1.3: 实时通信
- [ ] 实现 WebSocket 实时通信
- [ ] 实现遥测数据流
- [ ] 添加 WebRTC 支持（可选）

### Phase 1.4: MVP 集成
- [ ] 角色画廊 UI
- [ ] 机器人状态显示
- [ ] 启动/停止控制
- [ ] 完整测试流程

## 未来功能扩展 (Future)
- 自定义角色编辑器
- 更多机器人型号支持
- 多人协作模式
- AI 行为进化
- 数据分析和回放
- 社区分享角色

## 技术栈
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **部署**: GitHub Pages (静态站点)
- **Web 通信**:原生 WebSocket API
- **机器人 SDK**: RoboMaster 官方 SDK (via JavaScript bridge)
- **行为树**: 自定义 JSON 驱动引擎
