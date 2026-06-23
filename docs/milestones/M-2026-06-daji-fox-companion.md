# Milestone: 今日页妲己狐狸陪伴

**Status:** done
**Branch:** `main`
**Started:** 2026-06-17

## 1. 任务背景

用户希望今日页在“本周成为过运动大王”后出现一只狐狸小动画。狐狸保留狐狸形象，但带苏妲己式妩媚、俏皮气质；点击狐狸后通过 AI 生成鼓励用户继续记录和运动的短文案。

## 2. 目标 (Goal)

今日页按当前登录用户本周运动大王记录显示完整的“小狸陪伴系统”，包含克制的舞台动效、状态机、单击/双击/长按互动、结构化 AI 回复和本地兜底。API 密钥只保留在服务端。

## 3. 成功标准 (Success criteria)

- [x] 当前用户本周任意一天达成运动大王时，今日页显示狐狸舞台
- [x] 狐狸逻辑的“本周”单独按周六到周五计算，周六达成后可体验到下周五，下一周六重置；其他周统计不受影响
- [x] 未达成本周运动大王时，只显示脚印/狐火的轻量解锁提示
- [x] 点击狐狸后显示妲己狐狸风格鼓励文案
- [x] 狐狸视觉使用单一完整贴图资产，有尖耳、尖嘴、白胸、蓬松尾巴、红金额饰和飘带，不再用 DOM/CSS 分段拼接狐狸
- [x] AI 未配置、超时或失败时显示本地 fallback 文案
- [x] 移动端不遮挡底部导航、记运动/记饮食入口和记录编辑操作
- [x] `prefers-reduced-motion` 下狐狸不持续走动
- [x] 单击调用结构化 DeepSeek 回复，30 秒内重复单击使用本地台词
- [x] 双击只使用本地夸奖，长按显示三个角色化互动入口
- [x] AI 返回值在服务端校验 mood/motion/expression/bubbleStyle/duration，非法值使用本地 fallback
- [x] 舞台支持浅深色、小屏、safe area、后台暂停与 reduced motion
- [x] 狐狸移动与朝向分层；左右方向使用两张逐像素镜像 PNG 切换，狐狸相关 CSS 不再使用 `scaleX`，兼容华为/Android WebView 合成层
- [x] 轨迹按舞台宽度与狐狸实际尺寸计算，覆盖左右边缘；转身在停步期使用两张完整 PNG 透明度交叉淡化，不使用水平缩放
- [x] 水平轨迹直接动画定位 `left`，百分比以舞台而非狐狸自身为参照，避免向左只走半程就转身
- [x] 狐狸资格只检查本周六到今天；今天按当前记录实时出现/消失，历史达成日从第二天起固定解锁到本狐狸周结束

## 4. Non-goals

