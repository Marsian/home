# 像素骑士 Web 开发记录（v1）

日期：2026-04-21  
版本：v1

## 原始目标（Plan）

- 在游戏中心新增一款正式命名为 `像素骑士 / Pixel Knight` 的像素风 ARPG。
- 首版只开放 `骑士` 职业，支持重复刷图、掉宝、成长和难度分层。
- 主游戏页只保留游戏本体与游戏内 HUD；角色/掉落/静态配置等后台信息单独放路由。
- 首次进入必须有完整加载机制，支持进度、失败重试和同会话内较短二次过渡。
- 地图形态收口为“固定布局的经典迷宫”，支持多屏探索、小地图和尽头传送点撤离。

## v1 实际落地摘要（What shipped）

### 1) 游戏中心接入与命名统一

- 新增 `pixel-knight` 游戏卡片和路由。
- 对外命名统一为 `像素骑士 / Pixel Knight`。
- 主入口：
  - `/games/pixel-knight`
  - `/games/pixel-knight/data`

相关文件：

- `src/game-center/gameRegistry.ts`
- `src/routes/AppRouter.tsx`
- `src/game-center/thumbnails/PixelKnightThumbnail.tsx`

### 2) 主游戏页：收口为“纯游戏视图”

- 主页面不再堆设定说明、装备表、词条表、静态数据等后台信息。
- 首页保留的内容仅包括：
  - 副本选择
  - 难度选择
  - 骑士当前等级/基础战斗值
  - 开始副本入口
- 局内只显示必要 HUD：
  - 血量
  - 当前副本与难度
  - 当前目标提示
  - 技能冷却
  - 小地图
  - 战斗 feed
  - 背包侧栏

相关文件：

- `src/game-center/pixel-knight/PixelKnightView.tsx`

### 3) 数据后台独立路由

- 新增 `/games/pixel-knight/data` 作为后台数据页。
- 该页单独展示：
  - 角色存档
  - 装备与背包
  - 难度解锁
  - 传奇词条
  - 套装效果
  - 保存数据 JSON
- 这样主游戏页不再承担“说明页 / 配置页”职责。

相关文件：

- `src/game-center/pixel-knight/PixelKnightDataView.tsx`

### 4) 首次进入加载机制

- 首次进入 `/games/pixel-knight` 时先进入加载态。
- 预载阶段提供：
  - 游戏名展示
  - 当前加载文案
  - 百分比与进度条
  - 失败重试
- 同会话内再次进入时仍走校验，但整体等待更短。

相关文件：

- `src/game-center/pixel-knight/game/preload.ts`
- `src/game-center/pixel-knight/ui/LoadingOverlay.tsx`

### 5) v1 游戏循环：迷宫探索 -> 随机遭遇 -> 传送点撤离

- 将早期的“房间波次”结构改为固定迷宫地图。
- 每张图使用写死布局，但都是多屏尺寸的经典迷宫。
- 角色从固定出生点进入迷宫，目标是穿过迷宫到达尽头传送点。
- 当角色靠近传送点时，会在游戏内提示按 `F` 交互并返回村庄。
- 撤离成功后结算经验、金币、材料和掉落。

相关文件：

- `src/game-center/pixel-knight/pixelKnightGame.ts`

### 6) 小地图

- HUD 新增小地图。
- 小地图内容来自迷宫布局本身，展示：
  - 墙体
  - 可行走区域
  - 玩家当前位置
  - 传送点位置
- 小地图完全属于游戏内 HUD，而不是页面外的辅助说明。

相关文件：

- `src/game-center/pixel-knight/types.ts`
- `src/game-center/pixel-knight/PixelKnightView.tsx`

### 7) 怪物刷新与行为收口

- 怪物改为随机分布在迷宫内部，而不是房间脚本定点刷。
- 刷新采用“随机群聚”方式：以若干中心点为基础生成小团怪群，避免均匀撒点。
- 怪物行为严格收口为两类：
  - `melee`：持续冲向角色
  - `ranged`：原地发射投射物
- 怪物移动速度被限制为不快于角色，避免追击压制感过强。

相关文件：

- `src/game-center/pixel-knight/pixelKnightGame.ts`

### 8) 骑士、掉落与存档骨架

- 首版仅开放骑士。
- 保留 6 个基础操作：
  - 普攻
  - 旋风斩
  - 盾击
  - 圣光突进
  - 祝福
  - 闪避
- 保留装备、背包、掉落品质、传奇词条、套装效果和本地存档。
- 存档与结算逻辑拆到独立 profile 模块，供主游戏页与数据后台复用。

相关文件：

- `src/game-center/pixel-knight/content/data.ts`
- `src/game-center/pixel-knight/profile.ts`
- `src/game-center/pixel-knight/types.ts`

## 与原计划的差异（Plan vs Reality）

### 已实现

- 新游戏接入与命名统一
- 首次加载机制
- 副本重刷
- 难度分层
- 主游戏页只保留游戏内信息
- 独立数据后台路由
- 迷宫地图
- 小地图
- 传送点撤离
- 随机群聚怪物
- 近战/远程两类怪物行为

### 本轮有意收口

- 未实现多职业，首版仅保留骑士
- 未实现复杂终局系统，只保留重复刷图 + 难度成长
- 未实现程序化迷宫，当前使用手写固定布局
- 未实现完整剧情/任务线，只保留刷图闭环
- 美术仍以代码绘制与简化图形为主，尚未接入正式像素素材包

## 关键文件列表（v1）

- `src/game-center/gameRegistry.ts`
- `src/routes/AppRouter.tsx`
- `src/game-center/thumbnails/PixelKnightThumbnail.tsx`
- `src/game-center/pixel-knight/PixelKnightView.tsx`
- `src/game-center/pixel-knight/PixelKnightDataView.tsx`
- `src/game-center/pixel-knight/pixelKnightGame.ts`
- `src/game-center/pixel-knight/game/preload.ts`
- `src/game-center/pixel-knight/content/data.ts`
- `src/game-center/pixel-knight/profile.ts`
- `src/game-center/pixel-knight/types.ts`
- `src/game-center/pixel-knight/ui/LoadingOverlay.tsx`

## 验证记录（How verified）

- `npm run build`：PASS
- 浏览器冒烟检查：
  - 游戏中心可见 `Pixel Knight` 卡片
  - `/games/pixel-knight` 可进入
  - 首次进入可见加载页
  - 游戏主界面不再堆后台元信息
  - `/games/pixel-knight/data` 可独立访问
  - 开始副本后进入迷宫探索态，HUD 可见目标与小地图

## 下一步（Post-v1，可选）

- 给迷宫补正式像素地形与墙体素材，替换当前代码绘制块面。
- 提高迷宫差异度：增加更明显的地块主题、房间 landmark 和路径记忆点。
- 增强传送点反馈：交互特效、音效和更强的可见性。
- 增加更丰富的敌人投射物图形与 Boss 级敌人。
- 若继续迭代地图体验，可考虑从固定布局升级为“固定房间拼接 + 半随机通路”。
