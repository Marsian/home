# Pixel Knight 新手村场景 v4 落地基线

日期：2026-04-28  
范围：新手村地图与坐标、地表补丁与砖路、村庄 HUD 与静态地表渲染  
状态：已实现场景基线（封版）

## 目录

- [01-实现结果摘要](./01-实现结果摘要.md)
- [02-素材与布局规格](./02-素材与布局规格.md)
- [03-迭代决策记录](./03-迭代决策记录.md)

## 本版本结论

v4 承接 `pixel-knight-design-baseline-v3`（角色选择首页与加载页基线），将**村庄游玩场景**收口为可验收的实现基线：砍掉外围无建筑的草地边带，用地表 patch（草地平铺 + 砖路）表达道路与场地，并配合 HUD 节流与地表离屏缓存优化运行时表现。

当前村庄采用：

- 逻辑地图 **24×20** 格，世界宽约 **1440px**、高约 **1200px**（60px/格）。
- 草地 **`terrain-grass-field`** 以 3×3 块 480×480 矩形覆盖可玩区域；砖路 **`terrain-brick-road-*`** 以世界坐标矩形叠在草地之上。
- 传送门格 **`P`**、`starterVillage.portal` 与 hotspot 一致；小地图与地上传送门对齐。
- 村庄阶段 HUD 按状态签名去重下发；静态地表首帧 bake 到离屏 canvas 后按相机拷贝。

## 与前序基线的关系

| 基线 | 主要职责 |
| --- | --- |
| v3 | 角色选择首页、loading、点阵角色 `idle` / `static` 等 **壳层 UI** |
| **v4（本文）** | 新手村 **游戏内场景**：地图尺寸、地表、地标与运行时表现 |

迷宫/副本玩法与系统能力仍以 [`pixel-knight-dev-log-2026-04-21-v1.md`](../pixel-knight-dev-log-2026-04-21-v1.md) 中的 v1 开发记录为准；v4 不改变该闭环，只约束村庄呈现与坐标。

## 代码入口

- 新手村地图与 patch：`src/game-center/pixel-knight/game/maps/starterVillage.ts`
- 村庄资源与地形元数据：`src/game-center/pixel-knight/rendering/villageAssets.ts`
- 村庄渲染、HUD、地表缓存：`src/game-center/pixel-knight/pixelKnightGame.ts`
- 村庄资源预载：`src/game-center/pixel-knight/game/preload.ts`
- 地形 PNG：`src/game-center/pixel-knight/assets/village/terrain/`

## 验证

本版本封版前通过：

```bash
npx tsc -p tsconfig.json --noEmit
```

建议在浏览器确认：村庄左右无大块空白草地、传送门与小地图一致、行走时提示与 HUD 仍正常更新。
