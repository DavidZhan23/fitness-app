# Milestone: 滚动修复、评论回复、头像、打卡墙选中

**Status:** done
**Branch:** `main`
**Issue:** #50, #30, #75, #71, #78
**Started:** 2026-05-28

## 1. 任务背景

多个体验 issue：主 Tab 页滚不到底、评论回复后找不到输入框、无自定义头像、打卡墙选中日不够醒目。

## 2. 目标 (Goal)

修复 `.app-main` / `.page-standalone` 纵向滚动；评论点回复滚到输入框；支持上传/清除头像并在社区展示；打卡墙选中日用主题 token 高亮且不与皮肤撞色。

## 3. 成功标准 (Success criteria)

- [x] 今日/打卡/社区/设置等长页可滚至最底部（#30 #75）
- [x] 社区用户页点「回复」后输入框进视口（#50）
- [x] 设置页可上传/移除头像，社区名片显示图片（#71）
- [x] 打卡墙（classic/split）选中日框线清晰、加粗，九主题可辨（#78）
- [x] `npm run verify` 通过

## 4. Non-goals

- 微信步数、独立头像 CDN、改打卡选中业务逻辑、#76 设置代谢合并

## 5. 已阅读的相关文档

- [x] `docs/architecture/api-contract.md`
- [x] `docs/decisions/0007-theme-tokens.md`
- [x] `.cursor/rules/06-reuse-first.mdc`

## 6. 可复用代码

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 主滚动容器 | `.app-main` / `getCommunityMainElement` | 是 |
| 资料 PATCH | `profilePatch.js`, `buildProfilePatchBody` | 扩展 |
| 打卡格渲染 | `MonthGrid` in `MonthHeatmap.tsx` | 扩展 |
| 头像占位 | `UserAvatar.tsx` | 扩展 |

## 7. 涉及文件

- `src/index.css`, `src/styles/themes/*.css`
- `src/components/DayCommentSection.tsx`, `MonthHeatmap.tsx`, `UserAvatar.tsx`
- `server/migrations/018_profile_avatar_url.sql`, `profilePatch.js`, `community.js`

## 8. 测试方案

- `npm run verify`
- e2e：滚动、回复 compose、选中日 class、头像（可选）
