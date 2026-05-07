# Pixel Knight · `assets/village`

运行时新手村画面使用 **`maps/starter-village/backdrop.png`**（在 `villageAssets.ts` 里注册为 `starter-village-v7-backdrop`），不再加载本目录下的切片地砖或地形大图。

## 仍保留的文件

| 路径 | 用途 |
|------|------|
| `v7-front/cutouts/imagegen-green/starter-village-collision-elements-imagegen-green-sheet.png` | `scripts/slice-pixel-knight-v7-village-cutouts.py` 的输入：从绿幕整页切出原子 PNG → 写入 `maps/starter-village/atoms/` |

## 已移除的内容（历史）

- `starter-village-spritesheet*.png`、`sliced/`、`terrain/`：旧版拼接地砖 / landmark 贴图管线；村庄改为整张底图后已无运行时引用，已从仓库删除。

## 旧管线脚本

下列脚本依赖已删除的源文件；若需再次运行，请先从 Git 历史恢复对应 PNG / 目录，或改脚本指向新路径：

- `scripts/slice-pixel-knight-village-assets.py`
- `scripts/generate-pixel-knight-terrain-patches.py`
- `scripts/build-pixel-knight-brick-road-from-seamless-tile.py`

`scripts/generate-pixel-knight-brick-road-terrain.py` 为程序化生成，不依赖旧切片，但若写入 `assets/village/terrain/` 需自行确认是否仍要纳入版本库。

地图资源约定见：**`maps/README.md`**。
