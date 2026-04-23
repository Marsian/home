# Pixel Knight 资产目录与命名规范

## 目录结构
- `characters/`：角色主体点阵（如 `knight.json`、`archer.json`、`mage.json`）。
- `equipment/helmet/`：头盔。
- `equipment/armor/`：护甲。
- `equipment/main-hand/`：主手武器。
- `equipment/off-hand/`：副手装备。

## 文件命名
- 统一使用小写短横线：`kebab-case`。
- 文件名需体现“归属 + 类型 + 具体内容”。
- 推荐格式：`<owner>-<material-or-style>-<category>.json`

示例：
- `cloth-cap.json`
- `iron-helmet.json`
- `iron-armor.json`
- `iron-sword.json`
- `wood-shield.json`

## 约束
- 同类资产必须放在同一分类目录，不混放。
- 文件名不使用模糊词（如 `new`, `final`, `v2`）。
- 新增资产时必须同步更新引用文件（如 demo、渲染配置、编辑器入口）。
