# Milestone: 超人大战蝙蝠侠联名皮肤

**Status:** done
**Branch:** `dev/huanghongli`
**Started:** 2026-08-10

## 1. 任务背景

用户希望沿用现有皮肤设计与接入流程，只新增一套“超人大战蝙蝠侠”联名皮肤。现有主题系统以 `AppStyle`、设置页主题选项、独立 CSS token 文件和可选的今日页联名主视觉为核心，不需要后端或数据库改动。

## 2. 目标 (Goal)

新增一套可在“设置 → 主题风格 → 浅色系”选择的“超蝙对决”超人大战蝙蝠侠联名皮肤；皮肤以用户提供的红黑宣纸水墨海报为视觉基准，覆盖现有主要页面的语义色、热力图、设置预览、欢迎语与今日页缺口主卡，并保持其他主题无回归。

冻结的视觉语义：

- 页面与面板：宣纸灰白、纸白卡和淡灰墨层
- 运动与缺口：墨黑、石墨灰四阶；饮食、盈余与主操作：朱砂红、暗红四阶
- 主视觉：以用户提供的竖版水墨海报为源，确定性扩展为 `1024×576` 横版；保留人物、红黑徽记和原始笔触，裁掉底部片名/版权栏，左侧扩为低细节宣纸安全区
- 设置页名称：`超蝙对决`；内部主题 ID：`batman-v-superman`

## 3. 成功标准 (Success criteria)

- [x] 设置页浅色系只新增一项主题，选择后即时生效，刷新后由现有 Cookie 机制恢复
- [x] 今日页、运动/饮食记录、打卡墙、社区、设置等现有界面使用统一且可读的主题 token
- [x] 今日页提供一张可关闭的联名主视觉；关闭后使用该主题自身的纯 CSS 氛围背景
- [x] 正文与关键按钮满足项目主题对比度检查（常规文本 WCAG AA ≥ 4.5:1）
- [x] 不改变其他 11 套主题，不新增 API、数据库字段或依赖
- [x] 移动端主卡文字、数字、按钮与角色主体不互相遮挡
- [x] 设置页名称为“超蝙对决”，描述明确体现宣纸、墨黑、朱砂红和水墨双雄主卡

## 4. Non-goals

