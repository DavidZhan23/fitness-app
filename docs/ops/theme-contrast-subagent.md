# Theme Contrast Subagent

用于在“皮肤/主题”改动后，统一检查文字与填充色对比度（WCAG）。

## 何时调用

- 修改了 `src/styles/themes/*.css`
- 修改了与主题文本颜色相关的 token（如 `--text-*`、`--btn-*`、`--bmr-*`）
- 修改了会影响主题可读性的组件样式（如 `.text-brand`、`.text-muted` 映射）

## 一键命令

```bash
npm run check:theme-contrast
```

说明：命令会执行 `scripts/check-theme-contrast.mjs`，并在任一检测对低于 4.5:1 时返回非 0 退出码。

## Subagent Prompt（可直接粘贴）

```text
请作为“主题对比度检查 subagent”工作：

1) 先执行：npm run check:theme-contrast
2) 如果失败，按主题分组输出：
   - 失败 token 对（前景 / 背景）
   - 对比度数值
   - 可能受影响的 UI 区域
3) 给出最小修复建议（优先 token 级修复，不改结构）。
4) 修复建议必须满足：
   - WCAG AA（常规文本 >= 4.5:1）
   - 尽量保持主题语义（不把所有文本都改成同一颜色）
5) 最后给一个“通过/未通过”结论和待办清单。
```

## 推荐工作流

1. 先完成主题视觉调整。
2. 运行 `npm run check:theme-contrast`。
3. 若失败，调用上面的 subagent prompt 生成修复建议。
4. 修复后再次运行，直到通过。
