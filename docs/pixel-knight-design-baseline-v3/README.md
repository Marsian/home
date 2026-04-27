# Pixel Knight 角色选择首页 v3 落地基线

日期：2026-04-27  
范围：角色选择首页、加载页、点阵角色渲染模式  
状态：已实现页面基线

## 目录

- [01-实现结果摘要](./01-实现结果摘要.md)
- [02-素材与布局规格](./02-素材与布局规格.md)
- [03-迭代决策记录](./03-迭代决策记录.md)

## 本版本结论

v3 不再只是效果图归档，而是把 v2 第三版概念稿落地到真实页面后的实现基线。核心目标是：角色选择页保持清爽像素 ARPG 首页质感，交互元素使用静态像素图片资源承载，角色仍由现有点阵角色 renderer 实时绘制。

当前页面采用：

- 同一张无 banner 的像素背景图作为角色选择页与 loading 页背景。
- 独立切出的像素组件素材作为 title bar、角色卡片和进入游戏按钮。
- 中央角色使用实时点阵角色 `idle` 渲染。
- 角色列表头像区域使用实时点阵角色 `static` 渲染，并按框裁切。
- loading/error 和角色选择页使用一致的 `1672/941` 画幅，确保背景定位一致。

## 代码入口

- 页面实现：`src/game-center/pixel-knight/PixelKnightView.tsx`
- loading 覆盖层：`src/game-center/pixel-knight/ui/LoadingOverlay.tsx`
- 点阵角色渲染器：`src/game-center/pixel-knight/rendering/matrixCharacterRenderer.ts`
- 角色 renderer demo：`src/game-center/pixel-knight/PixelKnightCharacterDemoView.tsx`
- UI 素材目录：`src/game-center/pixel-knight/assets/ui/`

## 验证

本版本提交前通过：

```bash
npm run build
```
