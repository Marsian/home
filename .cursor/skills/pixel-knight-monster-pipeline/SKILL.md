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
  reference/<monster-id>-neutral-reference.png
  source-green/<monster-id>-actions-generated-raw.png
  source-green/<monster-id>-actions-greenscreen.png
  source-frames/<variant>/...          # optional: curated rows for deliberate hybrid repairs
  frames/
    idle/frame-01.png
    walk/frame-01.png
    attack/frame-01.png
    attacked/frame-01.png
```

## 步骤 0：先锁定基准素材

复杂怪物，尤其是野猪、狼、鹿、蜘蛛等四足/多足怪物，不能直接从整张动作表开始。先生成或挑选一张单帧基准素材，并把它保存在怪物目录下，作为后续 spritesheet 的角色参考。

建议路径：

```text
src/game-center/pixel-knight/monsters/<monster-id>/reference/<monster-id>-neutral-reference.png
```

基准素材必须满足：

- 单只怪物、面向右侧、站立 neutral pose，无遮挡、无动作特效。
- 完整锁定体型、头身比例、脸、角/牙/鬃毛/尾巴、颜色、轮廓厚度、像素密度和光照方向。
- 纯 `#00ff00` 绿幕背景，怪物本体不能使用绿色。
- 主体宽度不超过未来 grid cell 宽度的 45%-50%，为整张表预留足够 padding。

野猪基准 prompt 参考：

```text
Create one neutral standing pixel-art wild boar monster facing right on a perfectly flat solid #00ff00 chroma-key background. Compact side-view body, short legs, angry eyes, pink snout, small white tusks, dark brown spiky mane, tiny tail, warm brown fur, crisp dark outline, 16-bit fantasy RPG sprite style. This is the canonical reference model for all later animation frames. No shadow, no floor, no text, no watermark. Keep generous empty green padding on every side. Do not use green anywhere in the boar.
```

## 步骤 1：生成绿幕 Spritesheet

使用 imagegen 生成单张 spritesheet，然后复制到怪物的 `source-green/` 目录。源图必须保留在仓库中，便于之后重新切图。

如果存在基准素材，spritesheet prompt 必须显式要求“严格沿用基准素材的角色模型”。四足动物必须使用更宽的固定网格：野猪默认 `12 columns x 4 rows`，每格等宽等高，主体宽度不超过 cell 宽度 45%-50%，相邻主体之间必须有纯 `#00ff00` 空白 gutter。不要依赖 `--auto-detect` 抢救间距过小的源图。

推荐 prompt 模板：

```text
Create a single pixel-art sprite sheet of one <monster description> on a perfectly flat solid #00ff00 chroma-key background.
FIRST PRIORITY: legal animation continuity. Every row must be usable as animation, not merely a contact sheet. Frame 1 starts the motion, each next frame changes by a small natural increment, and for looped states the final frame must connect cleanly back to frame 1. Walk/idle loops are invalid if the last frame cannot cycle into the first without a visible pop.
SECOND PRIORITY: one consistent character model across the entire sheet. All frames in all rows must be the exact same monster evolving through poses: same body proportions, face design, tusk/horn/accessory shape, palette, outline thickness, lighting direction, pixel density, scale, x-center, and foot baseline. Do not redraw a different-looking monster per action row.
THIRD PRIORITY: every action starts from the same standing idle pose. The first frame of idle, walk, attack, and attacked must be the identical neutral standing pose, or as close as possible: same feet on the ground, same body height, same face direction, same center point. Action motion begins on frame 2.
Canvas/layout: exact <columns> columns x 4 rows grid, each cell equal size, strict invisible grid alignment, very large empty spacing between neighboring frames, generous padding inside every cell, no overlapping silhouettes, no visible grid lines, no labels, no text. The monster should occupy at most 45%-50% of each cell width, leaving wide pure #00ff00 gutters on both left and right so each frame can be isolated without capturing pixels from adjacent frames.
Row 1: idle, <idle frame count> frames, subtle breathing and gentle bounce; unused columns must be empty pure #00ff00 background. Keep the same silhouette and baseline across the row. The last idle frame must loop back to the first.
Row 2: walk, <walk frame count> frames. Frame 1 is the standing idle pose. Frame 2 begins the first step. For simple blob-like monsters 6 frames is enough; for complex four-legged animals use 10-12 frames so the gait has enough hoof/leg positions. The walk cycle must be a closed loop: the final frame must be the immediate predecessor of frame 1, not a different endpoint pose.
Row 3: attack, <attack frame count> frames. Frame 1 is the standing idle pose. Match the monster's natural attack. Start and end in the same neutral-ready pose so it can return to idle without a pop. Avoid excessive ground effects, travel blur, or large displacement unless the design explicitly needs a charge. Keep the entire monster fully inside each cell.
Row 4: attacked, <attacked frame count> frames. Frame 1 is the standing idle pose. Design this per monster anatomy: slime can squash/rebound in 4 frames; animals can use 6-8 frames for flinch, brace, recoil, shake, and recovery. Start and end in the same neutral-ready pose. Avoid accidentally turning attacked into walk/attack/knockback.
Chroma-key constraints: background must be uniform #00ff00 with no shadows, gradients, texture, floor, reflections, antialiasing halos, watermarks, or text. Do not use green in the monster or effects.
```

