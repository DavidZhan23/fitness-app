# GitHub 需求看板（一次性配置）

> 流程说明：[requirements/README.md](README.md) · 文档中心：[../README.md](../README.md)

Issue Forms 可直接使用；看板列需 owner 在 GitHub 网页上建一次 Project。

## 1. 创建 labels

```bash
bash scripts/setup-req-labels.sh
```

## 2. 创建 Project（Board）

1. 仓库 → **Projects** → **New project** → **Board**
2. 命名例如：`Requirements`
3. 列建议：**Todo** / **Doing** / **Done**
4. 复制浏览器地址栏中的 Project URL，形如：  
   `https://github.com/users/<user>/projects/<n>`  
   或 `https://github.com/orgs/<org>/projects/<n>`

## 3. 配置仓库 Variable

Settings → Secrets and variables → **Actions** → **Variables** → New repository variable（可选）：

| Name | Value |
|------|--------|
| `REQUIREMENTS_PROJECT_URL` | 上一步复制的 Project URL（仅手动记录用） |

未配置时：不影响手动 issue 管理流程。

## 4. 看板列与 label（建议）

在 Project 设置里为列添加筛选（可选，手动拖 issue 也行）：

| 列 | 筛选建议 |
|----|----------|
| Todo | `label:status:todo` |
| Doing | `label:status:doing` |
| Done | `is:closed` |

## 5. 验证

1. 手机或网页 **New issue** → Feature request，标题随便写一句，提交
2. 手动给 issue 加 `status:todo`、`priority:med`（可选）
3. 开工时改为 `status:doing`（可选）
4. push 到 `main` 后在 issue/commit 中写 `Closes #<n>`，确认 issue 关闭
