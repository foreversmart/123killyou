# 第一夜：代码架构与协作边界

更新时间：2026-10-24。本文描述已经落地的目录和依赖，不把未来七牛接入当成已经实现。

## 前端：按功能维护组件和样式

```text
web/src/
  main.tsx                          应用启动
  app/startup/                      启动能力检查，通过后懒加载游戏
  app/game/                         页面组装、回合反馈、自动演示
  features/
    startup/browser_check/          启动绘制自检、前后台切换及取消
    startup/browser_requirements/   能力检查失败时的说明与重新检测入口
    hud/player_status/              玩家状态、房间标题、存档状态
    inventory/inventory/            常驻物品栏
    dialogue/dialogue_panel/        当前说话者、头像与对白
    voice/                          浏览器语音会话与识别类型
      voice_dock/                   语音入口及状态
      waveform/                     音量可视化
    session/                        HTTP / WebSocket 会话与状态同步
    overlays/                       信息层分发
      map_panel/                    地图
      item_details/                 道具详情
      journal_panel/                线索手记
      bag_panel/                    背包详情
      ledger_panel/                 账本容器
      help_panel/                   语音帮助
      settings_panel/               设置
      encounter/                    暂停、暴露状态
    debug/command_panel/            开发转写注入
  scene/
    room/                           房间布局、黑屏转场与显示状态
    background/                     Pixi 场景与资源生命周期
    html_clue/                      HTML-in-Canvas 线索渲染
    effects/                        滤镜工厂与独立 GLSL 文件
  shared/
    ui/                             纸张、边角、提示、图标等通用组件
    styles/                         主题、reset、有作用域的共享表面
    types/game.ts                   前后端状态契约
    lib/                            通用小工具
```

所有目录使用小写下划线，包含 React 组件目录。组件名使用大驼峰：

```text
features/dialogue/dialogue_panel/
  index.tsx          导出 DialoguePanel
  style.module.css   仅维护 DialoguePanel 的样式
```

`app` 协调会话、语音、转场和界面；`features` 实现可独立维护的功能；`scene` 处理画面；`shared` 不反向依赖上层。房间通过 children 接收信息层，场景代码不导入背包、对白或会话功能。

各组件导入本地 CSS Module，类名在构建时隔离；跨组件共享的边框使用 `surfaces.module.css`，纸张和头像边角使用共享 UI 原语。只有主题变量和 reset 是全局 CSS，不使用 `:global` 穿透其他组件。响应式规则和动画跟随所属组件维护，保留黑屏转场与 toast 的独立动画。

对白以语音为主，字幕为辅助：底部对白行按内容自动增高，较长回复换行时向上占用部分场景空间，不固定在画面高度的某个百分比，也不要求玩家用鼠标滚动字幕。头像保持方形尺寸，不随文字高度拉伸；字幕使用较小字号、保留分行，并允许长串字符折行。

页面入口只负责组装，语音回合反馈和自动演示分别在 `useGameController.ts`、`useDemoTour.ts` 中。HTTP 请求适配与 WebSocket 状态恢复放在会话功能内，GPU shader 作为 `.glsl` 文件独立维护。新增地图内容、语音状态或对白样式不需要修改同一个大组件和全局样式表。

启动入口 `app/startup` 先挂载 `BrowserCheck`，使用 `shared/lib/htmlCanvas.ts` 检查必需方法，再由 `htmlCanvasProbe.ts` 创建一个 16×16 的实际 HTML-in-Canvas 探针：在 `paint` 事件内调用 `drawElementImage()`，读取两个区域的像素，与已知颜色比较。只有通过像素校验才挂载懒加载的 `Game`；接口缺失、异常、空白 / 错误颜色或 5 秒超时均显示 `BrowserRequirements`，区分缺少接口与绘制失败。自检和账本共用 `configureHtmlCanvas()` 配置 `drawable`。

检查位于会话、演示、调试输入和麦克风启动之前，不提供绕过选项，也不缓存手动确认。检测页变为后台时取消等待，回到前台重新检测；每次完成或取消都清理探针、监听与定时器。失败页重新聚焦时重试，已进入的游戏不因切换窗口重新挂载；刷新始终重新自检。浏览器 flags 仅作为官方试用指引，网页不能读取其值，实际绘制结果决定是否放行。账本不提供普通 HTML 回退；自检通过不等同于 PixiJS 纹理上传与 shader 已完整验证。

