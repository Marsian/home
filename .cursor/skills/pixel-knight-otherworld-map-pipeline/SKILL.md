---
name: pixel-knight-otherworld-map-pipeline
description: >-
  Generate, package, register, and verify Pixel Knight otherworld dungeon maps.
  Use when adding or rebuilding playable otherworld maps, generating full-map
  imagegen backdrops, slicing blue-screen map atoms by connected components,
  defining monster clusters, or validating dungeon map connectivity and combat spaces.
---

# Pixel Knight 异界地图流水线

面向 **Agent**：新增或重做异界地图时，必须走地图包流程。异界“迷宫”不是窄通道迷宫，而是复杂副本：多个可战斗区域、林间空地、房间或大通道连成闭合关卡，能产生怪物并展开战斗。

## 目录约定

每张地图一个目录：

```text
src/game-center/pixel-knight/maps/<slug>/
  backdrop.png
  map.meta.json
  obstacles16.v1.json
  placements.v1.json
  source-green/<slug>-atoms-bluescreen.png
  atoms/*.png
  <slug>Map.ts
```

- `<slug>` 与 `DungeonId` 尽量一致，例如 `autumn-wood`。
- `backdrop.png` 是整张可玩地图底图，不是入口选择面板。
- `source-green/` 保留 imagegen 原始蓝底素材页，便于以后重切；目录名是历史遗留，文件必须优先使用 `*-atoms-bluescreen.png`。
- `atoms/` 是从蓝底素材页按连通域切出的透明 PNG，用于遮挡、深度排序和编辑器复用。

## Imagegen：整张地图

地图底图必须一次性生成完整副本，不要拼贴零散地块。Prompt 必须明确：

- top-down / orthographic 16-bit pixel-art RPG map。
- 复杂副本拓扑：多个宽敞 combat arenas / clearings / rooms，由宽通道连接，有分支和回环。
- 闭合外边界，start 与 portal 清晰，start 到 portal 视觉连续。
- 尺寸目标是 4-6 个 960x540 屏幕。当前运行时推荐最终落地为 `2048x1280`。
- 无 UI、无标签、无文字、无角色、无怪物、无水印。

不要使用“narrow maze / labyrinth / single-tile corridors”之类描述，除非用户明确要求传统迷宫。

## 素材页：必须与整图同源

零散素材必须严格对应 `backdrop.png` 上实际出现的素材。不要再用 imagegen 对素材页做第二次自由发挥；那会导致树、石柱、桥、传送门等细节与整图不匹配。

硬性规则：

- 先生成并确认最终 `backdrop.png`。
- 将 `backdrop.png` 作为 imagegen 输入参考，直接生成严格匹配整图物件的蓝底素材页；不能凭文字重新发挥一套“类似风格”素材。
- 素材页中的对象必须是完整、干净、独立的物件，不能是从整图截图硬裁出来的局部，也不能缺少整图里承担遮挡/交互/深度排序的关键对象。
- `portal`、主要树木/建筑/桥/台阶/石墙/大型遮挡物等关键对象必须在素材页里出现；没有出现就重做素材页，不要在代码或配置里假装它存在。
- 背景必须使用纯蓝 `#0000ff`，不要用绿底；传送门、水、苔藓等素材含有大量绿色/青色，绿底会破坏 cutout。
- 素材页不要求对象落在固定格子里；只要对象彼此分离、背景纯色、没有重叠即可。不要用格子坐标裁剪素材。
- 对象命名来自人工维护的 `atom-names.json`，顺序对应连通域按行排序后的对象顺序，不是脚本内置定义。
- `source-green/<slug>-atoms-bluescreen.png` 是这张参考生成的蓝底素材页；`atoms/*.png` 从它切出。

不能接受“风格相似但不是同一物件语义”的素材，也不能接受从 `backdrop.png` 直接截图裁出的不完整素材。
不要把素材擅自写进素材定义/registry 文件。`atoms/*.png` 是唯一素材来源；配置里的 `assetKey` 只能引用已经存在的 atom 文件名。

## 生成地图包

把最终 `backdrop.png` 与参考生成的蓝底素材页保存到地图目录后运行：

```bash
python3 scripts/pixel-knight/build-otherworld-map-pack.py \
  --map-dir src/game-center/pixel-knight/maps/<slug> \
  --source-sheet src/game-center/pixel-knight/maps/<slug>/source-green/<slug>-atoms-bluescreen.png \
  --atom-names src/game-center/pixel-knight/maps/<slug>/source-green/atom-names.json \
  --key-color '#0000ff' \
  --min-area 5000 \
  --min-width 40 \
  --min-height 40
```

脚本职责：

- 按蓝底连通域从 `source-green/<slug>-atoms-bluescreen.png` 切出 `atoms/*.png`。
- 生成 `atoms.pipeline.json`，记录真实切片结果。
- 如果连通域数量与 `atom-names.json` 数量不一致，脚本必须失败；调门槛或重做素材页，不要默默少切/错命名。
- 默认只重切 atoms，不碰 `placements.v1.json`、`obstacles16.v1.json`、`map.meta.json`。
- 只有第一次 bootstrap 新地图时才允许显式加 `--write-map-json` 生成基础 JSON；一旦进入地图编辑器人工调整后，禁止再用该参数，避免覆盖障碍/交互/摆放配置。

脚本可作为模板扩展新地图，但不要把新地图长期塞进 `starter-village` 专用脚本。

## Monster Clusters

`map.meta.json` 的 `monsterClusters` 是运行时刷怪来源。每组至少包含：

- `id`
- `kinds`
- `clusterCount: { min, max }`
- `membersPerCluster: { min, max }`
- `eliteChance`
- `safeRadiusFromStart`
- `safeRadiusFromPortal`
- `archetype: "melee" | "ranged" | "mixed"`

原则：

- start 附近留安全区，不落怪。
- portal 附近可以有压力，但不能直接堵死撤离。
- 房间/空地面积要支撑同一 cluster 的成员散开。
- 难度倍率继续交给 `difficultyConfigs`，地图 meta 不写难度专属数值。

## 接入与验证

接入运行时：

- 在地图目录创建 `<slug>Map.ts`，参考 `maps/autumn-wood/autumnWoodMap.ts`。
- 在 `maps/otherworldRegistry.ts` 注册 `dungeonId -> map pack`。
- 不要逐个注册 atoms；运行时通过 `maps/*/backdrop.png` 和 `maps/*/atoms/*.png` 扫描素材。
- 只有 registry 中存在的 `DungeonId` 可在异界入口点击「进入」。

验证：

```bash
node scripts/pixel-knight/validate-otherworld-map-pack.mjs <slug>
npm run build
```

必须确认：

- 地图面积为 4-6 个 960x540 屏幕。
- 外边界闭合。
- start 到 portal 可达。
- 可达区域足够大，包含多个战斗区域。
- 进入游戏后摄像机、碰撞、小地图、随机怪物、portal 返回村庄都正常。
