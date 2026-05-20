# 02. 美术、角色与音乐方向

## 美术风格

目标是“低多边形 3D 卡通 + 可选像素化渲染”。它要让人想到一颗可环绕探索的温柔星球，而不是传统开放世界缩小版，也不是只能摆几个物件的玩具球。

### 渲染原则

- 使用 Three.js / WebGL 作为浏览器 demo 基础。
- 模型优先低多边形，保留明确剪影。
- 材质使用 toon / flat shading，颜色块清晰，少用复杂贴图。
- 可提供像素化后处理或低分辨率 canvas 输出作为开关，但默认要保证文字和交互 UI 清楚。
- 光照偏柔和，使用暖阳、薄雾、星光边缘，不做真实 PBR。
- 物体轮廓依靠颜色、形状和轻微 rim light，不依赖厚黑描边。

### 色彩

主色不做单一蓝紫夜空。建议使用：

- 草地绿：`#74bf91`
- 星光奶黄：`#fff3d3`
- 暖土棕：`#c59a63`
- 月湾蓝：`#69a6c6`
- 旅行红：`#e55d55`
- 深夜青：`#102d3a`

场景应允许昼夜变化：白天偏茶绿和奶黄，黄昏偏珊瑚与紫灰，夜晚偏深青与暖星点。

### 世界造型语言

- 地形：圆润、块面明确，坡面像被手工削过。
- 树木：少量几何体组合，形状可爱但不幼稚。
- 水面：小而亮，边缘可用浅色圈提示可钓鱼。
- 建筑：小灯塔、小棚屋、风铃杆、星港木栈桥，避免宏大建筑。
- 交互物：颜色更亮、轻微浮动或发光，优先用形状区别功能。

## 主角设计

参考《A Short Hike》的方向是“轮廓友好、移动时轻盈、角色一眼可亲”。`a star trip` 的主角回归小鸟形象，但身份不是普通徒步者，而是一只坠落在陌生星球上的星际快递员。滑翔能力来自喷气背包与鸟类身体姿态的组合，不直接复制《A Short Hike》的能力来源。

### 主角暂名

“Pico”。一只年轻的小鸟星际快递员，带着一只过大的喷气背包和一条红色短围巾。Pico 的小火箭在送件途中坠毁，通讯装置损坏，只能靠山顶通讯塔联系母星。

### 造型原则

- 身体：小鸟体型，圆头、小躯干、短腿和翅膀形成稳定剪影；动作可轻量拟人化，便于跑、跳、攀爬和使用工具。
- 头部：圆而干净，鸟喙和头顶羽冠形成稳定剪影；表情极简，用眼睛大小、羽冠角度、头部倾斜表达情绪。
- 标志物：红围巾、蓝灰喷气背包、小快递徽章、微微烧焦的火箭钥匙扣。
- 动作重点：跑动时围巾飘动、翅膀轻微摆动；短喷气时背包喷出暖黄色小火焰；滑翔时身体前倾、双翼展开、围巾提供方向感；钓鱼时翅膀/手部以简化姿态握竿。
- 比例：头身比偏可爱，但不要幼儿化。目标是亲切、敏捷、有一点坠毁后的狼狈感。
- 读图要求：从远镜头看也能分清鸟喙、羽冠/翅膀、背包和围巾。

### NPC 设计

NPC 全部使用动物或星球居民的卡通抽象形态，但避免过度复杂：

- 通讯塔看守：长耳/长围裙，慢动作，常拿维修扳手，知道塔的旧启动方式。
- 种子商人：圆身、推车、帽檐很宽，像移动的小摊，愿意用能量块换稀有作物。
- 钓鱼孩童：水鸟轮廓，帽子上挂满假鱼饵，持有一块钓鱼奖章能量块。
- 慢跑邮差：腿长、跑姿夸张、背小邮包，和 Pico 有职业上的共鸣。
- 天文学家：夜行小兽，披星图斗篷，知道几块隐藏能量块的位置。

## 音乐方向

目标：舒缓、放松、轻松愉快，但有“踏上小旅程”的期待感。不能直接模仿《A Short Hike》的旋律；可以学习它的动态音乐思路：地点和移动状态改变编曲层。

### 主题音乐关键词

- Cozy miniature planet
- Warm acoustic guitar
- Soft piano
- Light marimba
- Gentle woodwinds
- Tiny bells
- Summer dusk
- Stranded courier
- Gentle jetpack glide
- Curious, not epic
- Loopable game theme
- No drums-heavy beat

### Suno / 生成式音乐 Prompt 初稿

English prompt:

```text
An original cozy indie game theme for a compact spherical planet exploration adventure about a stranded little bird space courier trying to reach a mountain radio tower. Warm nylon guitar, soft upright piano, light marimba, gentle clarinet, tiny bell textures, relaxed walking tempo, hopeful and playful, summer dusk mood, loopable, no vocals, no heavy drums, no cinematic epic build, charming but restrained, suitable for jetpack gliding, gardening, fishing, and trading with villagers on a small star.
```

中文辅助描述：

```text
一首原创的温柔独立游戏主题曲，适合一只坠落在球面星球上的小鸟快递员探索、滑翔、种植、钓鱼和寻找通讯塔。舒缓但不困倦，轻快但不吵闹。主旋律有记忆点，配器以尼龙吉他、轻钢琴、木琴、单簧管、小钟琴为主，不要史诗感，不要电子舞曲，不要人声，适合循环播放。
```

### 分层音乐计划

- Base layer：主旋律，吉他/钢琴，所有区域可循环。
- Walk layer：轻木琴或 pizzicato，玩家跑动和探索时淡入。
- Jetpack layer：短促暖色合成器/风声，喷气或滑翔时淡入，不抢主旋律。
- Garden layer：钟琴和暖 Pad，靠近种植区域时淡入。
- Fishing layer：更慢的低音与水声纹理，抛竿后淡入。
- Night layer：高频小钟和柔和木管，夜晚或背阳坡淡入。
- Radio tower layer：通讯塔启动进度提升后逐渐加入的和声与轻微电台噪声。

Demo 阶段可以先使用一条生成音乐作为占位，再用 WebAudio 做简单的地点 crossfade。
