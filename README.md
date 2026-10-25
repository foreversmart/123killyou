# 第一夜 · 语音交互 Web 游戏原型

面向本机演示的固定视角密室逃脱游戏框架，以按住空格说话的语音交互驱动对话、房间切换、道具操作和信息面板，使用 React、PixiJS、HTML-in-Canvas 与 Go/Gin 实现。

当前房间、人物、道具与数值用于验证技术流程，正式内容尚未确定。项目使用**灵矽语音识别 + Go 规则引擎 + 灵矽 NPC 台词和音频**运行。浏览器只采集麦克风 PCM，不使用 Web Speech API。Go 在本机模拟设备、通过 OTA 激活并绑定测试智能体，无需 ESP32；灵矽是必需依赖，不提供本地 NPC 台词或浏览器语音合成回退。整体交互设定见 [NPC 交互设计](docs/design/voice-and-npc.md)。

## 技术栈

| 层次      | 技术                                            | 职责                                         |
| --------- | ----------------------------------------------- | -------------------------------------------- |
| 界面      | React 19、TypeScript、Vite 8                    | 状态栏、道具栏、字幕、信息面板与应用编排     |
| 样式      | CSS Modules                                     | 每个组件独立维护样式，隔离类名               |
| 场景      | PixiJS 8、WebGL、GLSL                           | 固定视角场景、纹理、氛围滤镜                 |
| HTML 纹理 | HTML-in-Canvas 实验 API                         | 将 HTML/CSS 内容绘制到 Canvas，再接入 PixiJS |
| 当前语音  | AudioWorklet、Web Audio API、七牛灵矽 WebSocket | 按住说话、云端 NPC 音频、系统读白与波形      |
| 后端      | Go 1.26、Gin、HTTP / WebSocket                  | 会话、规则结算、状态同步与请求去重           |
| 存储      | SQLite、`modernc.org/sqlite`                    | 自动存档、命名检查点、事件与 NPC 对话记录    |

## 快速启动

### 1. 准备环境

- Node.js 22.12+、npm。
- Go 1.26+。
- 支持所需 HTML-in-Canvas 实验 API 的 Chrome / Chromium，启用方式见下文。

SQLite 使用纯 Go 驱动，无需单独安装数据库服务。以下命令均在仓库根目录运行：

```sh
npm ci
go mod download
cp -n .env.example .env
# 在 .env 中填写 LINX_API_KEY，再启动
npm run dev
```

`npm run dev` 先启动 Go（或复用已运行的匹配服务），核对健康检查中的 `openingContract: mini_arrival_v1`，并通过 `GET /api/story/opening` 确认返回第一幕后才启动 Vite。检查过程只读，不恢复或创建存档；发现旧服务占用 `8787` 时会提示先停止旧服务。按 `Ctrl+C` 关闭本次启动的进程。

