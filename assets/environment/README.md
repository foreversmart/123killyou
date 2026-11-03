# 实时 3D 素材与授权

运行文件固定放在 `web/public/art/world/`，包括 `library.json`、`library.bin`、PBR WebP 和昼夜天空。运行时只读取本地资源，无素材网站请求；当前文件与材质槽以 `library.json` 为准，人物和植物实例共享网格缓冲。

可供后续离线制作评估的寺院模型与许可证核验结果见[可选寺院模型来源](temple_model_sources.md)。候选模型不会在运行时联网加载。

## Poly Haven · CC0

以下素材按 [Poly Haven CC0 许可](https://polyhaven.com/license) 使用，经过减面、尺寸统一、纹理缩放及格式转换。

| 原素材 | 当前用途 |
| --- | --- |
| [tree_small_02](https://polyhaven.com/a/tree_small_02) | 扫描近景与中景树；运行时另以 procedural_vegetation.ts 补充阔叶、针叶、垂枝和灌木树形，远山复用 tree_1 透明叶片贴图，以单片叶子区域、枝叶卡片和细干组成分片林冠 |
| [rock_moss_set_01](https://polyhaven.com/a/rock_moss_set_01) | 三种苔石 |
| [fern_02](https://polyhaven.com/a/fern_02) | 三种蕨类，按地形和道路边缘错峰散布 |
| [grass_medium_02](https://polyhaven.com/a/grass_medium_02) | 三种草丛，配合程序化随风草叶并打散苔石间距 |
| [brown_mud_leaves_01](https://polyhaven.com/a/brown_mud_leaves_01) | 泥土表面 |
| [aerial_grass_rock](https://polyhaven.com/a/aerial_grass_rock) | 山坡草地与碎石表面 |
| [weathered_brown_planks](https://polyhaven.com/a/weathered_brown_planks) | 木门、梁柱与家具 |
| [stone_tiles_02](https://polyhaven.com/a/stone_tiles_02) | 石板与石质构件 |
| [roof_tiles_14](https://polyhaven.com/a/roof_tiles_14) | 瓦面 |
| [white_plaster_02](https://polyhaven.com/a/white_plaster_02) | 寺院灰泥墙 |
| [kloofendal_48d_partly_cloudy_puresky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | 白天天空全景 |
| [moonless_golf](https://polyhaven.com/a/moonless_golf) | 夜间天空全景 |

表面采用 512² 基础色、OpenGL 法线、ARM（AO / roughness / metalness）。天空使用色调映射后的 2048 × 1024 全景，并非运行时 HDR 光照探针；其采样提供天空背景和近似环境反射。叶片与发丝的透明通道进入主 pass 和阴影 pass。

## Microsoft Rocketbox · MIT

源库：[Microsoft-Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox)，源提交 `0943055db6ec570bcef9f2c8b41c9e5467c808f9`，完整授权见 [LICENSE-Rocketbox.md](LICENSE-Rocketbox.md)。

| 本作角色 / 部件 | 源模型 |
| --- | --- |
| 林岚头部 | Adults/Female_Adult_05，f005 |
| 许栀头部 | Adults/Female_Adult_08，f008 |
| 周砚头部 | Adults/Male_Adult_02，m003 |
| 陆沉、慧普头部 | Adults/Male_Adult_14，m012；慧普另调整头颅比例 |
| 神公头部 | Adults/Male_Adult_03，m004 |
| 僧人手部 | joe.glb 的解剖手部网格，去除衣袖后绑定掌心 |
| 周砚身体 | Tidewater joe.glb，源 Professions/Wood_Male_01 |
| 林岚、许栀身体 | Tidewater marta.glb，源 Adults/Female_Adult_04 |

人物身体离线烘焙站立姿态，保留躯干、完整手臂和腿部网格，再调整服装配色。运行时肩髋负责转向，肘膝采用连续两关节混合变形；掌心和膝下锚点带动手持物与脚底接触阴影。坐姿和跪姿保留完整腿长。僧袍、相机、挎包、蓝发圈和寺院木构由本作代码制作；既有对白头像只用于对白栏。

## Minneapolis Institute of Art · CC0

大殿与偏殿使用博物馆 artsmia 发布的 [Seated bodhisattva Guanyin, 12th C. CE](https://sketchfab.com/3d-models/2c865894453743a49f8e82d57e4f0a8d) 扫描。原发布方[模型元数据](https://api.sketchfab.com/v3/models/2c865894453743a49f8e82d57e4f0a8d)标注 CC0 Public Domain，允许商业使用。下载镜像：[Artheon Museum](https://www.artheonmuseum.org/artwork/seated-bodhisattva-guanyin-12th-c-ce-2c8658)。当前来源记录见 [guanyin_source.json](guanyin_source.json)。

保留雕塑原有脸部、冠饰、盘坐、手势、衣褶和旧彩绘材质，统一高 2.55 米，减至约 5.5 万三角形；本作另制作木石供座，不再拼接人物头模或覆盖为统一铜色。GLB 转换后打包进同一素材库，运行时无外部下载。

大殿四大天王与真实和尚模型的候选来源、许可证复核和离线导入要求见 [`temple_model_sources.md`](temple_model_sources.md)，本次 API 核验快照保存在 [`guardian_monk_sources.json`](guardian_monk_sources.json)。当前运行版由 `web/src/scene/world_environment/statue.ts` 转出 `guardian_sculpture.ts` 的本地分层造像。`guardian_body.ts` 构建承重站姿、战靴、层叠甲裙、双胸甲与带獠牙的兽首肩甲；`guardian_face.ts` 构建夸张眉眼、卷曲髭须与嵌小佛像的冠饰；`guardian_attributes.ts` 构建带弦和品的斜抱琵琶、尖刃宝剑、绕臂龙及掌中珠、带伞骨和垂穗的宝伞。四尊面孔依次为赭、青绿、朱红、青蓝，搭配旧金甲胄和矿物彩绘；常规冠顶约 3.35 米，伞顶约 3.77 米。运行时不请求外部模型，也不保留并行版本。若后续完成候选 GLB 的离线清理，直接覆盖同一固定资源路径并同步本清单。

## 参考照片派生的寺院彩绘与悬塑

建筑参考采用用户提供的两张古寺照片，当前原文件固定保存在 [`temple_references/suspended_sculpture.png`](temple_references/suspended_sculpture.png) 和 [`temple_references/painted_canopy.png`](temple_references/painted_canopy.png)。前者提供青绿山石、朱红卷云、层叠人物与楼阁悬塑，后者提供彩绘梁枋、鎏金木雕、密集斗拱与莲花纹样。已尝试通过 `imagecreate` 的 custom provider / `gpt-image-2` 生成新纹理，但服务返回 HTTP 400 / `openai_error`，没有可用生成结果；当前实际运行素材来自这两张照片的透视校正与裁切。提示词、失败状态、实际来源和重建命令保存在 [`temple_ornament_prompts.json`](temple_ornament_prompts.json)。照片派生图只用于局部构件表面，不作为整张游戏背景覆盖场景。

| 材质 ID | 固定运行文件 | 用途 |
| --- | --- | --- |
| `temple_paint` | `temple_paint_albedo.webp`、`temple_paint_normal.webp`、`temple_paint_arm.webp` | 门额、牌匾背板、横梁、梁枋和龛饰的朱漆、青绿、花叶与磨损金箔 |
| `temple_relief` | `temple_relief_albedo.webp`、`temple_relief_normal.webp`、`temple_relief_arm.webp` | 大殿、偏殿与门楼墙面中的层叠彩塑、山石、云纹与楼阁 |

运行贴图均为 `web/public/art/world/` 中的 512² WebP，追加至 `library.json` 的表面索引 23、24，顶点材质 pattern 为 39、40。基础色保留照片中的矿物颜料、金箔与细密雕刻；法线和 ARM 根据局部对比度及颜色近似派生，不是扫描得到的真实凹凸或 PBR 数据。实际出挑、斗拱、边框与悬塑层次仍由本作几何构件呈现。`temple_palette.ts` 保持烟暗朱漆、矿物青绿、靛色和旧金的统一材质，`temple_ornament.ts` 复用同一装饰构件。山门与道路远景共享建筑，生活房间按用途保留更多木墙和灰泥，礼佛空间采用较密的龛饰。处理和更新覆盖固定文件，不保留同状态修订副本。

从上述当前参考照片重建建筑纹理：

```sh
uv run scripts/art_assets/extract_temple_surfaces.py
node scripts/art_assets/temple_surfaces.mjs
```

第一步对花卉梁带作透视校正、对悬塑画面作裁切，写入临时中间图；第二步生成六张当前 WebP、在固定槽位登记，并删除临时中间图。两步均只处理本地照片，不调用生成服务。

## 离线重建

安装项目依赖后运行：

```sh
node scripts/art_assets/build.mjs /path/to/source /path/to/tidewater/public/models/characters
```

第一个目录需按以下布局准备；原文件均可通过对应素材页或 `https://api.polyhaven.com/files/<asset>` 获取。

- 模型：`<asset>/<asset>.gltf`，其 bin 和 textures 保持 glTF 的相对路径。使用 1k glTF 包；树、蕨、草的透明图另保存为 `<asset>_alpha.png`。树使用 leaves_alpha，其他植物使用对应 alpha。
- 表面：六种材质的 1k JPG 分别命名为 `<asset>_Diffuse.jpg`、`<asset>_nor_gl.jpg`、`<asset>_arm.jpg`。
- 天空：Poly Haven 的色调映射全景 JPEG，分别保存为 `sky_day.jpg`、`moonless_golf.jpg`。
- 人头：`heads/<Adult_ID>/<Adult_ID>.fbx`，取源库 `Assets/Avatars/Adults/<Adult_ID>/Export/`；同目录放 Textures 内对应的 `<prefix>_head_color.tga`、`<prefix>_head_normal.tga`。三名游客另需 `<prefix>_opacity_color.tga`。
- 观音：将上述模型的 GLB 保存为第一个目录中的 guanyin.glb；statue.mjs 读取原始贴图、统一坐标并减面。
- 第二个目录提供已有 MIT 转换文件 `joe.glb`、`marta.glb` 和 `LICENSE-Rocketbox.md`。

`gltf.mjs` 读取网格，`pose.mjs` 烘焙姿态，`heads.mjs` 读取 FBX/TGA，`foliage.mjs` 保留树冠密度，`library.mjs` 打包纹理和二进制。保存前，`preserve_surfaces.mjs` 核对基础材质槽次序，并保留当前素材库尾部已登记的建筑彩绘、悬塑、天王等附加表面；这些贴图必须保持可解码的 512² WebP，文件名、原字节与追加顺序不变。基础槽重排、附加文件丢失或尺寸不符时明确失败，避免生成引用错位的清单。首次从空目录重建时，需先按对应生成规范准备并登记本作附加材质，再运行游戏。Three.js 与 meshoptimizer 仅作离线工具。每次重建覆盖固定路径，不保留修订副本；改换素材后删除未被清单引用的文件。

观音约 5.5 万三角形；近树约 5.6 万三角形，远树约 1.3 万；岩石每种约 4500，植被每种约 800–1800，头部约 3000–4000。山地密林按距离使用近景扫描树、中景减面树和远景枝叶卡片林冠；远景复用既有透明贴图、带有细树干并合并成一个网格，与扫描树群交错分布。山门背景与公路的寺院使用 `templeCompound(true)`，保留全部 14 个建筑锚点和主要彩绘轮廓，远处小雕像及纹样用同一悬塑贴图承载；寺院合并几何约 58.8 万三角形、57 MiB，不含地形、植被、人物与道具。近看山门与室内保持完整雕饰。渲染使用 mipmap、远树关闭阴影、共享网格、分辨率上限与隐藏页面暂停。实际性能取决于显卡；资源完整性、场景状态与浏览器绘制分别验证。
