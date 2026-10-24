# 灵矽虚拟设备接入

更新时间：2026-10-24

## 当前可运行链路

```text
按住空格 → AudioWorklet PCM → Go WebSocket → 灵矽 manual/STT
                                                    ↓ 完整文字
                                     Go 规则层判定行动或对白
                                                    ↓
明确动作：事务提交 → action 状态 → 更新画面 → 灵矽 TTS / PCM
开放对白：灵矽生成台词 / PCM → 复核版本 → 事务提交 → state
```

无需 ESP32、外接麦克风模块或功放。浏览器使用电脑可用的麦克风，Go 以固定的软件设备身份接入灵矽。游戏动作、道具与虔诚度仍由后端规则维护。

本阶段已接通虚拟设备、麦克风 PCM 上行、云端 STT、文本回合与 NPC 音频。浏览器不使用 Web Speech API，也不提供本地 NPC 台词或浏览器语音合成回退。灵矽为必需依赖，Key 缺失、智能体准备或 OTA 绑定失败时后端拒绝启动。按住空格时录音，松开后等待灵矽识别结果；多 NPC 路由和 MCP 动作工具仍待扩展。

## 启动与激活

1. 在根目录 `.env` 配置 `LINX_API_KEY`，其余变量可使用 `.env.example` 的默认值。
2. 运行 `npm run dev`。
3. 启动时按精确名称查找或创建 `1024-keeper`，同步角色提示词和音色。其他智能体不会被修改。
4. 创建或读取 `.local/linx/device.json`，持久化虚拟 MAC 和 UUID v4。文件权限为 `0600`，目录被 Git 忽略；设备身份不发送到网页。
5. 向 OTA 接口上报身份。未绑定时使用六位激活码调用管理 API 绑定到 `1024-keeper`，再重新 OTA；预注册自动绑定的设备直接使用 OTA 结果。
6. 查询该智能体的设备列表核对绑定，保留 OTA 返回的 WebSocket URL / token 于内存。
7. 浏览器通过实验 API 绘制自检后，开启语音会话即可对话。激活成功不代表云端回合已验证。

身份文件在重启后复用，不要随意删除，否则下一次生成的是另一台设备。`LINX_DEVICE_ID` 仅用于指定首次身份；它与已有文件不一致时停止激活，避免悄悄替换身份。身份文件损坏时保留原文件并报告错误。

管理 API Key 与设备令牌职责分开：前者管理测试智能体和绑定，后者来自 OTA，专用于设备 WebSocket。不会依赖文档之外的鉴权宽松行为。OTA 返回的官方 WS 地址升级为同主机 WSS，其他远程非 TLS 地址直接拒绝。

## 模块边界

| 位置                                                 | 职责                                 |
| ---------------------------------------------------- | ------------------------------------ |
| `cmd/server/linx.go`                                 | 环境变量与集成装配                   |
| `internal/integration/linx/identity.go`              | 持久化软件设备身份                   |
| `internal/integration/linx/ota.go`、`devices.go`     | OTA、绑定与凭证管理                  |
| `internal/integration/linx/agents.go`                | 精确名称管理测试智能体               |
| `internal/integration/linx/websocket.go`、`reply.go` | hello、文本回合、字幕及 PCM 逐段接收 |
| `internal/session/commands.go`                       | 事务外生成、版本复核、回合结算       |
| `internal/session/command_lock.go`                   | 并发传输重试复用同一回合             |
| `internal/session/dialogue_audio.go`                 | 已提交回合的临时音频缓存             |
| `internal/transport/httpapi/command_stream.go`       | HTTP NDJSON 推送、刷新缓冲与断连取消 |
| `internal/transport/httpapi/audio.go`                | 缓存 PCM 包装为 WAV，供独立调试      |
| `web/src/features/session/commandStream.ts`          | 流式解析、超时与最终结算确认         |
| `web/src/features/voice/pcmPlayer.ts`                | PCM16 转换、小块缓冲与音频时钟调度   |
| `web/src/features/voice/useSpeechOutput.ts`          | 灵矽音频播放、打断与错误反馈         |

