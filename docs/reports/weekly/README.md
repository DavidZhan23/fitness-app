# 每周质量报告

> 这里存放 fitness-app 的前端体验观测周报。
> 每份报告涵盖路由切换耗时、页面加载耗时、AI 估算成功率/超时率/fallback 完成率，
> 以及 DeepSeek AI 辅助解读与优化建议。

## 文件命名

```
YYYY-Www.md
```

例如：`2026-W22.md`（ISO 8601，周一为每周起点）

## 数据来源

- 原始事件：PostgreSQL `telemetry_events`（由前端 `trackMetric` 上报）
- 聚合结果：PostgreSQL `weekly_reports`（每周一 02:00 Asia/Shanghai 自动生成）

**`docs/reports/weekly/` 只是导出物（沉淀用），不是主数据源。**
主数据源永远是 PG；如需重新生成，走 regenerate API 或 CLI。

## 在 App 内查看（推荐）

1. 生产环境 `deploy/.env` 配置 `DEVELOPER_EMAILS=你的登录邮箱`
2. 重启 API 后，用该邮箱登录 PWA
3. **设置** 页顶部会出现 **「开发者后台 · 质量周报」**，可浏览列表与全文，并支持重新生成

## 如何生成和拉取

### 自动（生产环境）

后端 node-cron 每周一 02:00（Asia/Shanghai）自动生成上一周的报告，写入 `weekly_reports` 表。

### 手动拉取到本地 docs

```bash
# 1. 确认你的登录 token（admin 邮箱账号登录后从 DevTools localStorage 取）
export WEEK=2026-W22
export TOKEN=<你的 JWT>

# 2. 拉取并写入文件
node scripts/pull-weekly-report.mjs $WEEK --token $TOKEN

# 3. 提交（可选）
git add docs/reports/weekly/$WEEK.md
git commit -m "docs: add weekly report $WEEK"
```

如果文件已存在，加 `--force` 覆盖：

```bash
node scripts/pull-weekly-report.mjs 2026-W22 --token $TOKEN --force
```

### Mock 测试（不连 DB）

```bash
node scripts/weekly-telemetry-report.mjs --mock
```

### 手动触发生成（admin）

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/telemetry/weekly-reports/2026-W22/regenerate
```

## 报告格式

见 [`docs/metrics/weekly-report-template.md`](../metrics/weekly-report-template.md)，包含：

1. 本周结论
2. 核心指标（路由切换 / 页面加载 / AI 估算，含环比）
3. 异常路由 Top 5
4. 页面加载分析
5. AI 估算分析
6. 可能原因（AI 解读，严谨可证伪表达）
7. 优化建议（3 条，可落地）
8. 下周验证目标

## 隐私说明

周报**不包含**任何用户 PII：

- 不含饮食文本、体重、身体数据
- 不含用户 ID 或邮箱
- 只包含聚合数字、路由路径（非敏感）和 AI 生成的分析文字

原始事件的 metadata 白名单同样不含 PII，见
[`docs/metrics/frontend-metrics-design.md`](../metrics/frontend-metrics-design.md) §2。
