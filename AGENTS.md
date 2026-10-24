# 项目协作约定

## 前端

- 所有目录（含 React 组件目录）使用 `lower_snake_case`，例如 `scene/html_clue`、`features/dialogue/dialogue_panel`。
- React 组件使用 `PascalCase`，例如 `DialoguePanel`；组件入口为 `index.tsx`，样式为同目录的 `style.module.css`。
- 组件的视图、样式和专用辅助逻辑就近维护；新功能不继续堆入页面入口或公共样式文件。
- 全局 CSS 仅保留 `shared/styles/tokens.css` 和 `reset.css`；共享边框与纸张等使用有作用域的样式或 UI 原语，禁止用 `:global` 穿透其他组件。
- `app` 负责组装与跨功能编排，`features` 负责 HUD、语音、会话、道具、对白等功能，`scene` 负责画面与 GPU 效果，`shared` 只保留通用 UI、类型和工具。
- `shared` 不导入上层；`scene` 不导入 `features/app`；`features` 不导入 `app`。跨功能协调放入 `app`。
- 使用 `@/` 引用前端源码；导入路径大小写必须与实际目录一致。
- 游戏启动前必须通过所需实验 API 的实际能力检查；未通过时只显示启用说明，不加载游戏，不通过演示、调试参数或确认缓存绕过，不提供普通 HTML 降级体验。

## 后端

- `cmd/server` 仅处理配置、依赖装配和进程生命周期。
- `internal/transport/httpapi` 处理 HTTP / WebSocket 适配，通过服务接口调用会话层。
- `internal/session` 编排回合、请求去重、检查点和事务边界，通过 `Repository` / `Transaction` 接口使用存储。
- `internal/game` 是不依赖 SQL / Gin 的游戏规则，按系统控制、移动、调查、对白、道具拆分。
- `internal/storage/sqlite` 实现存储接口与当前数据库结构初始化，不决定 NPC 性格或奖励规则。
- `internal/content` 管理静态剧本。每个 NPC 使用 `npcs/<npc_id>/profile.json` 与 `prompt.md`，共同物品和初始世界分别维护。
- 新增人物配置要验证 ID、引用和提示词；游戏的真实状态仍由后端规则结算。
- 每段已识别的有效发言都必须有角色或系统反馈。跑题不静默丢弃；歧义要澄清，失败要说明原因，普通跑题不自动扣虔诚度或推进剧情。请求超时或空回应也要兜底，纯静音和回声不作为游戏回合。
- 开发阶段以最新数据结构为准，不编写旧版本数据库或存档兼容层；结构变化时可直接调整并重建开发存档。

## 检查

- 单个源码或组件样式文件保持在 300 行以内；接近上限时按职责拆分，避免机械拆成无边界的碎片。
- 前端使用 Prettier，Go 使用 gofmt。
- 提交前运行 `npm run check:architecture`、`npm run format:check`、`npm run test:web`、`npm run build`、`go test -race ./...`。
- 改动页面结构或样式后验证实际页面，保持全程语音操作路径及房间转场、道具、存档行为。
