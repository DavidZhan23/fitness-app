# 文档里的流程图

## 怎么看（推荐）

1. 打开 `docs/architecture/overview.md` 或 `docs/README.md`
2. **`Cmd+Shift+V`** 打开 Markdown 预览  
3. 看到深色竖向流程图（与协作流程一致）

图源：`scripts/generate-dark-flowchart.py` → `npm run diagrams:regen`（**不用 Mermaid**，避免中文裁字）。

## 风格说明

- 深色底 `#2d2d2d`、灰框、细线、决策用菱形  
- **只保留这类简图**，不再用彩色架构/时序大图  

## 可选：Cursor 渲染 Mermaid 源码

1. `.vscode/settings.json` 已设 `markdown.mermaid.enabled: true`  
2. 可安装 **Markdown Preview Mermaid Support**  
3. 必须用 **预览**（`Cmd+Shift+V`），编辑区只见源码  

在线编辑： [mermaid.live](https://mermaid.live) 粘贴 `dev-workflow.mmd` 内容。
