# 《红烛无声》当前素材用途

## 场景与人物

正式画面采用原生 WebGPU 的写实 3D 场景。原图保留为本作角色、服装和建筑的美术依据；运行时不再将完整插画作为房间、旅途或道具的替代画面。

| 内容           | 当前呈现与资源                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 开场片头       | 原 opening.mp4 和 title_card 不变；片头之后的大巴行车、停门与返程改为 3D 大巴和山路；行车段播放 `opening_bus_horror.mp3`，停门前渐弱                                                                                                                                                                                                                                                                        |
| 山门           | PBR 木构与门叶、连续山坡、Poly Haven 林木、草地和苔石；保留匾额、台阶、大巴、铜铃、花猫和旅行包                                                                                                                                                                                                                                                                                                             |
| 建筑彩绘与悬塑 | 山门、殿宇、回廊和室内共享朱漆、青绿与旧金梁枋、立体斗拱和卷云；礼佛空间使用层叠悬塑壁龛。`temple_paint` / `temple_relief` 的六张固定 WebP 来自用户参考照片透视校正与裁切，法线和 ARM 为本地近似值；远景减少小构件但保留同一纹理与主要轮廓                                                                                                                                                                  |
| 登记室         | 3D 登记桌、可开合外观的簿册、铜钥匙和四块房牌；陆沉坐在桌后，仅执笔手随书写动作移动，笔尖与簿册对齐                                                                                                                                                                                                                                                                                                         |
| 东院回廊       | 同一套 3D 门框、房牌、窗格、廊柱和檐灯；日光、夜色、晨光读取剧情状态。回廊位于登记室与大雄宝殿/东侧偏殿之间，两端以木梁、石阶、旧匾和檐灯端景相连，人物主要在回廊中完成进出与行走                                                                                                                                                                                                                           |
| 斋堂           | 3D 桌椅、四碗粥、木勺、馒头与三碟素菜；各人空满碗使用 meal_*_ate 状态，喝粥时唯一的碗转到手中、素食使用筷子；慧普仅在指定帘后镜头可见                                                                                                                                                                                                                                                                       |
| 斋堂餐具动作   | 吃粥者的勺子以手部局部坐标绑定，低位锚到手中碗沿，抬起时平滑送到下唇，再沿同一路径回碗；俯仰、侧滚和轻微腕摆由 `mealUtensilRotation` 驱动，避免漂浮或穿过嘴部                                                                                                                                                                                                                                               |
| 门房           | 床、矮桌、书册、烛台、门闩与未点油灯；red_candle_lit 同时控制火焰和局部暖光                                                                                                                                                                                                                                                                                                                                 |
| 偷听           | 同一间暗室的半掩门、花瓶、鸟笼、猫食碟；只显示后端允许看见的人物，碎瓷读取 vase_broken                                                                                                                                                                                                                                                                                                                      |
| 偏殿           | 博物馆 CC0 观音扫描及木石供座、神公、杯筊桌与引路烛；杯面采用后端投掷结果，失败石化、成功引路仍依原分支                                                                                                                                                                                                                                                                                                     |
| 大殿四天王     | `assets/environment/guardian_monk_sources.json` 中的 CC0 Dvarapala / Nio Temple Guardian 仅作比例与法器参考；运行时由 `world_environment/statue.ts` 转出 `guardian_sculpture.ts` 的分层本地造像。四尊固定为带弦琵琶、宝剑、绕臂龙珠、伞骨宝伞，使用赭/青绿/朱红/青蓝面孔、旧金甲片、卷曲髭须、嵌佛冠饰、兽首肩甲和飘带，低位铜灯与冷色环境光共同刻出体积；本地材质由 `guardian_materials.ts` 指向固定纹理槽 |
| 换皮与死亡     | 沿用真实同行者的服装与头部纹理；抓挠、伏身和死亡扑近使用网格动画，重试与重新开始入口保留                                                                                                                                                                                                                                                                                                                    |
| 阅读证据       | 原经文、寺史内容、通行凭、拖痕发现气泡和碗签仍可读；一般实体调查改用 3D 摄像机近看                                                                                                                                                                                                                                                                                                                          |

## 人物外形与头像

