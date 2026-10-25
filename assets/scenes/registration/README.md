# 登记处 · 下午分层素材

用于 [mini_script.md 第02幕“登记与入住”](../../../story/mini_script.md#02登记与入住东院四间偏房)，表现陆沉接待、查看登记簿、交付钥匙和通行凭及分配四间房。逐张用途与显示边界见 [素材用途总表](../../generation/asset_usage.md#十二幕对应关系)。

基准画布为 1672 × 941，沿用固定第一人称机位与晴日下午光照。八张图片均由内置 image_gen 生成；同一素材始终使用固定路径。当前图层如下：

| 图层       | 文件                                                     | 内容                                   |
| ---------- | -------------------------------------------------------- | -------------------------------------- |
| 背景       | [registration_afternoon.png](registration_afternoon.png) | 木构、墙、窗、地面、通道和四个固定挂钩 |
| 桌前景     | [desk_foreground.png](desk_foreground.png)               | 登记桌、左侧柜台、笔与空托盘，透明     |
| 登记簿打开 | [ledger_open.png](props/ledger_open.png)                 | 空白表格、封皮与页边，透明             |
| 登记簿合上 | [ledger_closed.png](props/ledger_closed.png)             | 同一本书的封面与空白标签，透明         |
| 铜钥匙     | [copper_key.png](props/copper_key.png)                   | 单枚可领取房门钥匙，透明               |
| 通行凭纸叠 | [permit_stack.png](props/permit_stack.png)               | 空白纸叠，透明                         |
| 单张通行凭 | [permit_single.png](props/permit_single.png)             | 空白单页，透明                         |
| 通用铜房牌 | [room_tag.png](props/room_tag.png)                       | 小连接环与空白牌面，透明；四处复用     |

[layout.json](layout.json) 记录原图尺寸、透明通道、校验值、取样区域、目标矩形、锚点及叠放顺序。各 PNG 保留生成的原始像素和透明通道；道具按 sourceFrame 取样后映射到 rect，不能把整张透明画布直接缩进目标矩形。铜钥匙原图为 1671 × 941，其余为 1672 × 941，配置已逐张记录。

叠放顺序为背景 → 铜房牌与准确文字 → 人物 → 桌前景 → 桌面道具。房牌图片复用四次，听、灯、纸、门由精确文字叠加。桌层负责遮住人物下半身。actorPreview 使用陆沉的白日接待站姿，双手与钥匙适合登记交接。人物保持原始宽高比，按 sourceFrame 等比缩放；高度为 1030.8，以水平中心 x=860、桌后遮挡线 y=637 定位，宽度由原始比例计算。原 PNG 保持生成像素，不重采样。

登记簿开合为互斥状态；领取钥匙后隐藏桌面钥匙层。通行凭纸叠表示待发存量，单张用于交付或检查；领取一张不意味着整叠消失。运行时已按分镜叠加桌前景、登记簿、铜钥匙、通行凭与房牌，正式交互、道具归属和存档恢复由后端状态驱动。

当前提示词与后续派生规范见 [registration_layer_prompts.json](../../generation/registration_layer_prompts.json)。其他场景及人物见 [素材目录](../../generation/README.md)。
