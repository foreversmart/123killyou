# 当前运行贴图替换清单

## 运行时组合状态

剧情场景现在会读取 `assets/scenes/*/layout.json` 的 `sourceFrame`、目标 `rect`、`zIndex` 和遮挡区域，再映射到 `web/public/art/story` 的 WebP 文件。登记处、斋堂、东院回廊、门隙偏房、偏殿、门房、山门和返程大巴由 `web/src/scene/authored_scene/` 统一组合；人物和道具先按原图裁切，再等比放入目标矩形。调整贴图位置时应先改对应 layout JSON，并通过网页逐幕检查，避免重新引入旧的百分比热点坐标。

这份清单给负责接入真实美术素材的同事使用。目标是替换当前游戏已经加载的贴图，保持现有 URL、布局坐标和剧情逻辑不变。

## 先看这几处

- 原始真实素材：`assets/characters/`、`assets/scenes/`、`assets/props/`
- 图片目录和尺寸校验：`assets/generation/asset_catalog.json`
- 当前采用状态与用途：`assets/generation/asset_usage.md`
- 场景分层和人物位置：`assets/scenes/*/layout.json`
- 前端运行贴图映射：`web/src/shared/lib/story_assets.ts`
- 当前网页贴图目录：`web/public/art/story/`

不要提交或依赖 `.local/`。那里是本机数据库、灵矽设备状态、日志、截图和临时预览；其中的预览页面如果需要共享，应另行迁移到仓库中的 `docs/` 或 `scripts/`。

## 已经通过统一映射加载的贴图

下表中的“运行文件”是前端当前引用的目标路径。为了减少改代码，优先保留目标文件名，只把真实素材转换成相同的网页格式并覆盖目标文件。PNG 原图仍保留在 `assets/`，作为唯一源文件。

| 运行文件 | 真实源文件 | 使用位置 |
| --- | --- | --- |
| `web/public/art/story/scenes/temple_gate.webp` | `assets/scenes/temple_gate/gate_afternoon.png` | 抵达山门、到达页 |
| `web/public/art/story/scenes/registration.webp` | `assets/scenes/registration/registration_afternoon.png` | 登记处背景 |
| `web/public/art/story/scenes/main_hall/hall_afternoon.webp` | `assets/scenes/main_hall/hall_afternoon.png` | 去斋堂途中经过红竹寺大殿的午后过渡画面 |
| `web/public/art/story/scenes/east_courtyard.webp` | `assets/scenes/east_courtyard/corridor_afternoon.png` | 东院回廊背景 |
| `web/public/art/story/scenes/player_room.webp` | `assets/scenes/player_room/room_candlelit.png` | 门房亮烛背景 |
| `web/public/art/story/scenes/registration_desk.webp` | `assets/scenes/registration/desk_foreground.png` | 登记桌前景 |
| `web/public/art/story/scenes/registration_ledger_open.webp` | `assets/scenes/registration/props/ledger_open.png` | 打开的登记簿 |
| `web/public/art/story/scenes/registration_ledger_closed.webp` | `assets/scenes/registration/props/ledger_closed.png` | 合上的登记簿 |
| `web/public/art/story/scenes/registration_copper_key.webp` | `assets/scenes/registration/props/copper_key.png` | 登记桌铜钥匙 |
| `web/public/art/story/scenes/registration_permit_stack.webp` | `assets/scenes/registration/props/permit_stack.png` | 通行凭纸叠 |
| `web/public/art/story/scenes/registration_permit_single.webp` | `assets/scenes/registration/props/permit_single.png` | 单张通行凭 |
| `web/public/art/story/scenes/registration_room_tag.webp` | `assets/scenes/registration/props/room_tag.png` | 四块房牌 |
| `web/public/art/story/characters/lin_lan.webp` | `assets/characters/lin_lan/standing.png` | 林岚场景立绘 |
| `web/public/art/story/characters/zhou_yan.webp` | `assets/characters/zhou_yan/standing.png` | 周砚场景立绘 |
| `web/public/art/story/characters/xu_zhi.webp` | `assets/characters/xu_zhi/standing.png` | 许栀场景立绘 |
| `web/public/art/story/characters/lu_chen.webp` | `assets/characters/lu_chen/standing_lantern.png` | 陆沉场景立绘 |
| `web/public/art/story/characters/hui_pu.webp` | `assets/characters/hui_pu/standing.png` | 慧普场景立绘 |
| `web/public/art/story/characters/shen_gong.webp` | `assets/characters/shen_gong/standing_jiaobei.png` | 神公场景立绘 |
| `web/public/art/story/portraits/lin_lan.webp` | `assets/characters/lin_lan/portrait_neutral.png` | 林岚对白头像 |
| `web/public/art/story/portraits/zhou_yan.webp` | `assets/characters/zhou_yan/portrait_neutral.png` | 周砚对白头像 |
| `web/public/art/story/portraits/xu_zhi.webp` | `assets/characters/xu_zhi/portrait_neutral.png` | 许栀对白头像 |
| `web/public/art/story/portraits/lu_chen.webp` | `assets/characters/lu_chen/portrait_neutral.png` | 陆沉对白头像 |
| `web/public/art/story/portraits/hui_pu.webp` | `assets/characters/hui_pu/portrait_neutral.png` | 慧普对白头像 |
| `web/public/art/story/portraits/shen_gong.webp` | `assets/characters/shen_gong/portrait_neutral.png` | 神公对白头像 |
| `web/public/art/story/portraits/unknown.webp` | `assets/portraits/unknown.png` | 未知门外/帘后声音 |
| `web/public/art/story/items/copper_key.webp` | `assets/props/copper_key/inventory.png` | 铜钥匙物品图 |
| `web/public/art/story/items/torn_page.webp` | `assets/props/torn_page/inventory.png` | 残页物品图 |
| `web/public/art/story/items/red_candle.webp` | `assets/props/red_candle/unlit.png` | 红烛物品图 |
| `web/public/art/story/items/prayer_beads.webp` | `assets/props/prayer_beads/inventory.png` | 念珠物品图 |
| `web/public/art/story/items/permit.webp` | `assets/props/permit/inventory.png` | 通行凭物品图 |

