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
FIRST PRIORITY: legal animation continuity. Every row must be usable as animation, not merely a contact sheet. Frame 1 starts the motion, each next frame changes by a small natural increment, and for looped states the final frame must connect cleanly back to frame 1. Walk/idle loops are invalid if the last frame cannot cycle into the first without a visible pop.
SECOND PRIORITY: one consistent character model across the entire sheet. All frames in all rows must be the exact same monster evolving through poses: same body proportions, face design, tusk/horn/accessory shape, palette, outline thickness, lighting direction, pixel density, scale, x-center, and foot baseline. Do not redraw a different-looking monster per action row.
THIRD PRIORITY: every action starts from the same standing idle pose. The first frame of idle, walk, attack, and attacked must be the identical neutral standing pose, or as close as possible: same feet on the ground, same body height, same face direction, same center point. Action motion begins on frame 2.
Canvas/layout: exact <columns> columns x 4 rows grid, each cell equal size, very large empty spacing between neighboring frames, generous padding inside every cell, no overlapping silhouettes, no visible grid lines, no labels, no text. The monster should occupy at most 50% of each cell width, leaving wide pure #00ff00 gutters on both left and right so each frame can be isolated without capturing pixels from adjacent frames.
Row 1: idle, <idle frame count> frames, subtle breathing and gentle bounce; unused columns must be empty pure #00ff00 background. Keep the same silhouette and baseline across the row. The last idle frame must loop back to the first.
Row 2: walk, <walk frame count> frames. Frame 1 is the standing idle pose. Frame 2 begins the first step. For simple blob-like monsters 6 frames is enough; for complex four-legged animals use 10-12 frames so the gait has enough hoof/leg positions. The walk cycle must be a closed loop: the final frame must be the immediate predecessor of frame 1, not a different endpoint pose.
Row 3: attack, <attack frame count> frames. Frame 1 is the standing idle pose. Match the monster's natural attack. Start and end in the same neutral-ready pose so it can return to idle without a pop. Avoid excessive ground effects, travel blur, or large displacement unless the design explicitly needs a charge. Keep the entire monster fully inside each cell.
Row 4: attacked, <attacked frame count> frames. Frame 1 is the standing idle pose. Design this per monster anatomy: slime can squash/rebound in 4 frames; animals can use 6-8 frames for flinch, brace, recoil, shake, and recovery. Start and end in the same neutral-ready pose. Avoid accidentally turning attacked into walk/attack/knockback.
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

如果生成图看起来像网格，但横向间距并不严格等宽，或相邻帧身体接近格子边界，使用自动主体检测切帧：

```bash
node scripts/pixel-knight/slice-monster-spritesheet.mjs \
  --auto-detect \
  --source src/game-center/pixel-knight/monsters/<monster-id>/source-green/<monster-id>-actions-greenscreen.png \
  --out src/game-center/pixel-knight/monsters/<monster-id>/frames \
  --meta src/game-center/pixel-knight/monsters/<monster-id>/monster.meta.json \
  --id <monster-id> \
  --name <display-name> \
  --frame-size 256x256 \
  --anchor 128,190 \
  --grid <columns>x4 \
  --states <state-config> \
  --key '#00ff00'
```

常用状态配置：

```text
simple/blob monster: idle 4-6, walk 6, attack 6-8, attacked 4-6
four-legged animal: idle 4-6, walk 10-12, attack 6-8, attacked 6-8
```

按实际怪物传 `--grid` 与 `--states`。例如 12 列四足动物：

```bash
--grid 12x4 \
--states idle:0:6:120:true,walk:1:12:90:true,attack:2:8:95:false,attacked:3:8:95:false
```

脚本职责：

- 按固定网格切 cell。
- `--auto-detect` 模式按行寻找独立主体并排序切帧，用于复杂动物、非严格等距 sheet、或相邻帧过近的图。
- 使用 key 色距离和绿色优势判断背景。
- 去绿幕、despill、过滤小连通噪点，并把弱绿色边缘像素作为失败项处理。
- 输出统一 256×256 透明 PNG。
- 按锚点把主体放在统一基线。
- 更新 `monster.meta.json` 的 `frames`、帧时长和循环配置。

如果 imagegen 生成的局部动作行对不齐，优先从一个稳定基准帧派生少量关键帧，但只在这个状态语义适合时使用：

- `idle`：可用基准帧做 6 帧以内的轻微 squash/stretch，保持脚底/锚点稳定。
- slime/blob attacked：可用基准帧做原地 squash/rebound。
- animal attacked：不要套用 slime 的压扁模板；优先设计 flinch、brace、recoil、shake、recover 等符合动物身体结构的帧。
- 不要为了修复对齐问题盲目增加帧数；帧数要服务动作语义。

## 步骤 3：资源校验

切图脚本会在终端输出每帧报告，并在以下情况失败：

- 角落 alpha 不为 0。
- 可见绿色残留超过阈值。
- 主体 bbox 触碰画布边缘。

额外人工检查：

- 动作连贯性是第一验收标准：同一行必须像连续动画，不像一组独立姿势插画。
- 循环闭合是硬门槛：`idle` 和 `walk` 的最后一帧必须能自然接回第一帧；walk 头尾接不上就是非法产出。
- 起始静姿是硬门槛：每个动作的第 1 帧都必须是站立静姿，walk/attack/attacked 都不能从动作中段开始。
- 形象一致是硬门槛：同一张 sprite sheet 的所有状态必须是同一个怪物形象演化；体型、脸、角/牙、颜色、线条和基线肉眼可见变化时，应重新生成。
- 帧间距是硬门槛：源图每一帧之间要有足够绿幕空白，主体建议不超过单元格宽度的 50%，不能依赖切图脚本从相邻帧里抢救主体。
- `idle` 是否足够稳定；最多 6 帧，避免因为帧数过多导致主体对不齐。
- `attacked` 是否符合怪物身体结构。不要把史莱姆的压扁/回弹方案套到所有动物上。
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
