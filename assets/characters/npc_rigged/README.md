# NPC 骨骼动画源

`npc_rigged.blend` 是 NPC 通用骨架和动作的当前 Blender 源文件，`build_npc_rig.py` 用 Blender 5.2 重建 GLB 后压缩为 `web/public/art/world/npc_rigged.zip`。运行时先解压 ZIP 中的 GLB，再读取动作通道。

骨架使用稳定的语义骨骼名：`root`、`pelvis`、`spine`、`chest`、`neck`、`head`，以及左右两侧的 `upper_arm`、`forearm`、`hand`、`thigh`、`shin`、`foot`。每个动作都采用 30 fps、明确的接触帧和缓入缓出。运行时读取 GLB 的动画通道，采样骨骼姿态并驱动 NPC 角色节点；林岚、陆沉、许栀和慧普再把这些姿态和既有程序动作重定向到各自的蒙皮骨架，使用与模型对齐的骨骼绑定姿态。

林岚模型唯一源文件为 `assets/characters/lin_lan/lin_lan.zip`，陆沉模型唯一源文件为 `assets/characters/lu_chen/lu_chen.zip`，许栀模型唯一源文件为 `assets/characters/xu_zhi/xu_zhi.zip`，慧普模型唯一源文件为 `assets/characters/hui_pu/huipu.zip`，均不由本目录的通用预览人体重建。`scripts/art_assets/pack_skinned_character.mjs` 负责对齐骨骼关节点、通过 Blender 骨热重新绑定并平滑权重、简化连续网格与打包 512² 材质；运行时以每顶点最多四项权重执行 GPU 蒙皮，手持物和脚底接触位置随骨骼更新。许栀、陆沉和慧普使用 `pack_native_skinned_character.mjs`，分别保留 37、57、60 根原生骨骼，并复用同一动作重定向。扫描相机与手掌、衣物的接触面按语义分离，原空闲 `neutral_bone` 专门驱动内嵌相机；相机控制节点不新增几何。源 GLB 没有内嵌动作，站、坐、跪及各分镜动作继续使用现有触发条件。

动作片段：

- `walk`：交替迈步、膝盖抬升、手臂反向摆动和根节点轻微起伏。
- `welcome`：迎客时抬手、短促挥手、身体前倾和视线对齐。
- `observe`：头部慢速扫视，胸腔跟随，手臂保持放松。
- `write`：身体靠近桌面，支撑手固定，持笔手做短行程书写。
- `eat`：餐具从碗到嘴的往返，头部轻微点动，避免手腕翻转。
- `offer_candle`：递烛时肩、肘、腕连续伸展，躯干和视线跟随。
- `night`：夜间谨慎呼吸、收臂护身、低头观察。
- `turn_body`：骨盆、胸腔和头部错峰旋转，避免整块身体扭折。

重新生成：

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets/characters/npc_rigged/build_npc_rig.py
```

ZIP 内的 GLB 保留全部命名动作。WebGPU 运行时解压并解析这些动作，供现有角色节点和林岚的蒙皮骨架使用；动作只更新演出，剧情规则、台词、道具得失与存档仍由原状态决定。
