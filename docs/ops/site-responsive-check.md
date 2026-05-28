# Site Responsive Check

程序化检查主流程页面在多种视口下无横向溢出，且关键控件 bounding box 落在视口内（避免 `overflow-x: hidden` 掩盖问题）。

## 命令

```bash
npm run check:today-responsive   # 仅 Today 首屏
npm run check:site-responsive    # 今日 / 记运动 / 打卡 / 社区 / 模板 / 设置
```

前置：PostgreSQL + `npx playwright install chromium`（与 `npm run test:e2e` 相同）。

**不进**默认 `npm run verify`。

## 视口（`src/lib/responsive.ts`）

| 名称 | 尺寸 |
|------|------|
| iphone-se-legacy | 320×568 |
| android-narrow | 360×640 |
| iphone-se | 375×667 |
| iphone-12 | 390×844 |
| pixel-7 | 412×915 |
| iphone-14-pro-max | 430×932 |
| tablet-portrait | 768×1024 |
| desktop-smoke | 1440×900 |

## 检测项

1. `documentElement` / `body` / `.app-main` 无横向 `scrollWidth` 溢出
2. `.app-main__inner` 内可见子元素 `right` 不超过视口宽
3. 各页锚点 `scrollIntoView` 后与 `.app-main` scrollport 相交，且左右在视口内
4. Tab 页滚到底后，末项 `bottom <= .app-tabbar.top - 8px`（打卡「返回今日」、社区底链、模板末卡、设置「退出登录」）

## 手动补充

改 Layout、打卡墙日历、社区卡、设置长页后，在 320 / 390 宽度真机或模拟器扫一眼首屏与底栏是否遮挡。
