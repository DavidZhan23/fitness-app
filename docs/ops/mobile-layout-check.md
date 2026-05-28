# Mobile Layout Check

用于在改动全局布局、底栏、社区列表、打卡墙等移动端 UI 后，确认多种常见视口下无横向溢出、底栏贴底、关键控件仍在视口内。

## 何时调用

- 修改了 `src/components/Layout.tsx`、`src/index.css` 中 `.app-shell` / `.app-main` / `.app-tabbar`
- 修改社区卡、打卡墙分屏、设置页长列表等可能影响宽度的组件
- 调整 `safe-area`、底栏高度、`100dvh` 等移动端 shell 样式

## 一键命令

```bash
npm run check:mobile-layout
```

说明：命令会执行 Playwright spec `e2e/mobile-layout.spec.ts`，在 4 个移动视口（iPhone SE、Pixel 5、iPhone 14 Pro Max、Galaxy S8）下遍历今日 / 打卡 / 社区 / 模板 / 设置 / 记运动页；任一断言失败则返回非 0 退出码。

**前置条件**（与 `npm run test:e2e` 相同）：

- 本地 PostgreSQL：`postgres://localhost:5432/fitness`（见 [本地数据库启停.md](本地数据库启停.md)）
- 首次需安装浏览器：`npx playwright install chromium`
- Playwright 会自动启动 API（3101）与 Vite（4173），默认 `REGISTRATION_KEY=e2e-test-key`

**不接入** `npm run verify` 默认流程；改布局相关 UI 时请手动跑本命令。

## 检测项

| 检查 | 说明 |
|------|------|
| 横向溢出 | `documentElement`、`body`、`.app-main`（或独立页的 `.page-standalone`）的 `scrollWidth` 不得大于 `clientWidth` |
| 底栏 | `.app-tabbar` 完整落在视口内 |
| 关键控件 | 各页标题、CTA、社区 tab 等锚点 `scrollIntoView` 后不与底栏重叠，且横向落在视口宽度内 |

## Subagent Prompt（可直接粘贴）

```text
请作为「移动端布局检查 subagent」工作：

1) 先执行：npm run check:mobile-layout
2) 如果失败，按视口 + 路由分组输出：
   - 失败视口名（如 iphone-se）
   - 当前路由
   - overflow 层（documentElement / body / .app-main）及超出像素
   - 或哪个控件被挤出视口（label + bounding box）
3) 给出最小修复建议（优先 CSS：max-width、overflow-x、flex-wrap，避免硬编码超宽 px）。
4) 修复后再次运行，直到通过。
5) 最后给出「通过/未通过」结论。
```

## 推荐工作流

1. 完成布局相关改动。
2. 运行 `npm run check:mobile-layout`。
3. 若失败，根据报错视口与路由定位组件，修复后重跑。
4. 大改主题色对比度时仍用 `npm run check:theme-contrast`（二者互补）。

## 相关文件

- `e2e/mobile-layout.spec.ts` — 主 spec
- `e2e/helpers/layout.ts` — 溢出与视口断言
- `e2e/fixtures/mobile-viewports.ts` — 视口矩阵
