# 实时 3D 素材与授权

运行文件固定放在 `web/public/art/world/`，包括 `library.json`、`library.bin`、PBR WebP 和昼夜天空。运行时只读取本地资源，无素材网站请求。当前约 20.0 MiB，73 个文件；人物和植物实例共享网格缓冲。

## Poly Haven · CC0

以下素材按 [Poly Haven CC0 许可](https://polyhaven.com/license) 使用，经过减面、尺寸统一、纹理缩放及格式转换。

| 原素材 | 当前用途 |
| --- | --- |
| [tree_small_02](https://polyhaven.com/a/tree_small_02) | 近景与远景树，按独立叶片减面以保留树冠覆盖 |
| [rock_moss_set_01](https://polyhaven.com/a/rock_moss_set_01) | 三种苔石 |
| [fern_02](https://polyhaven.com/a/fern_02) | 三种蕨类 |
| [grass_medium_02](https://polyhaven.com/a/grass_medium_02) | 三种草丛，配合程序化随风草叶 |
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

`gltf.mjs` 读取网格，`pose.mjs` 烘焙姿态，`heads.mjs` 读取 FBX/TGA，`foliage.mjs` 保留树冠密度，`library.mjs` 打包纹理和二进制。Three.js 与 meshoptimizer 仅作离线工具。每次重建覆盖固定路径，不保留修订副本；改换素材后删除未被清单引用的文件。

观音约 5.5 万三角形；近树约 5.6 万三角形，远树约 1.3 万；岩石每种约 4500，植被每种约 800–1800，头部约 3000–4000。渲染使用 mipmap、远树关闭阴影、共享网格、分辨率上限与隐藏页面暂停。实际性能取决于显卡；资源完整性、场景状态与浏览器绘制分别验证。