每轮反馈不能依赖命中剧情：NPC 配置提供兜底台词，应用为缺少读白的结果保留操作说明；语音模块处理没收完整的识别与系统错误提示，HTTP 适配器限制请求和响应体等待时间。进度刷新不阻塞失败反馈，后台的请求重试继续使用同一个请求 ID。具体体验约定见 [语音与 NPC 设计](design/voice-and-npc.md#21-每轮都要有反馈)。

语音请求的失效控制独立在 `voiceTurns.ts`：玩家出现新的临时转写、开启下一轮或退出时，就阻止旧结果和旧错误继续播报；播放结束事件也检查所属轮次，不覆盖新回合状态。声音开关只接受明确指令，不从包含“静音”的闲聊或否定句中执行设置。账本在真实绘制后标记就绪，异常或首次绘制超时显示恢复提示。

## 后端：规则、编排与基础设施分开

```text
cmd/server/main.go                 配置、依赖装配、启动与关闭
internal/
  content/
    world.json                    初始房间、角色、虔诚度与持有物品
    items.json                    物品定义
    npcs/<npc_id>/
      profile.json                身份、音色映射、对白与交换规则
      prompt.md                   角色性格、表达与知识边界提示词
    catalog.go                    嵌入式加载与引用校验
  game/
    state.go                      世界状态与返回结果
    engine.go                     规则分发与初始世界
    system.go                     系统控制
    movement.go                   移动
    inspection.go                 调查与观察
    dialogue.go                   受限对白规则
    inventory.go                  道具交付
  session/
    service.go                    会话创建、恢复与分支
    commands.go                   回合编排、去重和进度记录
    checkpoints.go                保存 / 列出 / 读取检查点
    repository.go                 存储事务端口
    models.go、snapshot.go        存档模型与格式标识
  storage/sqlite/
    open.go、schema.go、schema.sql 数据库连接与当前结构初始化
    transaction.go                实现事务边界
    sessions.go                   世界状态和分支读写
    commands.go                   请求结果读写
    checkpoints.go                检查点读写
    context.go                    事件与 NPC 对话记录
  transport/httpapi/
    router.go                     路由与服务接口
    sessions.go、stream.go         HTTP / WebSocket 适配
    command.go、errors.go          输入约束与错误映射
    static.go                     网页产物服务
```

依赖方向为 HTTP / WebSocket → 会话服务 → 游戏规则和存储接口；SQLite 实现该接口，并在入口装配进服务。`game` 不导入数据库和 Gin，`session` 不写 SQL，SQLite 不决定奖励或角色性格，传输层不依赖具体数据库。

`game/action_guard.go` 为关键词演示提供常见否定、假设、转述和行动询问的保守澄清；会话控制与游戏规则入口复用，防止在移动、交付、重开或读档前误执行。命名检查点的名称是字面参数，不解析为动作。这个保护不替代后续 AI 的完整语义判断。

一次交付的状态、事件、角色记忆和请求结果仍由同一个事务提交。`Repository.Transaction` 是会话层拥有的端口，换数据库适配器不需要修改剧情规则；未来接入七牛时，语音或工具请求也进入同一会话服务。

## 新增和调整 NPC

每个 NPC 独占一个配置目录，角色成员可以独立维护：

1. 新增 `internal/content/npcs/<npc_id>/profile.json` 与 `prompt.md`，目录名和配置 ID 一致。
2. 在配置中填写称呼 / 别名、所在房间、头像、性格、可知事实和音色配置；头像资源对应网页素材。
3. `dialogueRules` 配置当前演示的语义关键词、台词和受限的虔诚变化；`exchanges` 引用已定义物品，配置交付条件、奖励、剧情标记和回应。
4. 新物品加入 `items.json`；调整开局角色与背包时修改 `world.json`。
5. 重启 Go 后加载。新增房间的移动规则与场景素材需要在对应模块实现，不由 NPC 配置自动生成。

加载器会拒绝未知字段、无效 ID、缺少提示词、空台词、空关键词 / 别名、重复规则和不存在的物品引用。测试覆盖修改配置后的称呼、台词、虔诚变化和道具交换，确保配置实际参与游戏。规则不依赖“守夜人”这一显示名称，角色记忆使用配置中的 NPC ID。

`voice.profile` 为内部音色映射，`providerVoiceId` 留给七牛音色 ID；`prompt.md` 是后续 AI 的角色设定来源。当前仍使用浏览器语音与规则演示，七牛尚未接入，角色音色和提示词不会被描述为已经由平台执行。

## 开发阶段的检查与数据策略

开发阶段以最新结构为准，不实现旧数据库 / 存档版本的迁移或兼容层。结构需要改变时可直接调整并重建开发存档；当前结构标识用于发现不匹配，避免把错误数据当成有效进度。真实剧情仍通过状态、事件与角色记录恢复，网络重试和回档分支隔离继续生效。

协作约定见根目录 [AGENTS.md](../AGENTS.md)。检查命令：

```sh
npm run check:architecture
npm run format:check
npm run test:web
npm run build
go test -race ./...
```

架构检查约束前端目录命名、导入路径大小写、CSS Modules、依赖方向与单文件规模（300 行）。Prettier 与 TypeScript 的未使用符号检查保持前端一致；Go 使用 gofmt。测试分别覆盖内容配置校验、纯游戏规则、SQLite 事务 / 重启 / 回档，以及 HTTP / WebSocket 适配。`test:web` 使用 Node 内置测试运行器，验证接口前置检查、绘制像素成功 / 空白 / 错色、绘制异常 / 超时 / 取消后的清理，以及语音反馈与请求期限。自检单元测试使用可控的模拟 paint 源验证分支和生命周期，不能代替目标 Chrome 的原生渲染验证。
