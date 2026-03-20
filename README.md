# Home Site (React + Vite + Tailwind)

一个个人主页站点，包含简历等子应用内容，同时支持：

- 在浏览器里打开查看
- 直接用浏览器 `print` 导出 PDF（不需要额外的 PDF 生成逻辑）
- 部署到 GitHub Pages

## 简历子应用

简历功能位于 `/resume` 路径，修改 `src/resume/resumeContent.ts` 里的 `resumeContents` 即可更新简历内容。

## 本地预览

```bash
npm run dev
```

## 导出 PDF（推荐用浏览器 Print）

1. 点击页面右上角的 `打印/导出 PDF`
2. 在打印对话框里选择：
   - 尺寸：`A4`
   - 缩放：建议 `实际大小`（关闭“适应页面/缩放到页宽”等选项）
3. 目标：`保存为 PDF`

本项目通过 `@page { size: A4; margin: 0; }` + `@media print` 确保版式尽量稳定。

## 部署到 GitHub Pages

仓库使用 `main` 分支推送后自动发布到 `gh-pages` 分支（见 `.github/workflows/deploy.yml`）。

### 你需要确认的一点

如果你的 GitHub Pages URL 形如：

- `https://<user>.github.io/<repo>/`

则 Vite 的 `base` 路径必须是：`/<repo>/`。

该 workflow 会自动设置 `VITE_BASE_URL=/${{ github.event.repository.name }}/`。

