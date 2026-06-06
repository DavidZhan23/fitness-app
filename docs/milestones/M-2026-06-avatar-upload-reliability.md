# Milestone: 头像大图上传可靠性修复

**Status:** done
**Branch:** `main`
**Started:** 2026-06-06

## 1. 任务背景

部分头像可以上传，部分头像上传失败。现有前端最初会拒绝超过 8MB 的原图，且裁剪结果固定使用 JPEG 0.85 质量；首轮修复放宽到 20MB 后，用户进一步要求超过 20MB 的可解码图片也能自动缩小像素并进入裁剪。

## 2. 目标 (Goal)

让浏览器可解码的大图在进入裁剪前自动降采样，并确保裁剪后的头像在提交前自适应压缩到现有 API 限制内。

## 3. 成功标准 (Success criteria)

- [x] 超过 20MB 的可解码图片自动缩小像素并进入头像裁剪
- [x] 超高分辨率图片自动限制像素尺寸，降低裁剪时内存占用
- [x] 格式无法读取时，在进入裁剪前显示明确错误
- [x] 固定质量超限时自动降低 JPEG 质量后上传
- [x] 聚焦测试、类型检查与生产构建通过

## 4. Non-goals

- 不引入头像 CDN / 对象存储
- 不修改头像 API 的 data URL 格式和服务端上限
- 不新增 HEIC 转码能力

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-05-scroll-avatar-wall.md`
- [x] `docs/architecture/api-contract.md`
- [x] `docs/ai-playbook.md`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 头像选图、裁剪与导出 | `src/lib/avatarImage.ts` | 是，扩展 |
| 头像资料更新 | `SettingsPage.tsx#updateProfile` | 是 |
| 服务端头像校验 | `server/src/profilePatch.js` | 是，不修改 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 浏览器可读取的图片 | 降采样后的裁剪源图 + 120,000 字符以内的 JPEG data URL |
| 无法读取的图片 | 用户可理解的错误信息 |

## 8. Edge cases

- 超过 20MB：最长边缩到 2048px 后进入裁剪。
- 20MB 以内但最长边超过 4096px：最长边缩到 4096px 后进入裁剪。
- 浏览器不支持的图片编码：提示无法读取图片。
- 高细节裁剪：逐级降低 JPEG 质量，仍超限时提示更换图片。
- 断网 / API 错误：沿用现有上传错误提示。

## 9. 涉及文件 / 模块（预期）

- `src/lib/avatarImage.ts`
- `src/pages/SettingsPage.tsx`
- `src/lib/__tests__/avatarImage.test.ts`
- `docs/milestones/README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 移除原图文件大小硬拒绝，进入裁剪前自动降采样。
2. 自适应压缩裁剪结果，补测试与验证。

**后续（不做）：**

- 客户端 HEIC 转码、头像对象存储。

## 11. 测试方案

- 纯函数单测：自适应 JPEG 质量选择与全部超限错误。
- `npm run typecheck`
- `npm test -- src/lib/__tests__/avatarImage.test.ts`
- `npm run verify`

验证结果：

- 聚焦单测（7 个）、类型检查、生产构建通过。
- `npm run verify` 被当前工作区已有问题阻断：`communityBadges` 既有断言失败、`MealPhotoSection.tsx` storage guard 失败。
- E2E 可连接本地数据库并完成 QA seed 清理，但本机未安装 Playwright Chromium，浏览器启动前失败。

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 大图解码占用移动端内存 | 可解码后立即降采样；损坏、格式不支持或设备无法解码时明确报错 |
| 降质后头像观感下降 | 从 0.85 开始逐级降低，仅在超限时降质 |

## 13. 文档同步计划（合并前必须完成）

- [x] API 契约不变，无需修改 `docs/architecture/api-contract.md`
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert 本次前端与测试改动；无 DB 变更。

## 15. 是否满足最小可运行闭环

是——用户选图、裁剪、压缩并提交头像的路径完整。
