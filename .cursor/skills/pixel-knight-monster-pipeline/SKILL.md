---
name: pixel-knight-monster-pipeline
description: >-
  Generate, slice, register, and verify Pixel Knight monster sprites. Use when
  adding a new monster, regenerating monster animations, fixing green-screen
  cutouts, or updating the monster gallery/detail pages.
---

# Pixel Knight 怪物生成流水线

面向 **Agent**：新增或重做怪物时，必须走完整流程：生成绿幕 spritesheet、归一化绿幕、切透明帧、更新 `monster.meta.json`、页面验证。不要手工随意裁帧。

## 目录约定

- 怪物根目录固定为 [`src/game-center/pixel-knight/monsters`](../../../src/game-center/pixel-knight/monsters)，不要放到 `assets/`。
- 每个怪物一个文件夹，例如 `slime/`。
- 每个怪物统一元数据文件名：`monster.meta.json`。
- 资源结构：

```text
src/game-center/pixel-knight/monsters/<monster-id>/
  monster.meta.json
  source-green/<monster-id>-actions-greenscreen.png
  frames/
    idle/frame-01.png
    walk/frame-01.png
    attack/frame-01.png
    attacked/frame-01.png
```

## 步骤 1：生成绿幕 Spritesheet

使用 imagegen 生成单张 spritesheet，然后复制到怪物的 `source-green/` 目录。源图必须保留在仓库中，便于之后重新切图。

推荐 prompt 模板：

```text
Create a single pixel-art sprite sheet of one <monster description> on a perfectly flat solid #00ff00 chroma-key background.
Canvas/layout: exact 8 columns x 4 rows grid, each cell equal size, generous padding inside every cell, no visible grid lines, no labels, no text.
Row 1: idle, first 6 frames only, subtle breathing and gentle bounce; columns 7 and 8 must be empty pure #00ff00 background. Keep the same silhouette and baseline across the row.
Row 2: walk, first 6 frames only, squash/stretch hopping motion; columns 7 and 8 must be empty pure #00ff00 background.
Row 3: attack, 8 frames, wind-up, forward lunge, impact, rebound, recover; keep the entire monster fully inside every cell with extra padding, especially frame 4.
Row 4: attacked, first 4 frames only, normal, hit squash, rebound, recover; columns 5-8 must be empty pure #00ff00 background. Do not include movement, knockback, walking, lunging, particles, travel blur, or extra effects in attacked.
Chroma-key constraints: background must be uniform #00ff00 with no shadows, gradients, texture, floor, reflections, antialiasing halos, watermarks, or text. Do not use green in the monster or effects.
```

如果生成器给出轻微绿幕渐变，也继续保存源图；切图脚本会把接近 key 色的背景归一化为纯 `#00ff00`。

## 步骤 2：切图与元数据

使用项目脚本切透明帧并更新元数据：

```bash
node scripts/pixel-knight/slice-monster-spritesheet.mjs \
  --source src/game-center/pixel-knight/monsters/<monster-id>/source-green/<monster-id>-actions-greenscreen.png \
  --out src/game-center/pixel-knight/monsters/<monster-id>/frames \
  --meta src/game-center/pixel-knight/monsters/<monster-id>/monster.meta.json \
  --id <monster-id> \
  --name <display-name> \
  --frame-size 256x256 \
  --anchor 128,190 \
  --grid 8x4 \
  --key '#00ff00'
```

默认状态配置：

```text
idle: 6 frames, 120ms, loop
walk: 6 frames, 110ms, loop
attack: 8 frames, 90ms, non-loop
attacked: 4 frames, 115ms, non-loop
```

如需自定义，传 `--states`：

```bash
--states idle:0:6:120:true,walk:1:6:110:true,attack:2:8:90:false,attacked:3:4:115:false
```

脚本职责：

- 按固定网格切 cell。
- 使用 key 色距离和绿色优势判断背景。
- 去绿幕、despill、过滤小连通噪点。
- 输出统一 256×256 透明 PNG。
- 按锚点把主体放在统一基线。
- 更新 `monster.meta.json` 的 `frames`、帧时长和循环配置。

如果 imagegen 生成的 `idle` 或 `attacked` 行仍然对不齐，优先从一个稳定基准帧派生这些小动作：

- `idle`：基准帧做 6 帧以内的轻微 squash/stretch，保持脚底/锚点稳定。
- `attacked`：基准帧做 4 帧原地动作：正常、压扁、回弹、恢复。
- 不要为了修复对齐问题继续增加帧数；帧数越多，生成图漂移越明显。

## 步骤 3：资源校验

切图脚本会在终端输出每帧报告，并在以下情况失败：

- 角落 alpha 不为 0。
- 可见绿色残留超过阈值。
- 主体 bbox 触碰画布边缘。

额外人工检查：

- `idle` 是否足够稳定；最多 6 帧，避免因为帧数过多导致主体对不齐。
- `attacked` 是否是原地受击：正常、受击压扁、回弹、恢复。
- `attack` 第 4 帧或主要冲刺帧是否完整，没有被裁切。
- 同一状态播放时主体不异常漂移。

可快速生成预览图：

```bash
python3 - <<'PY'
from PIL import Image
from pathlib import Path
root=Path('src/game-center/pixel-knight/monsters/<monster-id>/frames')
states=['idle','walk','attack','attacked']
cell=128
preview=Image.new('RGBA',(8*cell,len(states)*cell),(30,42,36,255))
for y,state in enumerate(states):
    for x,p in enumerate(sorted((root/state).glob('frame-*.png'))):
        im=Image.open(p).convert('RGBA').resize((cell,cell),Image.Resampling.NEAREST)
        preview.alpha_composite(im,(x*cell,y*cell))
preview.save('/tmp/<monster-id>-frames-preview.png')
print('/tmp/<monster-id>-frames-preview.png')
PY
```

## 步骤 4：注册与页面验证

怪物会被 [`monsterCatalog.ts`](../../../src/game-center/pixel-knight/monsters/monsterCatalog.ts) 自动扫描：

- `./*/monster.meta.json`
- `./*/frames/*/*.png`

不用手写 import。只要目录和 `monster.meta.json` 正确，怪物会出现在：

- `/games/pixel-knight/monsters`：一级怪物图鉴列表。
- `/games/pixel-knight/monsters/<monster-id>`：二级动作详情页。

验证命令：

```bash
npm run build
npm run dev -- --host 127.0.0.1
```

浏览器验证：

- 打开 `/games/pixel-knight/monsters`，列表卡片显示怪物名称和 idle 预览。
- 点击进入 `/games/pixel-knight/monsters/<monster-id>`。
- 切换 `Idle / Walk / Attack / Attacked`，确认播放、暂停、左右朝向正常。
- 非循环动作播放完成后应回到 `idle`。
- 检查 console 无 error，移动端宽度下控件不重叠。

## 关键约束

- 展示名称写在 `monster.meta.json` 的 `name`，例如史莱姆就写“史莱姆”，不要把颜色写进名称，除非它是怪物品类名的一部分。
- 不要把左右朝向做成两套素材；渲染器通过 canvas 镜像处理。
- 不要手工编辑 `frames` 列表；用切图脚本生成，避免漏帧或帧数不一致。
- 如果绿色仍可见，先调整切图脚本阈值或重新生成更干净的绿幕源图，不要在单张帧上手工涂改。
