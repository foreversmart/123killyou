# 《红烛无声》素材目录

日期：2026-10-25。当前素材共 29 张图片，包含四处场景背景、六名主要 NPC 的普通状态人物图、六张普通对话头像、一张未知人物占位头像、七张登记处透明图层与五张正式物品图，使用内置 `image_gen` 生成。人物与场景采用写实比例的二维线描、概括色面和克制阴影；美术依据见 [风格参考](../references/style_reference/README.md)。

[素材用途总表](asset_usage.md)逐张说明对应幕次、画面位置、显示状态与仍需制作的部分，剧情以 [mini_script.md](../../story/mini_script.md) 为准。当前素材尚未接入游戏；目录中的“已生成/已采用”表示素材状态。

| 素材              | 原图                                                                            | 实际尺寸    | 内容                                           |
| ----------------- | ------------------------------------------------------------------------------- | ----------- | ---------------------------------------------- |
| 山门·晴日下午     | [gate_afternoon.png](../scenes/temple_gate/gate_afternoon.png)                  | 1672 × 941  | 山门、石阶、空白双层牌匾、铜铃与指示牌，空场景 |
| 登记处·下午       | [registration_afternoon.png](../scenes/registration/registration_afternoon.png) | 1672 × 941  | 干净背景；桌、簿册、钥匙、通行凭与房牌独立分层 |
| 东院回廊·晴日下午 | [corridor_afternoon.png](../scenes/east_courtyard/corridor_afternoon.png)       | 1672 × 941  | 四扇房门、铜铃、未点檐灯、花瓶与日光，空场景   |
| 主角门房·夜间亮烛 | [room_candlelit.png](../scenes/player_room/room_candlelit.png)                  | 1672 × 941  | 冷月光、一支红烛、蓝封经书与未点油灯，空房间   |
| 林岚·正常站姿     | [standing.png](../characters/lin_lan/standing.png)                              | 1024 × 1536 | 浅砂外套、相机、入住前正常状态，透明 PNG       |
| 陆沉·提灯站姿     | [standing_lantern.png](../characters/lu_chen/standing_lantern.png)              | 1024 × 1536 | 洗旧僧衣、铜钥匙、油灯，透明 PNG               |
| 周砚·正常站姿     | [standing.png](../characters/zhou_yan/standing.png)                             | 1024 × 1536 | 深蓝外衣、小挎包、克制神态，透明 PNG           |
| 许栀·正常站姿     | [standing.png](../characters/xu_zhi/standing.png)                               | 1024 × 1536 | 短圆脸、自然平刘海、灰绿长袖与帆布包，透明 PNG |
| 慧普·正常站姿     | [standing.png](../characters/hui_pu/standing.png)                               | 1024 × 1536 | 温和老僧、整齐袈裟、摊掌邀请，透明 PNG         |
| 神公·持筊站姿     | [standing_jiaobei.png](../characters/shen_gong/standing_jiaobei.png)            | 1024 × 1536 | 清瘦老僧、略驼、手持两枚杯筊，透明 PNG         |
| 林岚·普通对话头像 | [portrait_neutral.png](../characters/lin_lan/portrait_neutral.png)              | 1254 × 1254 | 方形头肩构图，普通状态，透明 PNG               |
| 周砚·普通对话头像 | [portrait_neutral.png](../characters/zhou_yan/portrait_neutral.png)             | 1254 × 1254 | 方形头肩构图，普通状态，透明 PNG               |
| 许栀·普通对话头像 | [portrait_neutral.png](../characters/xu_zhi/portrait_neutral.png)               | 1254 × 1254 | 方形头肩构图，普通状态，透明 PNG               |
| 陆沉·普通对话头像 | [portrait_neutral.png](../characters/lu_chen/portrait_neutral.png)              | 1254 × 1254 | 方形头肩构图，普通状态，透明 PNG               |
| 慧普·普通对话头像 | [portrait_neutral.png](../characters/hui_pu/portrait_neutral.png)               | 1254 × 1254 | 方形头肩构图，普通状态，透明 PNG               |
| 神公·普通对话头像 | [portrait_neutral.png](../characters/shen_gong/portrait_neutral.png)            | 1254 × 1254 | 方形头肩构图，普通状态，透明 PNG               |
| 未知人物·占位头像 | [unknown.png](../portraits/unknown.png)                                         | 1254 × 1254 | 通用透明头肩黑影；问号由界面叠加，保留头像框   |
| 铜钥匙·物品图     | [inventory.png](../props/copper_key/inventory.png)                              | 1254 × 1254 | 道具栏、背包与调查共用，透明 PNG               |
| 残页·物品图       | [inventory.png](../props/torn_page/inventory.png)                               | 1254 × 1254 | 道具栏、背包与调查共用，透明 PNG               |
| 红烛·物品图       | [unlit.png](../props/red_candle/unlit.png)                                      | 1254 × 1254 | 道具栏、背包与调查共用，透明 PNG               |
| 念珠·物品图       | [inventory.png](../props/prayer_beads/inventory.png)                            | 1254 × 1254 | 道具栏、背包与调查共用，透明 PNG               |
| 通行凭·物品图     | [inventory.png](../props/permit/inventory.png)                                  | 1254 × 1254 | 道具栏、背包与调查共用，透明 PNG               |

## 文件与生成规范

- 每个素材使用唯一固定路径，生成与调整直接替换；文稿、清单与引用同步当前内容，清理废稿和被替换图片的生成缓存，不另存版本副本。
- 不同表情、动作、时段和剧情状态用语义名称作为独立素材；同一状态的修改覆盖原文件。
- [正式物品图说明](../props/README.md)、[物品提示词](inventory_prompts.json)和[显示与文字配置](inventory_presentation.json)记录五件物品的共用方式；残页与通行凭使用独立底图，文字准确排版。
- [文件目录与校验信息](asset_catalog.json)记录路径、尺寸、透明通道与文件校验值。
- [生成规范](generation_specs.json)供后续生成同一画风的角色、场景和状态变体使用。
- [登记处分层说明](../scenes/registration/README.md)、[定位配置](../scenes/registration/layout.json)与[分层生成提示词](registration_layer_prompts.json)记录八张图片的组合方式。
- [场景生成提示词](scene_prompts.json)保存场景的当前提示词与参考图用途。
- [头像展示规则](portrait_presentation.json)规定黑影占位、问号叠加与称呼边界；帘后及未看清的门外发言保留普通 NPC 的头像框。
- [对话头像生成提示词](portrait_prompts.json)记录六张普通头像与通用黑影占位的参考、构图和当前提示词；头像不含边框、姓名和场景背景，供下方对白栏使用。
- [人物生成提示词](character_prompts.json)保存周砚、许栀、慧普和神公的完整提示词及参考图用途。
- 人物与场景、呼吸与影子等效果保持独立；后续变体沿用当前脸型、服装、机位与空间结构。
- 房牌与文本标签由准确排字提供，图片不承担文字解谜的最终内容。
- 林岚当前相机盖装在镜头前；入住后放到铜铃旁时应采用对应去盖状态，避免重复道具。
- 门、红烛、书本目前位于完整背景里；开关门、灭烛、取书等交互需要独立图层或对应状态图。
- 人物图供角色定型与姿态派生；慧普初见的帘后遮挡、神公桌后坐姿，以及换皮、石化等状态按对应场景继续制作。
- 当前原图保存在 `assets/`，游戏运行素材的接入由实现任务处理。