- 不新增 DB 表或持久化聊天记录
- 不把 AI API key 暴露给前端
- 不做人形或成人化狐狸形象
- 不改变运动大王阈值
- 不新增运动分钟、步数或强度字段；只传递项目已有数据
- 不引入大型动画或状态管理依赖

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-06-daji-fox-companion.md` 自身
- [x] `docs/architecture/api-contract.md`（动 API）
- [x] `docs/architecture/overview.md` ER 节（不改表）
- [x] `docs/milestones/M-2026-05-today-page-layers.md`
- [x] `docs/milestones/M-2026-05-ai-workflow.md`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 今日页数据与布局 | `src/pages/TodayPage.tsx`、`TodayFeedbackCard` | 是 |
| 运动大王阈值 | `src/lib/communityBadges.ts` | 是，同步到服务端模块 |
| AI API 调用 | `server/src/ai/providers/deepseekText.js`、`server/src/routes/ai.js` | 是，沿用 DeepSeek env |
| 前端 API 调用 | `src/lib/api/http.ts`、`src/lib/api/index.ts` | 是 |
| 日期 key | `src/lib/streaks.ts`、`server/src/dateKey.js` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 当前登录用户、狐狸周（周六到周五）day_logs、profile BMR/代谢模式 | `{ eligible, weekStart, weekEnd, todayChampion, historicalChampionDates, championDates }` |
| 解锁资格、今日运动 kcal/记录、最近运动名、时间段、trigger | `{ text, mood, motion, expression, bubbleStyle, duration, fallback }` |

## 8. Edge cases

- 空数据：返回 `eligible: false`
- 断网 / AI 失败：前端显示 fallback
- 跨日：仅狐狸资格使用 Asia/Shanghai 周六到周五；周六重置，下周五结束
- 跨用户：只读取 `req.userId`
- 权限：所有接口需登录
- 连点：请求中不重复发送；前端冷却 + 服务端简单限频
- 页面后台：暂停舞台动画与主动台词计时器
- 历史日期：狐狸资格不用带时区的 Date 去按分钟累计，直接按全天 BMR 计算，避免 UTC 服务器少算基础代谢
- 当天日期：只按当前记录实时判断；今天达成会立刻出现，今天吃多后若不再达标且本周没有历史达成日则立刻消失

## 9. 涉及文件 / 模块（预期）

- `src/pages/TodayPage.tsx`
- `src/components/DajiFoxCompanion.tsx`
- `src/components/fox/*`
- `src/assets/daji-fox-companion-cutout-768.png`
- `src/lib/api/index.ts`
- `src/index.css`
- `server/src/routes/ai.js`
- `server/src/communityBadges.js`
- `server/src/foxCompanion.js`
- `server/src/ai/providers/deepseekFox.js`
- `docs/architecture/api-contract.md`
- `README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 服务端补运动大王判定与本周资格查询
2. 服务端补妲己狐狸鼓励 AI 接口
3. 前端补 API 方法和今日页狐狸组件
4. 增加 CSS 动画、降级动效和文档
5. 补单测并跑类型/测试
6. 按用户反馈将 CSS 几何狐狸升级为精细 SVG 狐狸角色
7. 按用户反馈将狐狸资格窗口从自然周调整为周六到周五
8. 按用户反馈将内联分段 SVG 狐狸替换为单一完整贴图资产，动画只作用于整张贴图
9. 升级为小狸状态机、角色气泡、长按菜单和本地台词库
10. 将 DeepSeek 协议升级为结构化 JSON，增加服务端校验、超时、兜底和限频
11. 增加未解锁提示、响应式舞台、后台暂停和 reduced-motion 降级

**后续（不做）：**

- 多轮聊天
- 用户可配置狐狸开关
- 狐狸换装 / 多角色
- 手势轻扫与真正骨骼/Spine 2D 动画

## 11. 测试方案

- 纯函数单测：`server/test/foxCompanion.test.js`
- 前端结构化校验/进度分类：`src/lib/__tests__/foxCompanionUi.test.ts`
- 服务端资格/周边界/结构化校验：`server/test/foxCompanion.test.js`
- 局部验证：狐狸相关 13 项测试、`npm run typecheck`、`npm run build`、`npm run lint`
- UI 响应式：`npm run check:today-responsive` 8/8 通过；全量 E2E 39/39 通过
- 已知无关基线问题：全量 unit 的 `communityBadges` 旧断言、`MealPhotoSection.tsx` storage guard

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| AI 输出过长或跑题 | 服务端 prompt 限制 + 截断 + fallback |
| 前后端称号规则不一致 | 服务端新增同名规则模块，测试覆盖阈值 |
| 狐狸挡住操作 | 使用内嵌舞台，不做全局悬浮 |
| 动画影响敏感用户 | `prefers-reduced-motion` 静止 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`（若动 API）
- [x] 根 `README.md`「功能」一节（用户可见的新功能）
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR / 删除狐狸组件与两个 AI 接口
- DB：无 schema 变更
- 部署：重新部署上一版前端与 API

## 15. 是否满足最小可运行闭环

是——本周达成运动大王的用户打开今日页即可看到狐狸，点击后可得到鼓励文案。