`assets/portraits/unknown.png` 当前仓库没有对应源文件时，不要凭空改成某个 NPC 的头像；继续使用黑影占位，或先补一张固定路径的未知头像源图并同步清单。

## 只覆盖文件还不够的地方

当前还有一部分演示图是代码内 SVG 或旧版占位图。另一位同事替换时需要同时检查：

1. `web/src/scene/story_art/`：没有 `storyAssets` 映射的场景仍由 SVG 组件绘制。若要使用真实背景，需要在 `story_assets.ts` 增加 URL，并在 `story_art/index.tsx` 为对应 `sceneKey` 接入背景。
2. `web/src/scene/scene_person/index.tsx`：默认角色只读取一张中性立绘。情绪、坐姿、石化和背身状态要按 `pose` / `sceneKey` 选择 `assets/characters/` 中的语义状态，不能把不同状态都覆盖到同一个中性文件。
3. `web/src/scene/scene_prop/art.tsx`：道具目前多数由 SVG 绘制。要换成真实道具图，应增加道具状态到网页资源的映射，并保留 `compositions.ts` 中的交互坐标。
4. `web/src/scene/story_stage/compositions.ts` 与 `web/src/scene/story_stage/layouts.ts`：这里是人物和道具的屏幕位置、尺寸和热点。替换图片时保持坐标系和脚底锚点；人物透明图按原始宽高比等比缩放。

登记处的复合图要按 `assets/scenes/registration/layout.json` 的图层顺序合成；不能把桌前景、登记簿、钥匙和通行凭压成一张后继续切换状态。

## 交付和验证步骤

1. 从 `assets/` 读取 PNG 原图，转换为当前运行目录使用的格式；不要从 `.local/` 找素材。
2. 保持 `story_assets.ts` 中的 URL 稳定，或在同一个改动里同步更新映射。
3. 运行 `npm run dev`，用 Chrome 打开本地页面，通过浏览器能力检查后开始旅程。
4. 检查山门、登记处、东院回廊、门房，以及角色立绘、对白头像和五件物品图。
5. 用 `Ctrl+E` 逐幕检查场景切换、人物位置、遮挡和交互热点；真实图片显示后再调整 `layout.json` 或 `compositions.ts`。
6. 提交真实运行文件、映射改动和本清单；不要提交 `.local/data/*.db`、`.local/linx/`、日志或临时截图。

完成后至少运行：

```sh
npm run check:architecture
npm run format:check
npm run test:web
npm run build
go test -race ./...
```
