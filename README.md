# Resume Site (React + Vite + Tailwind)

一个“单页 A4 简历”的静态站点：内容就是你的简历排版，同时支持：

- 在浏览器里打开查看
- 直接用浏览器 `print` 导出 PDF（不需要额外的 PDF 生成逻辑）
- 部署到 GitHub Pages

## 替换简历内容

把文件 `src/resume/resumeContent.ts` 里的 `resumeContent` 换成你的真实信息即可。

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

