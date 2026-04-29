# Pixel Knight HUD 与背包 v5 落地基线

日期：2026-04-29  
范围：游戏内 HUD、背包全屏面板、装备 catalog、装备点阵渲染与角色装备同步  
状态：已实现交互与视觉基线（封版）

## 目录

- [01-实现结果摘要](./01-实现结果摘要.md)
- [02-素材与布局规格](./02-素材与布局规格.md)
- [03-迭代决策记录](./03-迭代决策记录.md)

## 本版本结论

v5 承接 `pixel-knight-design-baseline-v4`（新手村游戏内场景基线），将**局内 HUD 与背包系统**收口为可继续扩展的实现基线：左上 HUD 改为双层状态框，右上小地图与背包按钮统一像素框风格，背包改为游戏容器内全屏面板，并引入只包含当前 demo 可渲染装备的唯一 catalog。

当前 v5 采用：

- 左上状态 HUD：HP 红条与 MP 蓝条均在素材槽位内渲染，框体前景覆盖在条体上方；MP 本轮为视觉预留，固定显示 `100/100`。
- 右上 HUD：小地图实时 SVG 填满透明窗口，像素框置于地图图层上方；地图名放在小地图标题区；背包按钮与小地图大框对齐。
- 背包：只覆盖游戏容器内部，不覆盖页面标题、站点导航或浏览器视口；左侧装备槽围绕角色，右侧固定 6×6 背包格。
- 装备：真实可渲染装备限定为 `cloth-cap`、`iron-helmet`、`iron-armor`、`iron-sword`、`wood-shield`；项链和戒指仅保留空槽位。
- 角色同步：背包角色、村庄角色、副本角色都基于同一份 `profile.equipment` 解析出的点阵装备。

## 与前序基线的关系

| 基线 | 主要职责 |
| --- | --- |
| v3 | 角色选择首页、loading、点阵角色 `idle` / `static` 等壳层 UI |
| v4 | 新手村游戏内场景：地图尺寸、地表、地标与运行时表现 |
| **v5（本文）** | 游戏内 HUD 与背包：装备显示、背包交互、点阵装备同步 |

v5 不改变 v4 的村庄地图、地形 patch 与地标坐标；迷宫/副本战斗闭环仍沿用既有实现，只补齐装备数据进入角色渲染链路。

## 代码入口

- HUD 与背包 React 入口：`src/game-center/pixel-knight/PixelKnightView.tsx`
- 装备 catalog 与掉落生成：`src/game-center/pixel-knight/content/data.ts`
- 存档 normalize 与统计值：`src/game-center/pixel-knight/profile.ts`
- 游戏内角色装备渲染同步：`src/game-center/pixel-knight/pixelKnightGame.ts`
- 类型定义：`src/game-center/pixel-knight/types.ts`
- HUD / 背包素材：`src/game-center/pixel-knight/assets/ui/inventory/`

## 验证

本版本封版前通过现有 Vite dev server（`http://localhost:5173`）进行浏览器截图验收，未重新启动 dev server，未执行 `build:gh-pages`。

主要验收截图：

- `/tmp/pixel-knight-inventory-stats-responsive-lg.png`
- `/tmp/pixel-knight-inventory-stats-aligned.png`
- `/tmp/pixel-knight-inventory-alignment-analysis.png`

建议后续若进行更大范围发布，再运行完整构建与端到端截图验收。