同一虚拟设备的云端请求串行执行，避免多个连接互踢。台词和播报请求单轮最多等待 20 秒；断连、空台词、错误事件、异常音频协商或超限音频均报错。开放式对白失败时不结算，明确动作的播报失败时保留已提交状态。发生连接失败后下一轮重新 OTA，凭证超过 10 分钟也会重新获取。

Go 通过规则预结算区分明确动作与开放对白。地图、移动、调查、交付道具和存档等动作先在事务中保存结果，通过 `type=action` 推送给前端，然后才调用 `listen.detect.text_response` 播报；播报失败返回 `voiceError`，不会撤销已保存动作。开放式对白仍先调用灵矽生成，再检查 `runId` / `revision` 和取消状态后提交。灵矽台词不能自行发放道具。当前仅开放 keeper 绑定，其他 NPC 不会套用 keeper 人设。

## 麦克风上行与识别边界

浏览器通过同源 `GET /api/sessions/:id/recognition` 建立 WebSocket。第一帧发送 `{ "type":"start", "runId":"..." }`；Go 完成灵矽 hello 和 `listen.start`（`mode=manual`）后返回 `{ "type":"ready" }`。随后网页持续发送 20ms / 640 字节的二进制 PCM16LE 音频帧，松开键后发送 `{ "type":"stop" }`。识别完成返回 `{ "type":"transcript", "text":"..." }`，失败返回 `type=error`。

AudioWorklet 将真实输入采样率重采样为 16kHz 单声道并补齐最后一帧；初始化会话仅授权设备，不在后台采集。录音最多 30 秒，待连接音频缓冲最多 256000 字节，WebSocket 发送队列超过 128000 字节中止。Go 检查帧长、总长度、runId 和状态版本；纯静音由输入能量检测丢弃，识别阶段不写存档。

灵矽 ASR 和回复共用已绑定的软件设备，以设备锁串行使用。识别连接收到 STT 就发 abort 并关闭，所有自动 LLM/TTS 事件都不向网页转发。完整文字返回后才由网页提交正常游戏命令。没有假设平台提供独立 ASR-only 接口，也不会将识别阶段的自动回复作为游戏结果。

前端录音控制器负责按键、取消和单次提交，`microphoneCapture.ts` 管理 AudioWorklet 生命周期，`recognitionStream.ts` 负责同源 WebSocket、缓冲、超时与识别结果。Go 的 `session.Recognize` 通过 `SpeechRecognizer` 接口调用 `integration/linx/recognition.go`；`httpapi/recognition.go` 仅适配音频与控制帧。

## 字幕、音频和存档

WebSocket 按 hello 实际协商结果读取单声道 PCM16LE，接受 16 kHz / 24 kHz。收到 `tts.sentence_start` 就发字幕，收到二进制音频就转发完整采样，`tts.stop` 后校验整轮完整性。系统播报逐句核对预结算文本，内容不符时拒绝继续推送。云端单轮音频最多 2 MiB。

正常网页命令使用：

```text
POST /api/sessions/:id/commands/stream
Content-Type: application/json
{ runId, requestId, text }
```

响应为 `application/x-ndjson`，每行一条 JSON，写出后立即 flush，禁止缓存 / 代理缓冲：

```json
{"type":"speech","requestId":"...","speech":{"kind":"start","sampleRate":16000,"speaker":"守夜人","portrait":"keeper"}}
{"type":"speech","requestId":"...","speech":{"kind":"text","text":"逐句字幕。"}}
{"type":"speech","requestId":"...","speech":{"kind":"audio","pcm":"base64 PCM16LE"}}
```

明确动作的第一条业务消息是 `type=action`，携带已提交状态，前端立即更新地图、房间、道具和存档。随后的 `type=speech` 持续传送播报，最后的 `type=state` 结束请求；开放式对白没有提前动作消息。取消或播报失败不会回滚已收到的 action；断流时刷新快照确认实际进度，不能把断流等同于动作未执行。WebSocket 保留连接状态与快照恢复用途，正常命令不等待 WebSocket 超时再转 HTTP。

