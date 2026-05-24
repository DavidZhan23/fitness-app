# 文档配图

**风格**：深色底、竖向方框、细线、决策菱形（与协作流程截图一致）。

**生成方式**：`scripts/generate-dark-flowchart.py` 直接输出 SVG（**不用 Mermaid**），避免中文、`#` 等字符被裁切。

| 输出 | 维护 |
|------|------|
| dev-workflow.svg | 改 `generate-dark-flowchart.py` 里 `render_dev_workflow` |
| issue-to-merge.svg | 改 `render_linear(...)` 列表 |

## 重新生成

```bash
npm run diagrams:regen
```

`.mmd` 文件已弃用，仅作历史参考可删。

## 预览

打开 md → **`Cmd+Shift+V`**。
