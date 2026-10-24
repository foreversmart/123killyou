# 游戏界面概念图 v2：全程语音操作

> 操作约定更新（2026-10-24）：当前使用按住空格说话、松开发送；下方英文提示词保留生成概念图时的历史记录，其中持续聆听和无键盘提示的要求已被当前交互取代。
日期：2026-10-24

- 图像：[game-interface-v2.png](../../assets/concepts/game-interface-v2.png)
- 当前交互方向以本版为准。
- 生成方式：内置 image_gen，局部编辑。
- 场景：“第一夜 · 休息室”，仍为视觉验证占位内容，不代表剧本定稿。
- 形式：静态界面概念图；目前已据此制作初始网页原型，见 [启动说明](../../README.md) 与 [素材切图](assets-and-slicing.md)。

## 本轮明确的需求

操作方式已于 2026-10-24 更新为按住空格说话、松开发送，以避免 NPC 音频被识别为玩家输入。游戏动作仍通过自然语音表达，不要求鼠标选择对象。语音覆盖 NPC 对话、交付道具、切换房间、查看与关闭地图、观察物件、浏览背包等操作。

系统操作需要与 NPC 对话区分；例如“看看地图”不进入 NPC 对话或虔诚度判定。指代或目标不明确时通过语音追问。前端展示聆听状态、识别文本与执行结果；本图示意了聆听状态，其他运行状态和识别结果后续设计。

## 界面设计

- 语音区显示波形与“正在聆听”状态。
- 场景通过语音导航和观察，不设置点击导航箭头或鼠标检查图标。
- 顶部显示“语音已连接”。
- 道具栏继续展示持有物品，底部改为语音可查看的信息提示。
- 增加“直接说出你的行动”与自然语言操作示例。
- 包含固定视角房间、角色头像、旧纸与灰褐美术风格、道具栏及状态栏。

## 最终编辑提示词

网页迭代补充：已移除底部“直接说出你的行动”和固定语音示例；对话区高度从画幅的 22.7% 缩小到 14%，同时缩小人物头像，房间区域提高到 77.7%。识别到的语音仅在人物名称旁简要回显。静态概念图保留为美术参考，当前布局以网页为准。

```text
Use case: precise-object-edit / ui-mockup.
Input image 1 is the EDIT TARGET, the existing complete game interface. Create revision v2 of this exact screenshot for a fully hands-free VOICE-ONLY game. Preserve the same landscape framing, room composition, seated attendant, player portrait, attendant portrait, amber oil lamp, corridor, aged charcoal/sepia/olive art style, top location label, devotion meter, props and illustrated inventory items. Preserve all scene art and character identities. Make targeted changes to interaction affordances only.
Critical product requirement: after initial setup the game continuously listens, with no mouse, no keyboard, no push-to-talk. Players speak naturally to move rooms, inspect items, give items to NPCs and open/close the map.
Changes:
1. Remove the large circular microphone PUSH BUTTON and its label "按住说话" from the lower right dialogue area. Replace it with a quiet horizontal PASSIVE voice status area integrated directly in the panel, without a button border: a small muted amber listening dot, a low amber/gray waveform, and exact Chinese text "正在聆听". It is an indicator, not something to press. Do not imply that the player needs to click.
2. Remove "按住空格说话" at the bottom. Replace this footer with small legible subdued text, verbatim: "直接说出你的行动". Then a slightly smaller secondary line of voice examples, verbatim: "看看地图 · 去走廊 · 把铜钥匙给守夜人". Ensure this fits cleanly within the dialogue panel without overlapping the portrait or status area. Preserve main NPC dialogue "夜里不该有人来这里。你找谁？" and name "守夜人".
3. Remove both left and right clickable-looking navigation chevrons from the room edges. Restore the room art beneath them seamlessly. Room movement is by voice.
4. Remove the magnifying glass/hotspot circle over the open ledger. Restore the ledger art. Inspection is by voice.
5. The inventory stays as a visible display of possessions, not an action toolbar. Preserve the four item illustrations and six-slot structure. At its bottom replace the two boxed shortcut buttons with a single narrow unboxed paper-style hint area: exact heading "语音可查看", with small map and journal glyphs and text "地图 / 线索 / 手记". No surrounding button borders. Keep the overall right rail border and heading "随身物品".
6. Remove the speaker and gear click-target icons at the top right. Replace with understated unboxed passive text "语音已连接" and a tiny amber status dot.
Constraints: no microphone button, no click prompts, no keyboard keys, no cursor, no "按住" text anywhere in the final image, no left/right navigation buttons, no numbered choice buttons. Maintain the original excellent art and room visual proportions, do not redesign the scene, do not add characters, do not add posters or logos. Chinese copy should be crisp and exactly as specified. One coherent finished game screenshot, not an explanation sheet.
```
