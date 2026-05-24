# GitHub 需求看板（一次性配置）

> 流程说明：[requirements/README.md](README.md) · 文档中心：[../README.md](../README.md)

Issue Forms 与 `issue-triage` workflow 在仓库合并后即可用；**看板列**需 owner 在 GitHub 网页上建一次 Project。

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

Settings → Secrets and variables → **Actions** → **Variables** → New repository variable：

| Name | Value |
|------|--------|
| `REQUIREMENTS_PROJECT_URL` | 上一步复制的 Project URL |

未配置时：issue 仍会自动打 `status:todo` 并 assign 给作者，只是**不会**自动进看板。

## 4. 看板列与 label（建议）

在 Project 设置里为列添加筛选（可选，手动拖 issue 也行）：

| 列 | 筛选建议 |
|----|----------|
| Todo | `label:status:todo` |
| Doing | `label:status:doing` |
| Done | `is:closed` |

## 5. 验证

1. 手机或网页 **New issue** → Feature request，标题随便写一句，提交
2. 确认 issue 有 `status:todo`、`priority:med`、assignee 为你自己
3. 开 PR 正文写 `Closes #<n>`，确认 issue 变为 `status:doing`
4. 合并 PR 后 issue 自动 close