| 地址                                                          | 用途         |
| ------------------------------------------------------------- | ------------ |
| [127.0.0.1:5173](http://127.0.0.1:5173/)                      | 开发页面     |
| [127.0.0.1:8787/api/health](http://127.0.0.1:8787/api/health) | 后端健康检查 |

Vite 监听 `0.0.0.0:5173`，同一局域网的电脑可通过 `http://<本机局域网 IP>:5173/` 访问。`npm run dev` 和 `npm run dev:web` 共用 `vite.config.ts` 的监听配置。Go 仍监听 `127.0.0.1:8787`，网页的 `/api` 和 WebSocket 请求由 Vite 代理，其他电脑不需要直接访问后端端口。

局域网 HTTP 可用于打开页面和开发调试，但麦克风需要可信的 HTTPS 或 `localhost` 安全上下文。完整语音体验可配置受访问电脑信任的 HTTPS 证书，或通过 SSH 转发后使用另一台电脑上的 `localhost` 地址。访问端浏览器同样必须通过下方的实验 API 绘制自检。

### 2. 配置浏览器

按 [WICG 开发者试用说明](https://github.com/WICG/html-in-canvas#developer-trial-information)，可使用最新版 Chrome Canary，将以下开关设为 `Enabled`，点击 **Relaunch** 重启浏览器后打开页面：

```text
chrome://flags/#canvas-draw-element
chrome://flags/#enable-experimental-web-platform-features
```

网页以**实际绘制结果**判断能否运行，无法读取 `chrome://flags` 的状态。浏览器已经提供所需能力时，即使总开关没有开启，绘制自检通过也可进入。

每次加载页面都会执行启动检查：

1. 确认 `requestPaint()` 与 `drawElementImage()` 可调用。
2. 创建 16×16 Canvas，绘制包含两种已知颜色的 HTML 元素。
3. 在 `paint` 事件中绘制并读取两处像素，核对颜色。
4. 全部通过后才懒加载游戏，通过 `GET /api/story/opening` 只读显示第一幕“大巴抵达灯影寺”。

接口缺失、绘制异常、像素不符或等待超过 5 秒，都会停留在说明页并显示检测信息。检测中切到后台会取消本次等待，回到前台重新检测；已进入的游戏不会因切换窗口重新挂载。演示和调试入口也必须通过自检。

第一幕提供“开始旅程”和“继续上次进度”两个入口。开始旅程或首次场景交互通过 `POST /api/sessions` 创建新局；只有主动选择“继续上次进度”才通过 `POST /api/sessions/resume` 恢复自动存档。刷新页面会重新显示第一幕，不会覆盖原存档；选择继续即可回到最近保存的进度。

### 3. 启用语音

进入后点击“开启语音会话”，允许麦克风并完成音频初始化。之后**按住空格说话、松开发送**；移动、道具与面板操作仍通过语音表达。NPC 回复时按住空格会立即打断播放与旧请求，再开始录音。未按空格时不运行语音识别，避免将灵矽的声音当作玩家输入。也可以先观看无需麦克风的自动演示。

一次按住只提交一个回合：松开后等待识别器收齐最终文本，再发送命令；纯静音不提交，识别不完整会提示重说。输入框中的空格不触发录音；窗口失焦、切到后台或焦点进入输入框时取消本次录音，返回后需重新按住空格。

麦克风通过 AudioWorklet 输出 16kHz / 单声道 / PCM16LE，经 Go WebSocket 转发给灵矽识别，需要联网。开发调试可注入文本，真实麦克风的音量、噪声和回声仍需在演示设备上体验。界面只显示录音、识别与回应状态，不显示“听见你说”的转写文字。

## 技术架构

```mermaid
flowchart LR
    Speech[浏览器采集 PCM] --> App[React 应用]
    App <-->|HTTP / WebSocket| Transport[Gin 传输层]
    Transport <--> Session[会话服务]
    Session --> Game[游戏规则]
    Game --> Content[内容配置]
    Session -->|Repository / Transaction| Database[(SQLite)]
    Session -. PCM 识别 / NPC 台词 / TTS .-> Linx[七牛灵矽适配器]
    Linx -. STT 文字 .-> Session
    Linx -. WebSocket 字幕 / PCM .-> Session
    App --> View[DOM 界面与 PixiJS 场景]
    Session -->|NDJSON 字幕 / PCM 流| App
    App --> Voice[Web Audio 流式播放]
    Session --> Audio[短期音频缓存 / 去重重放]
```

后端持有游戏的权威状态。灵矽 STT 返回的完整文字交给 Go 规则层；地图、移动、调查、交付道具和存档等明确动作先在事务中结算并通过 `type=action` 推送，前端立即更新画面，再调用灵矽播报。播报失败或被打断不撤销已经执行的动作。开放式 NPC 对话仍在云端完整返回后复核状态版本并提交，云端失败不生成本地替代台词。字幕和 PCM 经 HTTP NDJSON 逐段推送，前端约缓冲 120ms 后连续播放；最终 `type=state` 表示该请求的播报流程结束，动作可能早已提交。灵矽不能直接发放道具、改变虔诚度或移动房间。

### 前端分层

| 目录                | 职责                                                 |
| ------------------- | ---------------------------------------------------- |
| `web/src/app/`      | 启动检查、页面组装、语音与会话等跨功能编排           |
| `web/src/features/` | 语音、会话、状态栏、道具栏、字幕、信息面板和调试入口 |
| `web/src/scene/`    | 场景布局、黑屏转场、PixiJS、HTML 纹理与 GLSL         |
| `web/src/shared/`   | 通用 UI、类型、工具与基础样式                        |

`shared` 不依赖上层，`scene` 不导入 `features/app`，`features` 不导入 `app`；跨功能协调放在 `app`。

### 后端分层

| 目录                          | 职责                                               |
| ----------------------------- | -------------------------------------------------- |
| `cmd/server/`                 | 环境配置、依赖装配、进程启动与关闭                 |
| `internal/transport/httpapi/` | HTTP / WebSocket 输入、路由与错误映射              |
| `internal/session/`           | 回合编排、去重、事务边界、存档与检查点             |
| `internal/game/`              | 独立于 Gin / SQL 的游戏状态与规则                  |
| `internal/content/`           | 世界、物品、NPC 配置和提示词的加载与校验           |
| `internal/storage/sqlite/`    | 会话层存储接口的 SQLite 实现                       |
| `internal/integration/linx/`  | 灵矽智能体管理、虚拟设备身份、OTA 绑定与 WebSocket |

传输层通过服务接口调用会话层；会话层使用游戏规则和存储接口，由入口装配 SQLite 实现。SQL、网络适配、规则与角色配置分别维护，便于多人协作和后续替换实现。

### 交互与状态一致性

- 每次请求携带 `runId` 和 `requestId`，通过独立的 HTTP NDJSON 流接收字幕、音频和最终状态；WebSocket 用于连接状态与快照恢复。中途失败不自动重放已播的声音；相同请求 ID 的显式重试由后端去重。
- 状态、事件、NPC 对话记录和请求结果在同一事务中提交；前端按 `revision` 过滤迟到状态。
- 已识别的有效发言均有角色或系统反馈。跑题交由当前灵矽 NPC 回应，歧义进行澄清，空回应、识别中断和网络失败有明确提示。
- 玩家按下空格会中止旧 HTTP 流和云端生成，清空旧播放队列并拒绝迟到字幕；已经提交的动作保留，尚未提交的回合不结算。

当前规则引擎处理部分同义表达，并对常见否定、假设和行动询问进行保守澄清。开放式 NPC 语言必须由灵矽智能体生成，动作和奖励仍由后端规则结算。

## HTML-in-Canvas 的作用

HTML-in-Canvas 让使用 HTML/CSS 排版的内容成为 Canvas 的绘制输入。项目将它用于文字线索面板，使文字、纸张与装饰能作为一个纹理参与 GPU 滤镜。

当前渲染流程：

```text
HTML / CSS 内容
    ↓ drawable 子树与 paint 事件
drawElementImage() 绘制到 2D Canvas
    ↓ Texture.from(canvas) / texture.source.update()
PixiJS Sprite
    ↓ GLSL Filter
最终画面
```

对应实现位于 `web/src/scene/html_clue/`；状态栏、道具栏和字幕使用 React DOM。房间画面与氛围滤镜分别位于 `scene/background/`、`scene/effects/`，通过独立的 GLSL 文件维护变暗、故障和晕眩等效果。

启动探针位于 `web/src/shared/lib/htmlCanvasProbe.ts`，与线索面板共用 `configureHtmlCanvas()` 配置。探针验证 HTML 到 2D Canvas 的实际绘制；纹理上传、shader 和复杂 HTML 内容仍需在目标浏览器中单独验证。线索面板具有加载、就绪和失败反馈。

本机演示将此实验能力作为必要条件，检测失败时显示启用说明，不提供普通 HTML 的游戏内降级体验。

## 如何开发

### 启动与调试

前端代码与 CSS 由 Vite 热更新。Go 源码以及嵌入的 JSON / Markdown 配置修改后，需要重启 Go；`npm run dev` 当前不提供后端热重载。

需要分开观察日志时，使用两个终端：

```sh
# 终端一：后端
go run ./cmd/server
```

```sh
# 终端二：前端
npm run dev:web
```

[开发调试页面](http://127.0.0.1:5173/?debug=1) 提供识别文本注入，经同一条后端规则执行，便于验证操作与状态同步。它需要通过浏览器绘制自检，执行的操作会正常写入存档。

### 新增界面与场景

所有前端目录使用 `lower_snake_case`，组件名使用 `PascalCase`。组件视图、样式和专用逻辑就近维护：

```text
web/src/features/example_panel/
  index.tsx          导出 ExamplePanel
  style.module.css   组件专属样式
```

新增信息面板放在 `features/overlays/`，场景与滤镜放在 `scene/`，跨功能控制放在 `app/`。使用 `@/` 导入源码，每个组件维护自己的 CSS Module；共享基础样式位于 `shared/styles/`。单个源码或组件样式文件保持在 300 行以内。

素材存放在 `web/public/art/`，原始素材位于 `assets/`。`npm run assets:slice` 可按现有坐标重新切图并生成 `slices.json`；新增场景需要补充资源及对应场景、移动规则。现有部分人物仍与背景合成，独立动画需要补充人物图层。

### 管理 NPC 与物品

```text
internal/content/
  world.json                 初始世界与持有物品
  items.json                 物品定义
  narrator/
    profile.json             系统旁白身份与音色
    prompt.md                播报边界与表达方式
  npcs/<npc_id>/
    profile.json             身份、头像、音色映射、对话与交换规则
    prompt.md                性格、表达方式与知识边界
```

每个 NPC 独占目录，目录名与配置 ID 保持一致。新增物品先加入 `items.json`，在 NPC 配置中引用物品、奖励和条件；修改配置后重启 Go。加载器会校验字段、ID、台词、提示词和物品引用。

当前动作与奖励仍由配置驱动的规则执行。`voice.profile`、`providerVoiceId` 和 `prompt.md` 用于灵矽智能体配置；启动时按精确名称查找或创建 `1024-keeper` 与 `1024-narrator`。守夜人对白、道具交互台词和返回房间时的招呼使用守夜人音色；地图、调查、存档等系统反馈使用旁白音色。每次连接通过 `X-Agent-ID` 选择角色，复用同一虚拟设备，无需为旁白再绑定硬件或设备。

Go 管理虚拟设备、OTA 和设备绑定，同时提供灵矽音频识别代理。录音连接收到 STT 后终止自动 LLM/TTS，识别文字经游戏规则处理，再建立受规则控制的回复连接；识别连接中的自动音频不会传给前端。新增其他 NPC 的智能体路由仍待扩展，整体方案见 [NPC 交互设计](docs/design/voice-and-npc.md)。

### 本地存档与环境配置

默认数据库为 `.local/data/nightwatch.db`，首次启动自动创建。浏览器刷新或服务重启不会清除已保存进度；网页先只读显示第一幕，主动选择“继续上次进度”后恢复最近存档。本机多个标签页共享自动存档槽；开始新旅程会将该槽指向新局。命名检查点保存世界与 NPC 对话记录，读取时创建新的 `runId`，隔离旧分支请求。

需要独立的开发数据时指定另一个数据库：

```sh
NIGHTWATCH_DB=.local/data/dev.db npm run dev
```

| 环境变量               | 默认值                               | 作用                                                |
| ---------------------- | ------------------------------------ | --------------------------------------------------- |
| `NIGHTWATCH_DB`        | `.local/data/nightwatch.db`          | SQLite 文件路径                                     |
| `PORT`                 | `8787`                               | Go 服务监听端口                                     |
| `LINX_API_KEY`         | 无                                   | 必填；启动时用于测试智能体管理及设备绑定            |
| `LINX_API_BASE`        | `https://xrobo.qiniu.com`            | 灵矽平台 API 地址                                   |
| `LINX_WS_URL`          | OTA 返回的地址                       | 可选覆盖 WebSocket 地址；远程连接要求 WSS           |
| `LINX_OTA_URL`         | `https://xrobo.qiniuapi.com/v1/ota/` | 虚拟设备注册与连接凭证获取                          |
| `LINX_DEVICE_FILE`     | `.local/linx/device.json`            | 本机持久化设备身份，权限为 `0600`，已忽略提交       |
| `LINX_KEEPER_AGENT_ID` | 自动查找 `1024-keeper`               | 守夜人测试智能体 ID                                 |
| `LINX_NARRATOR_AGENT_ID` | 自动查找 `1024-narrator`           | 系统旁白测试智能体 ID                               |
| `LINX_DEVICE_ID`       | 自动生成虚拟 MAC                     | 可选的首次设备 ID；已有身份文件后不能改成另一台设备 |

`.env` 会在 Go 服务启动时读取，进程环境变量优先。仓库提供 [.env.example](.env.example) 作为模板，真实 Key 不应提交。`LINX_API_KEY` 为必填。配置后即可自动准备 `1024-keeper` 和 `1024-narrator`、生成虚拟设备、OTA 激活并绑定到守夜人，不需要连接硬件。管理 API Key 仅用于管理 API，WebSocket 使用 OTA 返回的设备令牌。不要删除或提交身份文件。

`/api/health` 的 `linx.bound` 表示绑定完成；`linx.verified` / `qiniuConnected` 只在实际收到一轮有效云端回复后变为 `true`，并记录 `lastReplyAt`。当前 NPC 回应和系统播报按回合建立并关闭云端连接，因此这是最近一轮的验证结果，不表示始终存在一条在线连接。详细联调流程与限制见 [灵矽虚拟设备接入](docs/development/linx.md)。

开发启动脚本的健康检查和 Vite 代理固定使用 `8787`；调整 Go 端口时，需要同步修改 `scripts/dev.mjs` 与 `vite.config.ts`。上述变量可以通过启动命令或进程环境传入，Go 服务也会自动读取根目录 `.env`。

开发阶段直接使用最新数据结构，不维护旧数据库 / 存档迁移。结构变化后使用新的开发数据库；详细事务与回档设计见 [进度与本地存档](docs/design/progress-and-saves.md)。

## 构建与检查

提交前运行：

```sh
npm run check:architecture
npm run format:check
npm run test:web
npm run build
go test -race ./...
```

架构检查覆盖目录命名、CSS Modules、导入大小写、依赖方向与文件规模；构建包含 TypeScript 检查。前端测试覆盖绘制自检与语音 / 请求反馈，Go 测试覆盖配置、规则、存储、回档及 HTTP / WebSocket。前端使用 Prettier，Go 使用 gofmt。

`npm run build` 将前端产物输出到 `dist/`。构建后运行 `go run ./cmd/server`，可通过 [127.0.0.1:8787](http://127.0.0.1:8787/) 访问由 Go 提供的完整网页，无需启动 Vite；浏览器实验功能与麦克风要求保持一致。

## 设计与开发文档

| 文档                                                | 内容                                       |
| --------------------------------------------------- | ------------------------------------------ |
| [技术方案](docs/technical-plan.md)                  | 技术选型、交互框架、实验能力与后续接入方向 |
| [灵矽虚拟设备接入](docs/development/linx.md)        | 无硬件激活、云端台词与音频、诊断与限制     |
| [代码架构](docs/architecture.md)                    | 完整目录、依赖边界与模块职责               |
| [NPC 交互设计](docs/design/voice-and-npc.md)        | 语音意图、角色性格、音色与互动奖励方案     |
| [进度与本地存档](docs/design/progress-and-saves.md) | 自动保存、检查点、事务与分支恢复           |
| [素材与切图](docs/design/assets-and-slicing.md)     | 资源组织、切图方法与当前素材限制           |
| [协作约定](AGENTS.md)                               | 命名、样式隔离、分层和提交检查要求         |

文档中的规划与当前已实现能力分别标注；具体演示内容可随正式设计调整。
