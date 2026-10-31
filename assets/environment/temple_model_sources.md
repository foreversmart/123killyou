# 可选寺院模型来源

本清单记录在 2026-10-31 通过 Sketchfab v3 API 核验过的可获取模型。它们只作为离线制作候选，不会被浏览器运行时直接请求。下载后必须先转为 GLB、统一米制尺寸、减面并登记到 `assets/environment/README.md`；没有完成署名和许可证核对前，不把源文件放入 `web/public/art/world/`。

## 可用于商业项目（需要署名）

| 模型 | 作者 | 许可证 | 下载与元数据 |
| --- | --- | --- | --- |
| [Japanese Temple](https://sketchfab.com/3d-models/japanese-temple-5917e267ca3e48ac8a27f9ec5809fc29) | galaxxxy | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；API 标记 `isDownloadable=true`，商业可用，必须署名 | [API 元数据](https://api.sketchfab.com/v3/models/5917e267ca3e48ac8a27f9ec5809fc29) |
| [Chinese Temple](https://sketchfab.com/3d-models/chinese-temple-01c6a525a8144693b1eb2446f761051c) | Thost / Thomas.Osterhammel | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；API 标记 `isDownloadable=true`，商业可用，必须署名 | [API 元数据](https://api.sketchfab.com/v3/models/01c6a525a8144693b1eb2446f761051c) |
| [Incense Burner](https://sketchfab.com/3d-models/incense-burner-82d7a79c62f94c979f02c2ced6126780) | Joseph Casetta / jcasetta | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；API 标记 `isDownloadable=true`，商业可用，必须署名 | [API 元数据](https://api.sketchfab.com/v3/models/82d7a79c62f94c979f02c2ced6126780) |

署名应包含模型名、作者名、Sketchfab 页面和 CC BY 4.0 链接，并随发布包保留。模型页面的当前授权状态可能变化；每次实际下载前重新读取 API 元数据。

## 已确认可用的 CC0 参考

项目已采用 [Seated bodhisattva Guanyin, 12th C. CE](https://sketchfab.com/3d-models/2c865894453743a49f8e82d57e4f0a8d)，发布者为 Minneapolis Institute of Art，API 元数据标记 CC0-1.0。来源、下载镜像和离线处理记录见 [`guanyin_source.json`](guanyin_source.json)。Poly Haven 的屋面、木材、石材、植被和天空继续按 [Poly Haven CC0](https://polyhaven.com/license) 使用，清单见 [`README.md`](README.md)。

同一发布方还提供可下载的 [Dvarapala (Guardian Figure)](https://api.sketchfab.com/v3/models/9b2c5e718b714964afb8482cc702d386)、[Nio Temple Guardian](https://api.sketchfab.com/v3/models/bba1547659574d4fad26da6e6d00f77f)、[Lidded incense burner](https://api.sketchfab.com/v3/models/6469bce920fc45abbb065eb6915d7ce4) 和 [12th C. CE Water-Moon Guanyin](https://api.sketchfab.com/v3/models/f3316610c8b740c595c22ca1d7df54ca)。截至本次核验，这些页面的 API 元数据标为 CC0；实际下载前仍需重新读取 API 并保存对应的 `source.json`，不能仅凭搜索结果或页面标题判断许可。

## 四大天王与僧人模型候选（优先核验）

为替换当前程序化占位造像，优先从以下真实造像模型中选择离线来源。它们都来自可追溯的 Sketchfab API 记录，适合在 Blender 中统一为米制、保留法器和衣褶后导出 GLB；运行时仍只读取本地 `web/public/art/world/`，不会向模型站点发请求。

| 用途 | 候选模型 | 授权核验 | 处理要求 |
| --- | --- | --- | --- |
| 四大天王近景 | [Dvarapala (Guardian Figure), 8th century CE](https://sketchfab.com/3d-models/dvarapala-guardian-figure-8th-century-ce-9b2c5e718b714964afb8482cc702d386) | Minneapolis Institute of Art，API 标记 CC0（下载前复核） | 保留盔甲、面部和武器；按持琵琶、剑、龙珠、宝伞分别摆位 |
| 四大天王侧龛 | [Nio Temple Guardian](https://sketchfab.com/3d-models/nio-temple-guardian-bba1547659574d4fad26da6e6d00f77f) | API 标记 CC0（下载前复核） | 只取单尊网格，减面后烘焙法线，避免整组底座重复 |
| 真实和尚模型 | [10th C BCE Chinese monk](https://sketchfab.com/3d-models/10th-c-bce-chinese-monk-c6efb650b99c45928b3f0c9b89006a60) | Minneapolis Institute of Art，API 标记 CC0、可下载（下载前复核） | 取僧袍层次、剃发头部和坐姿比例；转为统一米制后作为陆沉/神公参考或可替换近景模型 |
| 现实人物比例参考 | [Chinese warrior monk](https://sketchfab.com/3d-models/chinese-warrior-monk-a2d011713d2b4dbdbdcabd108ea9cea1) | fayjayfay，API 标记 CC BY 4.0、可下载（必须署名） | 只参考肩髋、手臂和步态比例；不得把武僧盔甲直接用于寺院接待和尚 |

实际采用前需把 API 响应、作者、页面 URL 和许可证随素材登记，并覆盖固定资源路径；未完成下载、清理和署名核对时，继续使用 `statue.ts` 的本地造像实现。

远景建筑可参考 [Model of the Golden Temple, Wan fa Gui yi Hall](https://api.sketchfab.com/v3/models/97673d5721d743328022c282b77b33ae)，发布者 API 标记为 CC0 Public Domain；若采用，仍按同一离线 GLB 清理流程处理。

## 不应直接采用的结果

[Chinese Temple Pagoda](https://sketchfab.com/3d-models/chinese-temple-pagoda-e1a9cd5024f24b6aa4a7ee90a29d727b) 和 [Chinese Temple Gate](https://sketchfab.com/3d-models/chinese-temple-gate-fdf7e0a8539c43dcbf751668b6e8b078) 的 API 元数据未提供开放许可证，且标记为不可下载；页面说明它们属于商业模型包。它们只能作为建筑比例参考，不能复制网格、贴图或下载后打包。

## Poly Haven 检索结论（2026-10-31）

Poly Haven 的公开 CC0 资源适合屋面、木材、石材、植被和天空材质；其模型目录没有满足本作中国僧人或四大天王造像要求的可下载人物模型。因此人物与造像候选使用上表中可追溯的 Sketchfab 博物馆模型，Poly Haven 只作为环境材质来源，不把普通人物或不明来源模型当作剧情角色。
