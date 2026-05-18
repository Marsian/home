# Pixel Knight V11 Basic Behavior, Loot, and Storage

本版围绕像素骑士的基础循环做了一轮落地优化：副本结束直接回村，怪物死亡产生可拾取地面掉落，村庄储物箱改为真实容器，并补齐金币掉落素材。

## Core Outputs

- `src/game-center/pixel-knight/pixelKnightGame.ts`
  - 移除玩家可见的 `results` 阶段，副本传送点交互和角色死亡都会直接回到村庄。
  - 怪物死亡后生成地面金币和装备掉落。
  - 掉落物从怪物身上弹出并落地，落地后保持静止，不悬浮、不绘制阴影。
  - 玩家靠近落地掉落物后按 `F` 拾取，金币即时进入角色金币，装备进入背包。
- `src/game-center/pixel-knight/PixelKnightView.tsx`
  - 新增拾取回调，背包满 36 格时装备留在地上并给出提示。
  - 新增 `StorageOverlay`，左侧箱子、右侧背包均复用 6x6 背包网格素材。
  - 储物箱只负责存放和取出；装备、卸下仍保留在普通背包界面。
  - 修正储物箱格子 hover 黄框，避免黄框相对物品格上下错位。
- `src/game-center/pixel-knight/assets/loot/gold-pile.png`
  - 新增 36x36 透明 PNG 金币堆素材，用于地面金币掉落。
- `src/game-center/pixel-knight/profile.ts`
  - 存档版本升级到 `version: 3`。
  - 为旧存档补齐 `storage` 字段，并将储物箱容量限制为 36。
- `src/game-center/pixel-knight/PixelKnightDataView.tsx`
  - 数据页拆分展示 Backpack 与 Storage，分别显示 36 格容量。

## Behavior Changes

- 副本返回：
  - 传送点按 `F` 后不再弹出结算窗口。
  - 死亡后不再弹出结算窗口。
  - 回村后角色按当前职业状态恢复到村庄可操作状态。
  - 经验、材料、难度解锁等基础结算仍通过 `onRunComplete` 写入存档。
- 地面掉落：
  - 普通怪和精英怪都会掉落金币。
  - 装备按现有 `generateLootItems` 逻辑小概率掉落，精英和高难度有更高概率。
  - 掉落会按分散偏移落到怪物周围，允许轻微遮挡，但避免集中堆叠。
  - 未拾取的地面掉落不会在死亡或离开副本后进入背包。
- 储物箱：
  - 村庄储物箱热点打开真实箱子界面。
  - 箱子容量为 36 格，与背包素材完全一致。
  - 点击箱子物品会取出到背包；点击背包物品会存入箱子。
  - 目标容器满时点击不会移动物品。

## Asset Notes

- 金币堆素材由 imagegen 生成，使用纯色背景抠透明后导入工程。
- 运行时金币掉落优先绘制该 PNG；装备掉落继续复用矩阵装备预览数据，在 canvas 中绘制小图标。
- 地面掉落取消常驻浮动和阴影，只保留死亡瞬间的落地动画。

## Validation

- `npm run build`
  - 覆盖字体子集生成、Tank90 校验、Pixel Knight 地图校验、TypeScript 和 Vite 生产构建。
- 浏览器截图校验：
  - 储物箱左右两侧均为 6x6 网格。
  - 物品图标与背包格子对齐。
  - 储物箱 hover 黄框贴合当前格子，不再出现明显上下错位。

## Follow-Up

- 后续可补拖拽、批量转移、排序等储物箱操作。
- 地面掉落可继续扩展为多金币堆合并显示、稀有装备光效和自动拾取规则。
- 背包历史数据超过 36 格的兼容策略仍可在后续版本中做整理界面。