- 赵熙：青年男性，短碎黑发、橄榄灰立领拉链夹克、暖米色圆领针织、炭灰直筒裤和深色步行鞋；神态警觉克制，无挎包和手持物。发型、领型、服装主色与配件均与周砚区分。固定全身定型图为 [standing.png](../characters/zhao_xi/standing.png)，由 imagecreate 使用自定义 provider 的 gpt-image-2 文字生成，保留并清理返回 PNG 的透明通道；当前只作人物美术参考。
- 赵熙的当前 3D 运行源为 [zhaoxi.zip](../characters/zhao_xi/zhaoxi.zip)，含 53 根原生骨骼；运行时复用 `npc_rigged.zip` 的通用动作，并在 `room_sleep_wait` / `escape_sleep_wait` 用程序姿势驱动上床与躺卧。
- 林岚：短深发、棕砂色外套、米色内搭、深色裤与相机。
- 周砚：短深发、深蓝外套、灰色内搭、挎包与修缮图。
- 许栀：长深发、灰绿外套、米白内搭、浅色帆布包与蓝发圈。
- 陆沉：剃发、灰褐僧衣、深色腰带，保留登记、迎接与递烛动作。
- 慧普：剃发、赭色僧衣和深褐搭衣；3D 运行源为 `assets/characters/hui_pu/huipu.zip`，保留 60 根原生骨骼并复用 `npc_rigged.zip` 动作；显形条件继续由后端控制。
- 神公：年老、剃发、深褐僧衣；桌后坐姿、石化和引路读取原剧情状态。

正面全身 T-pose 建模参考固定为 [赵熙](../characters/zhao_xi/t_pose.png)、[林岚](../characters/lin_lan/t_pose.png)、[周砚](../characters/zhou_yan/t_pose.png)、[许栀](../characters/xu_zhi/t_pose.png)、[陆沉](../characters/lu_chen/t_pose.png)、[慧普](../characters/hui_pu/t_pose.png)、[神公](../characters/shen_gong/t_pose.png)各自目录下的 `t_pose.png`；人物比例、服装与生成约束见 [T-pose 提示词](t_pose_prompts.json)。它们用于美术与建模，剧情站姿和运行时动作仍使用各自资源。

人物使用 Microsoft Rocketbox 的立体头模与皮肤材质，游客有衣褶与手部网格，僧人使用无帽头模、解剖手部和连续僧袍；肘膝连续变形，手持物跟随掌心。原普通头像不再投射到 3D 脸上。对白栏原表情头像、语音音色、台词归属和 NPC 提示词不变。主角由第一视角摄像机代表，未确认的门外声源没有可见模型。

## 实现与来源

- 模型与材质：web/src/scene/world_environment、world_character、world_prop、geometry、renderer。
- 分镜与交互：web/src/scene/world；微光热点由三维位置投影，不依赖背景图坐标。
- 造型参照：assets/scenes、assets/characters、assets/props 下的现有原图。
- 寺院建筑参考与局部表面来源：`assets/environment/temple_references/` 的两张用户照片，实际处理链与未成功的图像生成状态见 [temple_ornament_prompts.json](../environment/temple_ornament_prompts.json)；可用 `extract_temple_surfaces.py` 与 `temple_surfaces.mjs` 从当前原图重建。
- 方法参照：同级 Tidewater 的原生 WebGPU、GeoKit、GameMaterials 和 Vendor；授权见 docs/tidewater_license.txt。
- Poly Haven 提供 CC0 植被、岩石、PBR 表面与昼夜天空；Microsoft Rocketbox 提供 MIT 人物，Minneapolis Institute of Art 提供 CC0 观音扫描。完整映射与授权见 [环境素材](../environment/README.md)。
- Poly Haven 检索没有符合剧情的中国僧人或四大天王人物模型，因此只承担环境材质来源；僧人和天王的可追溯候选、API 许可证快照与离线导入要求见 [guardian_monk_sources.json](../environment/guardian_monk_sources.json) 和 [寺院模型来源](../environment/temple_model_sources.md)。
- 天空随摄像机方向取样，假报晓保持夜景；叶片透明轮廓同时用于画面与阴影。

仅在启动能力检查通过后加载游戏。GPU 不可用或中途丢失时显示说明并阻止继续剧情，不提供静态图片或普通 HTML 场景降级。