如果生成器给出轻微绿幕渐变，也继续保存源图；切图脚本会把接近 key 色的背景归一化为纯 `#00ff00`。

raw spritesheet 的验收优先级：

- 必须有正确的行数、每行动作数量、动作顺序和足够清楚的单帧分隔。
- 同一张表的颜色、线条、体型、头身比例、朝向和脚底基线必须一致。
- 每个主体之间至少保留接近一个主体宽度的纯绿 gutter；主体贴在一起、互相重叠、或只靠细线分隔时必须重新生成。
- visible grid lines 只能作为 raw 生成过程中的辅助线存在，最终 `*-actions-greenscreen.png` 必须是纯绿背景、无网格线。
- regrid 是把“已经合格但不够规整”的 raw 图标准化，不是抢救缺帧、拥挤、串色、变体型 spritesheet 的补丁。

如果生成器输出的 raw spritesheet 角色正确但不是严格 grid，不要直接切图，也不要用一次性临时脚本处理。先把 raw 图保存到 `source-green/<monster-id>-actions-generated-raw.png`，再用 regrid 脚本重排成正式 `source-green/<monster-id>-actions-greenscreen.png`：

```bash
node scripts/pixel-knight/regrid-monster-spritesheet.mjs \
  --source src/game-center/pixel-knight/monsters/boar/source-green/boar-actions-generated-raw.png \
  --out src/game-center/pixel-knight/monsters/boar/source-green/boar-actions-greenscreen.png \
  --grid 12x4 \
  --counts 4,10,7,7 \
  --cell-size 256x256 \
  --baseline-y 190 \
  --max-subject-size 118x150 \
  --key '#00ff00'
```

`*-actions-generated-raw.png` 是生成器原始产物，`*-actions-greenscreen.png` 是可切图的严格 grid 产物。二者都保留在仓库中，保证后续能复现素材替换过程。

只有在明确选择 hybrid 修复时，才使用 `source-frames/<variant>/`。例如某个动作行语义明显更好，但需要统一到同一个角色基准和 grid；此时先把经过人工挑选的行动作源帧保存到 `source-frames/<variant>/`，再合成 strict sheet。合成时每一行使用统一缩放，避免 walk/attack 的主体大小逐帧抖动：

```bash
node scripts/pixel-knight/compose-monster-spritesheet-from-frames.mjs \
  --out src/game-center/pixel-knight/monsters/<monster-id>/source-green/<monster-id>-actions-greenscreen.png \
  --grid 12x4 \
  --cell-size 256x256 \
  --baseline-y 190 \
  --key '#00ff00' \
  --row idle:src/game-center/pixel-knight/monsters/<monster-id>/source-frames/<variant>/idle:4:112x94 \
  --row walk:src/game-center/pixel-knight/monsters/<monster-id>/source-frames/<variant>/walk:10:114x94 \
  --row attack:src/game-center/pixel-knight/monsters/<monster-id>/source-frames/<variant>/attack:7:126x98 \
  --row attacked:src/game-center/pixel-knight/monsters/<monster-id>/source-frames/<variant>/attacked:7:112x94
```

这种 hybrid 修正必须满足同一角色、同一色板、同一像素密度；如果出现动作行串色或体型变化，应整表重生成。合成后也必须再走切图和 `--quality-report --fail-on-quality`，不能直接替换最终 `frames/`。

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

### 四足动物推荐切图命令

野猪等四足动物优先使用严格 `12x4` grid，并启用质量报告：

```bash
node scripts/pixel-knight/slice-monster-spritesheet.mjs \
  --quality-report \
  --fail-on-quality \
  --loop-check idle,walk \
  --neutral-check walk,attack,attacked \
  --source src/game-center/pixel-knight/monsters/boar/source-green/boar-actions-greenscreen.png \
  --out src/game-center/pixel-knight/monsters/boar/frames \
  --meta src/game-center/pixel-knight/monsters/boar/monster.meta.json \
  --id boar \
  --name 野猪 \
  --frame-size 256x256 \
  --anchor 128,190 \
  --grid 12x4 \
  --states idle:0:4:140:true,walk:1:10:90:true,attack:2:7:95:false,attacked:3:7:95:false \
  --key '#00ff00'
```

质量报告会输出每帧 bbox、主体中心、alpha 面积、帧间差异、循环首尾差异、动作首帧相对 idle 首帧差异、源图 cell padding 与相邻主体 gutter。`--fail-on-quality` 会把以下问题作为失败项：

- `--loop-check` 中的状态首尾差异过大。
- `--neutral-check` 中的状态第 1 帧和 `idle/frame-01.png` 差异过大。
- 源图主体贴近 cell 边界。
- 相邻主体之间绿幕 gutter 太小。

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
- 启用 `--fail-on-quality` 时，动作循环、基准首帧、源图 cell padding 或相邻 gutter 未达标。

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
