# Pixel Knight 小骑士 AI 素材流水线 v2

日期：2026-04-22

## 本轮产出

- 候选板：
  - `docs/pixel-knight-ai-candidates/direction-a-copper-shield-recruit-board.png`
  - `docs/pixel-knight-ai-candidates/direction-b-journey-guard-board.png`
  - `docs/pixel-knight-ai-candidates/direction-c-kingdom-toy-knight-board.png`
- 正式角色：
  - `public/images/pixel-knight/characters/hero-knight-v0.png`
- 备选角色：
  - `public/images/pixel-knight/characters/hero-knight-v0-alt.png`
- 贴图配置：
  - `public/images/pixel-knight/characters/hero-knight-v0.meta.json`

## 选择结论

- 主稿：`B. Journey Guard` 第一候选
- 备选：`C. Kingdom Toy Knight` 第二候选

主稿被选中的原因：

- 比 `A` 组更轻冒险，和当前项目文档里的“暖色手工像素奇幻”更一致
- 比 `C` 组更像首发默认骑士，而不是更品牌化的玩偶皮肤
- 头盔、围巾、肩甲和盾牌组合有足够识别度，同时没有贴近《元气骑士 / 前传》的成品角色轮廓

## 生成约束

- 所有角色素材统一走 AI 生成
- 当前只生成 `idle-right`
- `idle-left` 由运行时镜像生成
- 强像素规则：
  - 整数栅格
  - 明确深描边
  - `3-5` 层明暗
  - 禁止模糊边缘和抗锯齿
- 约束参考：
  - 借鉴 Q 版节奏和可读性
  - 主动改写头盔、面罩、武器、主配色分布
  - 不生成 UI、卡框、背景或文字

## 运行时接入

- `preload.ts` 负责预载 `hero-knight-v0.png` 和对应 meta
- `pixelKnightGame.ts` 在局内和首页 idle scene 都优先使用 `drawImage`
- 若预载失败，角色仍退回到原有几何块绘制，避免阻塞玩法调试

## 后续延伸

- 如果继续补动作，下一批资产优先增加 `walk-right`、`attack-right`
- 若后续加入皮肤或职业扩展，先沿用当前 meta schema，不改渲染协议
