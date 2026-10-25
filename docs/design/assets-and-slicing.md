# 网页原型素材与切图

日期：2026-10-24

本文记录旧版演示素材与切图链路。以 `story/mini_script.md` 为依据制作的场景、人物及道具用途见 [素材用途总表](../../assets/generation/asset_usage.md)；剧情运行时使用 `web/public/art/story/` 下的正式网页素材。

## 原始界面

源文件：`assets/concepts/game-interface-v2.png`，尺寸 1672 × 941。切图脚本位于 `scripts/slice-assets.mjs`，坐标和尺寸同时输出到 `web/public/art/slices.json`。

| 网页素材             | 原图裁切区域（x, y, 宽, 高） | 用途                               |
| -------------------- | ---------------------------- | ---------------------------------- |
| room-watch.webp      | 0, 77, 1375, 620             | 休息室完整场景；NPC 暂时与背景合成 |
| portrait-player.webp | 31, 5, 80, 77                | 主角头像                           |
| portrait-keeper.webp | 23, 707, 182, 193            | 守夜人对话头像                     |
| item-key.webp        | 1417, 181, 91, 127           | 铜钥匙                             |
| item-page.webp       | 1544, 181, 91, 127           | 残页；通行凭原型暂时复用此图       |
| item-candle.webp     | 1428, 378, 81, 124           | 红烛                               |
| item-beads.webp      | 1539, 377, 95, 124           | 念珠                               |
| ledger.webp          | 466, 576, 373, 91            | 账本局部，保留供后续观察特写使用   |

裁切由 sharp 完成，用户已授权切图。未将整张概念图当作网页截图背景：HUD、道具格、文字、数值、地图、对话和语音状态均为实际网页组件。

## 补充走廊背景

- 源图：`assets/scenes/corridor.png`。
- 网页图：`web/public/art/room-corridor.webp`。
- 生成方式：内置 image_gen，以 v2 原图为美术与空间连续性参考，生成无 UI、无人物的宽幅场景。
- 用途：演示两个房间之间的语音移动；不代表正式剧本和最终房间清单。

### 最终生成提示词

```text
Use case: illustration-story.
Create one wide landscape 16:9 background painting for an actual fixed-viewpoint 2D East Asian mystery web game. The attached game screenshot is a STYLE and CONTINUITY REFERENCE ONLY. Generate the dim corridor that is visible through the door on the right of that reference, seen after the player steps into that corridor. Do not edit or reproduce the screenshot layout.
Match exactly the understated semi-realistic hand-painted aesthetic, fine dark ink outlines, restrained shading, worn sepia/olive/brown wood, soot, old plaster, amber oil light, slightly unsettling 2000s Chinese narrative mystery game atmosphere. Not photographic, not glossy 3D, not anime.
Scene: an empty narrow wooden corridor in a secluded fictional religious compound at night. Fixed first-person viewpoint. At left foreground an open wood lattice door leaks warm amber light from the watch room, with the corner of a desk barely visible inside but no person. At right farther down, a closed red-brown door with an old brass lock and a tiny subtle abstract seal. Depth leads to a turn into darkness. One dim old hanging lantern, dusty muted walls, old floor boards with subtle reflected amber light. Faint cold moonlight through lattice windows. Quiet negative space; room interactions should be easy to read.
Maintain legibility, midtones visible, soft edge vignette, low saturation. The corridor fills the entire image, no UI, no HUD, no text, no portraits, no interface frames, no inventory, no buttons, no watermarks. No people or silhouettes in the corridor. This is an original environmental art asset. Wide 16:9 composition, ideally 2560x1440, not a vertical crop.
```

## 后续拆分边界

当前主场景适合固定机位的网页原型。概念图没有人物背后的完整背景，也没有人物全身透明图层，因此没有声称从平面图片恢复出可独立运动的完整角色。需要此类动画时，应继续补图或单独制作素材。