- 不制作第二套超人/蝙蝠侠变体或深色版
- 不加入首次引导的推荐主题列表
- 不新增角色互动、动画、音效、剧情页或独立皮肤商城
- 不修改热量计算、业务数据、API 或数据库

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-08-batman-v-superman-theme.md` 自身
- [x] `.cursor/rules/*.mdc`
- [x] `docs/ai-playbook.md`
- [x] `docs/decisions/0007-theme-tokens.md`
- [x] `src/styles/themes/README.md`
- [x] `docs/ops/theme-cutout-workflow.md`
- [x] `docs/ops/theme-contrast-subagent.md`
- [x] 最近完整主题提交 `19f8117`（JOJO“时停入侵”）
- [x] `docs/architecture/api-contract.md`（本次不动 API，无需更新）
- [x] `docs/architecture/overview.md`（本次不动表，无需更新）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 主题注册、Cookie 持久化与根节点 `data-style` | `src/context/StyleContext.tsx` | 是，扩展现有 union/白名单 |
| 设置页主题分组、排序与预览 | `src/lib/styleOptions.ts`、`src/pages/SettingsPage.tsx` | 是，只添加一项元数据 |
| 欢迎语与联名主视觉开关 | `src/lib/themeMeta.ts`、`HeroGreeting`、`HeroCollabSwitch` | 是，不新建组件 |
| 主卡图片渲染与开关 | `src/index.css` 的 `--hero-card-image-*` / `[data-hero-collab]` 契约 | 是 |
| 全页面主题语义色 | `src/styles/themes/*.css` token 契约 | 是，新建一套同名 token 值 |
| 主题对比度验证 | `scripts/check-theme-contrast.mjs` | 是 |
| 响应式主卡验证 | `e2e/today-responsive.spec.ts`、`e2e/site-responsive.spec.ts` | 是，优先复用通用断言 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 用户在设置页选择新主题 | `<html data-style="batman-v-superman">`，并写入现有 `fitness_style` Cookie |
| 当前用户昵称与主题 ID | 主题专属欢迎语 |
| 现有运动、饮食与缺口数据 | 仅改变视觉呈现，不改变计算结果 |
| “展示水墨双雄”开关 | 开：主卡联名图；关：主题 CSS 宣纸氛围背景 |

## 8. Edge cases

- 空数据：沿用现有组件空态，只改变配色
- 断网：主题完全本地生效；无网络依赖
- 刷新/重开：沿用 Cookie 白名单恢复新主题
- 主视觉关闭：图片层必须完全隐藏，文字仍保持可读
- 小屏与长数字：沿用主卡响应式排版，并检查角色主体不压住关键信息
- `prefers-reduced-motion`：本主题不新增持续动画

## 9. 涉及文件 / 模块（预期）

- `public/theme/batman-v-superman-hero.jpg`
- `src/styles/themes/batman-v-superman.css`
- `src/styles/themes/index.css`
- `src/context/StyleContext.tsx`
- `src/lib/styleOptions.ts`
- `src/lib/themeMeta.ts`
- `src/index.css`
- `src/styles/themes/README.md`
- `docs/decisions/0007-theme-tokens.md`
- `README.md`
- 本 milestone 与索引

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 冻结视觉方向、主题名和语义色分工
2. 以用户提供海报为源扩展并验收一张 16:9 今日页联名主视觉
3. 添加完整主题 token、主题注册、设置预览与欢迎语
4. 接入可关闭的主卡图片，并补齐主题专属局部覆盖
5. 运行对比度、类型、单测、响应式/拟人 UI 与全量验证
6. 同步主题文档与用户可见功能说明

**后续（不做）：**

- 第二套角色站位或漫画版素材
- 角色动效、互动或音效
- 自定义上传色板/素材

## 11. 测试方案

- `npm run check:theme-contrast`
- `npm run verify`
- `persona-ui-test`：移动端设置页切换、刷新持久化、今日页主卡开/关、打卡墙、社区、运动/饮食记录页
- 手动检查：主卡 ON/OFF、窄屏长数字、热力图四阶、设置预览卡、底栏激活态
- **拟人探查结论**：通过。以新注册空数据用户在真实浏览器中完成设置页选中主题、今日页名片 ON/OFF、刷新持久化、社区页和桌面/移动端检查；`390×844` 与 `1280` 视口均无横向溢出，主卡人物保持在右侧，左侧日期、热量和三项统计可读。关闭图片后伪元素透明度为 `0`，刷新仍保持关闭；恢复后图片正常显示。2026-08-10 按用户复核意见重建主图左侧宣纸与过渡区，去除横向墨痕和竖向拼接亮带，并将主题名更新为“超蝙对决”、问候更新为“准备好迎接你的 fitness day 了吗？”。
- **打卡墙主题元素**：2026-08-12 根据实机截图复核，将居中大水印改为日期下缘独立徽记：奇数日为内含微型衬线 `S` 的朱砂力量菱盾、偶数日为石墨蝙翼；日期上移并保持视觉主位，深色点亮格的徽记切换为纸白/暖金。注册前隐藏徽记，未来日弱化；今日、选中和右上角荣誉徽章使用独立层级，避免任何重叠。
- **权限/异常探查**：未登录访问受保护页面会跳转登录；主题资源为本地静态文件，关闭图片时仍有纯 CSS 宣纸背景，不依赖外部网络。
- **拟沉淀 e2e**：如现有通用断言不足，再添加主题注册/持久化的最小稳定用例

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 角色图压住主卡文字或统计 | 扩图时在左侧保留 UI 安全区；用 cover 定位与 atmosphere overlay 微调；移动端实测 |
| 朱砂红或浅灰正文对比不足 | 正文使用独立墨黑/深灰阶；红色只承担强调语义；跑 ≥4.5:1 检查 |
| `src/index.css` 的主题专属选择器漏接 | 以最近完整联名主题为清单逐项比对，并做设置/今日/打卡墙/社区巡检 |
| 素材体积过大 | 输出按现有 1024×576 规格压缩为约 128 KB，不保留无用备用图 |
| 用户提供的联名角色素材外部发布授权 | 项目内按用户指示编辑；上线或公开商业分发前由项目所有者确认授权边界 |

## 13. 文档同步计划（合并前必须完成）

- [x] `src/styles/themes/README.md`
- [x] `docs/decisions/0007-theme-tokens.md`
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert 本次主题提交；旧 Cookie 值会由 `normalizeStyle` 回退到 `default`
- DB：无 schema 变更
- 部署：重新部署上一个前端版本

## 15. 是否满足最小可运行闭环

是——主题可在设置页选择并持久化，完整语义 token、主视觉开关、响应式 UI、对比度检查和文档同步均已闭环。