前端 `pcmPlayer.ts` 约累积 120ms PCM 后创建小块 AudioBuffer，以 Web Audio 时钟连续调度，最后不足一块的尾音在最终确认时冲刷。无需整段 WAV 下载。按下空格先取消旧请求和播放，120ms 后开启本次采集，松开后关闭输入并等待灵矽 STT。未按键不采集；失焦、页面隐藏或焦点进入输入框会丢弃本次录音。Go 请求 context 会取消云端读取并释放设备锁，旧识别、字幕和音频不能进入新回合。静音设置作用于播报与环境音。

仍收集完整 PCM 用于完整性校验和短期去重重放，缓存仅在内存保留最多 10 分钟、16 条、16 MiB。SQLite 只保存文本和游戏结果；重开或回档后旧分支音频无法获取。同一请求 ID 的显式重试重放已提交结果与缓存片段，缓存过期时只允许灵矽重新合成已保存文字，不重复游戏动作。流中断不自动重播已听过的内容。保留 `GET /api/sessions/:id/runs/:runId/audio/:requestId` WAV 接口用于独立调试，正常网页不走完整下载路径。

流式播放缩短的是“等整段生成结束再开口”的等待，不能消除云端 ASR、首 token / TTS 与网络时间。用发出请求、首字幕、首 PCM、首次排程和最终确认分别计时，避免把灵矽聊天记录时间当作玩家实际听到声音的时间。

## 本机延迟实测（2026-10-24）

Chrome 使用生产 HTTP 流与播放器、调用真实灵矽的示例轮次：

| 回应         | 首字幕 | 首 PCM | 首次播放排程 | 最终结算确认 |
| ------------ | -----: | -----: | -----------: | -----------: |
| NPC“你是谁”  | 1503ms | 1503ms |       1505ms |       7245ms |
| 地图系统播报 |  456ms |  482ms |        483ms |       9259ms |

播放器会在排程后约 25ms 开始首块音频。表中从识别文本提交后开始计时，不包含 ASR 收句；云端、网络与回复长度会改变结果。此前整轮缓冲会等待约 7–9 秒后才开始播放，当前不再等待整轮结束。

上述数据来自改造前的流式播报验证。当前动作已改为先提交再播报：2026-10-24 使用预录“看看地图”PCM 经过真实灵矽识别，松开到 STT 约 375ms；识别文字提交后，action 约 13ms 到达、首 PCM 约 792ms、播报完成约 9553ms。Chrome 另使用正式 AudioWorklet 在 48kHz 输入下重采样上传 51200 字节 PCM，正确返回“看看地图”，停止后输入轨道关闭；正式页面通过调试注入确认地图在“正在理解”阶段展开，并移除识别文字显示。这些是单次链路验证数据，不代表所有录音的延迟或准确率，实际麦克风仍需体验。

## 验证与诊断

访问 `/api/health`：

- `linx.state=ready`、`linx.bound=true`：完成 OTA 和绑定，尚未验证云端回复。
- `linx.state=verified`、`linx.verified=true`、`qiniuConnected=true`：本进程实际收到有效灵矽台词 / TTS 音频；`lastReplyAt` 记录时间。
- `linx.lastError`：安全的阶段错误码，不包含 API Key、设备身份或 token。
- 当前每回合独立连接并在结束时关闭；`verified` 表示最近一次验证结果，不表示一直在线。

浏览器调试页可注入“你是谁”检查字幕，开启语音会话后才能播放声音；注入走真实结算链路，会写入当前存档。验证代码时可用独立开发数据库，避免改变演示进度。

自动测试覆盖身份复用、并发创建、损坏身份保护、OTA 业务错误、只绑定项目智能体、设备 token 握手、字幕 / PCM 在结束前推送、采样对齐、HTTP 实时 flush、取消不提交、超时、空回复、音频分支隔离和去重重放。真实麦克风、扬声器回声、打断时机仍需在比赛浏览器中实际体验。

## 官方协议

- [OTA 网关](https://linx.qiniu.com/docs/xrobot/platform/OTA)
- [设备管理与激活码绑定](https://linx.qiniu.com/docs/xrobot/api/device)
- [WebSocket 协议](https://linx.qiniu.com/docs/xrobot/platform/websocket)
- [macOS / Linux 客户端示例](https://linx.qiniu.com/docs/xrobot/guide/client-demo)
