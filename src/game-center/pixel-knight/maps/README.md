# Pixel Knight 地图包约定（`maps/`）

本目录存放**按地图分包**的资源与数据。地图编辑器通过静态扫描自动列出所有合法地图；**同一地图的所有编辑器相关资源必须落在同一个子文件夹内**（`maps/<slug>/`）。

游戏侧对新手村的引用也直接进入 `maps/starter-village/starterVillageMap.ts`，不再经过 `game/maps/` 下的中转文件（历史上曾为少改 import 而保留薄 re-export，现已去掉）。

---

## 目录结构概览

```
maps/
├── README.md                 # 本说明
├── editorFormats.ts          # 编辑器导出 JSON 的 TypeScript 类型（共享，不是地图包）
├── buildMapRowsFromObstacles.ts
├── mapEditorAssets.ts        # 扫描 maps/*/ 的逻辑（共享）
│
├── starter-village/          # 示例：一张完整地图包（slug = 文件夹名）
│   ├── backdrop.png          # 必填（编辑器列表依赖此文件发现地图）
│   ├── map.meta.json         # 强烈建议（显示名、游玩用 meta）
│   ├── atoms/                # 原子精灵 PNG（编辑器拖拽用）
│   │   └── *.png
│   ├── placements.v1.json    # 可选；地图编辑器「导出 placements」同款格式
│   ├── obstacles16.v1.json   # 可选；地图编辑器「导出 obstacles」同款格式
│   ├── starterVillageMap.ts  # 可选：把本包接入游戏的装配模块（见下文）
│   └── …                     # 其它辅助文件不影响扫描
```

**注意：** 只有 **`maps/<slug>/backdrop.png`** 存在时，该文件夹才会出现在地图编辑器的列表里。共享的 `.ts` 文件放在 `maps/` 根下即可，不要与某一地图的资源混放。

---

## 必填与建议文件

| 文件 | 是否必填 | 说明 |
|------|----------|------|
| `backdrop.png` | **必填** | 世界底图；分辨率决定画布大小与障碍网格范围。 |
| `map.meta.json` | **强烈建议** | 编辑器列表标题优先使用其中的 `name`；接入游戏时需要完整的互动与出生点信息。 |
| `atoms/*.png` | 按需 | 仅在需要在编辑器里摆放原子素材时需要；建议使用简洁语义名（如 `pine-01.png`），`assetKey` 与文件名（无扩展名）一致。 |
| `placements.v1.json` | 可选 | 进入编辑器时加载初始摆放；可与编辑器导出文件互相覆盖迭代。 |
| `obstacles16.v1.json` | 可选 | 进入编辑器时加载初始障碍格；格式见下。 |

---

## `map.meta.json`（游玩与列表）

地图编辑器当前用于列表展示的主要字段：`name`（及可选 `id`）。

若要将地图接入实际游戏（参考 `starter-village/starterVillageMap.ts`），JSON 需能与 `MapDef` 对齐，至少包括：

- `id`、`kind`、`name`
- `start`、`portal`（格子坐标，与障碍网格一致）
- `hotspots`：互动点数组（`id`、`kind`、`label`、`prompt`、`cell`、`radius` 等）

具体字段以 `starter-village/map.meta.json` 为准。

---

## 编辑器导出格式（与内置 JSON 一致）

### `placements.v1.json`

```json
{
  "image": { "width": 1254, "height": 1254 },
  "placements": [
    {
      "id": "唯一实例 id",
      "assetKey": "pine-01",
      "x": 100,
      "y": 200,
      "scale": 1
    }
  ]
}
```

- 坐标为**世界像素**，原点为底图左上角。
- `assetKey` 对应 `atoms/` 下 PNG 文件名（不含 `.png`）。

### `obstacles16.v1.json`

```json
{
  "tile": 16,
  "cols": 79,
  "rows": 79,
  "image": { "width": 1254, "height": 1254 },
  "blocked": [{ "col": 0, "row": 0 }]
}
```

- `tile` 固定为 **16**（与当前编辑器一致）。
- `blocked` 仅列出障碍格；可走区域不必列出。
- `cols` / `rows` 通常由 `ceil(backdrop宽或高 / tile)` 得出，须与底图像素尺寸一致。

类型定义见同目录 `editorFormats.ts`。

---

## 新增一张地图的操作指引

1. **新建文件夹**  
   在 `maps/` 下创建 **`maps/<slug>/`**，`<slug>` 仅用字母、数字、连字符为宜（与 URL 中的 `mapSlug` 一致）。

2. **放入底图**  
   将主背景保存为 **`backdrop.png`**。没有该文件则不会出现在编辑器列表中。

3. **编写 `map.meta.json`**  
   至少设置 `name`（列表显示）；若要做可玩地图，复制 `starter-village/map.meta.json` 的结构并按新图调整 `start`、`portal`、`hotspots`。

4. **原子素材（可选）**  
   将 PNG 放入 **`atoms/`**。编辑器只加载本文件夹下的 `*.png`。

5. **初始摆放 / 障碍（可选）**  
   可在编辑器里从零编辑并导出 `placements.v1.json`、`obstacles16.v1.json`，放回**同一** `maps/<slug>/` 目录即可下次加载。

6. **接入游戏（可选）**  
   - 碰撞行走格子由 `buildMapRowsFromObstacles` 根据 `obstacles16.v1.json` 与 `map.meta.json` 中的 `start`/`portal` 生成。  
   - 参考 **`starter-village/starterVillageMap.ts`**：在同一地图包目录内编写装配模块（`import` 本目录下的 JSON），并在游戏入口（如 `pixelKnightGame.ts`）直接从 `./maps/<slug>/<YourMap>Map.ts` 引用导出，无需再经过 `game/maps/`。  
   - 若地图仅在编辑器中使用，可跳过此步。

7. **流水线脚本（可选）**  
   - `scripts/slice-pixel-knight-v7-village-cutouts.py`：从绿幕切图生成 `atoms/`（输出目录指向对应 `maps/<slug>/atoms/`）。  
   - `scripts/build-pixel-knight-v7-village-collision-grid.py`：根据原子匹配底图，重写 **`obstacles16.v1.json`** 与 **`placements.v1.json`**；若启发式改变了传送门/起点，请核对并更新 **`map.meta.json`**。

---

## 与 `maps/` 根目录共享代码的区别

- **`editorFormats.ts`、`buildMapRowsFromObstacles.ts`、`mapEditorAssets.ts`**：全地图共用工具与类型，**不要**放进某个 `<slug>/` 里。  
- **`maps/<slug>/`**：只放该地图的图像、JSON 以及（如需）该地图专属的 `*Map.ts` 装配文件。

按上述约定新增文件夹并放置 `backdrop.png` 后，无需改路由或编辑器代码即可在「地图列表」中看到新图。
