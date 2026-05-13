# Pixel Knight V10 Otherworld Map

异界地图从运行时程序迷宫重做为地图包管线，首张可玩地图为「枫林入口」。

## Core Outputs

- `src/game-center/pixel-knight/maps/autumn-wood/`
  - 首张异界地图包，对应 `DungeonId = "autumn-wood"`。
  - 包含 `backdrop.png`、`map.meta.json`、`obstacles16.v1.json`、`placements.v1.json`、`atoms/*.png`。
  - `map.meta.json` 维护 `dungeonId`、`start`、`portal`、`hotspots` 和 `monsterClusters`。
- `src/game-center/pixel-knight/maps/otherworldRegistry.ts`
  - 异界地图注册表。
  - 当前只开放 `autumn-wood`，其它异界入口保留展示但不可进入。
- `src/game-center/pixel-knight/rendering/otherworldMapAssets.ts`
  - 扫描异界地图底图和 atom 素材，供预加载与运行时渲染使用。
- `.cursor/skills/pixel-knight-otherworld-map-pipeline/SKILL.md`
  - 沉淀异界地图 pipeline：整图生成、蓝幕素材生成、连通域裁剪、手工校准、运行时验证。

## Runtime Changes

- 移除旧的运行时程序迷宫 `buildMaze()` 路线。
- 异界地图渲染复用新手村地图包思路：
  - `backdrop.png` 作为底图。
  - `placements.v1.json` 按深度排序绘制 atom。
  - `obstacles16.v1.json` 转换为碰撞 rows。
- `startRun()` 会根据选择的 dungeon 查找真实地图包；未注册地图不会启动 run。
- 入口选择界面只允许「枫林入口」进入，其它入口按钮显示为未开放并禁用。
- 怪物生成读取地图 `monsterClusters`，进入地图时按聚落定义随机生成敌群，并沿用现有难度倍率。
- 枫林地图出生点调整到入口门后方可行走格：`start = { x: 14, y: 69 }`。
- 地图中玩家矩阵角色渲染尺寸缩小 30%，`MATRIX_PLAYER_PIXEL_SIZE` 从 `3` 调整为 `2.1`。

## Map Editor Changes

- 地图列表改为紧凑列表项，只展示缩略图、地图名、路径和编辑按钮。
- 编辑页新增一键保存：
  - Vite dev server 提供 `/api/pixel-knight/map-editor/save`。
  - 保存 `map.meta.json`、`placements.v1.json`、`obstacles16.v1.json`。
- 编辑器导出和保存时保留自己不识别的 JSON 字段，避免破坏运行时扩展字段。
- 障碍编辑新增鼠标批量工具：
  - 画笔、橡皮、矩形添加、矩形擦除。
  - 支持多档 brush size，用于大面积地图快速编辑。

## Asset Pipeline Decisions

- 异界地图原子素材不从底图抠图。
- 生成 atom sheet 时以底图为视觉参考，直接生成严格匹配风格和造型的独立素材。
- atom sheet 使用纯蓝背景，避免绿色传送门和绿色背景混淆。
- 裁剪不再按固定格子切割，改用连通域识别并加面积、尺寸、边界门槛。
- `build-otherworld-map-pack.py` 默认只写 atom 输出；地图配置 JSON 只能在显式 `--write-map-json` 时 bootstrap，避免覆盖手工编辑结果。

## Validation

- `scripts/pixel-knight/validate-otherworld-map-pack.mjs autumn-wood`
  - 校验地图尺寸、边界闭合、start/portal 不在障碍上、start 到 portal 可达。
- `npm run build`
  - 串联 `validate:pixel-knight-maps`，确保地图包校验、TypeScript 和 Vite asset glob 都纳入构建流程。
- 本轮已额外确认：
  - `autumn-wood` 新出生点 `{ x: 14, y: 69 }` 不在障碍上。
  - 新出生点到 portal `{ x: 114, y: 12 }` 可达。
  - `npx tsc -p tsconfig.json --noEmit` 通过。

## Follow-Up

- 后续每开放一张异界地图，都应先注册地图包，再启用对应入口。
- 已经人工编辑过的 `obstacles16.v1.json` 和 `placements.v1.json` 不应由脚本自动重写。
- 新素材导入时优先使用连通域裁剪脚本，并在编辑器中手工校准放置和碰撞。
