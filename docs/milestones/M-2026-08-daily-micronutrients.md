# Milestone: 每日微量元素（独立页 + 整日 AI 快照 + 三态科普）

**Status:** done
**Branch:** `dev/huanghongli`
**Issue:**
**Started:** 2026-08-12

## 1. 任务背景

宏量营养页（P/F/C + 添加糖）已上线；用户仍无法从「今日吃了什么」看到维生素/矿物质是否可能偏少。宏量 milestone 曾将微量元素列为 Non-goals，现作为营养页增强单独开项。

## 2. 目标 (Goal)

本人从营养页轻量入口进入独立 `/micronutrients` 页面，查看当日（可切历史日）**整日**微量元素估算。新页以紧凑网格呈现固定 16 项三态（可能充足 / 可能不足 / 信息不足），支持按状态/类别筛选；点开单项后查看 AI 当日说明、不足食物建议，以及静态「人体作用 / 常见食物」科普。餐食增删改后保存立刻成功，后台异步重算并在未完成时给出「更新中」提示。

## 3. 成功标准 (Success criteria)

- [x] `day_logs` 持久化整日微量快照（JSON）+ 餐食指纹 + 状态（`idle|pending|ready|error`）
- [x] 今日：meal POST/PATCH/DELETE 成功后触发异步重算；失败不挡记餐
- [x] `/nutrition` 仅保留微量元素轻量入口卡，不再铺开 16 项长列表；入口带当前日期跳转 `/micronutrients`
- [x] `/micronutrients` 复用本地日期约定，支持历史日切换、pending 轮询、error 重试、无餐空态
- [x] 新页显示三态数量芯片、`全部/可能不足/维生素/矿物质` 筛选与紧凑网格，窄屏 2 列、稍宽 4 列
- [x] 单项详情使用可关闭、可滚动且不被底栏遮挡的 sheet/全宽面板；网格不直接铺 note/食物长文
- [x] 16 项均有静态「人体作用 / 常见食物」科普；两个同权按钮页内展开/收起，不调用 AI
- [x] 异步进行中：独立页有明确「正在根据今日饮食更新微量元素…」类提示
- [x] 历史日：有快照只读；无快照则打开营养页懒算一次；之后仅餐变再算
- [x] 固定 16 项清单 + 三态 UI；不足项 1–3 个 AI 食物建议；独立页固定免责声明
- [x] 无餐食空态；AI 未配置/失败不挡宏量，可重试；失败不写「成功」指纹
- [x] 仅本人；`npm run verify`；api-contract / overview ER / README 功能节同步

## 4. Non-goals

- 社区 / 他人可见
- 手填编辑 16 项；餐食级微量列
- 周报 / 趋势图 / 周对比
- 营养表 OCR 微量；保健品商城 / 品牌剂量建议
- 纤维 / 水分
- 新图表 npm 依赖
- 塞进 `calories.ts` / BMR·TDEE 公式

## 5. 已阅读的相关文档（必填）

- [x] 本 milestone 文档
- [x] `docs/milestones/M-2026-08-daily-nutrition-macros.md`（前序；微量为其 Non-goal）
- [x] `docs/architecture/api-contract.md`（实现时更新）
- [x] `docs/architecture/overview.md` ER 节（实现时更新）
- [x] Grill 结论 2026-08-12（见文末）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 营养页壳 / 日期切换 / 空态 | `src/pages/NutritionPage.tsx` | 是（入口卡；日期逻辑抽为共享 hook） |
| 独立页路由 / 底栏 | `src/App.tsx` / `src/components/Layout.tsx` | 是（新增子路由，底栏仍为三项） |
| 日期、day-log 加载、pending 轮询、重试 | 营养页现有页内逻辑 | 抽为 `src/hooks/useNutritionDay.ts`，两页共用；复用 `dayLogService` 与 `streaks`，仓库暂无同职责 hook |
| 餐食变更钩子 | `server/src/dayLogMutation.js#afterExerciseOrMealChanged` | 是（meal 路径踢异步；勿因运动误踢） |
| 日日志拉取 | `dayLogService` / `httpData` day-logs | 是（扩展 DayLog 字段） |
| DeepSeek 文本 | `server/src/ai/providers/deepseekText.js` | 是（新 estimate 函数，勿破坏 kcal/宏量 prompt） |
| 按需营养建议模式 | `POST /ai/macro-advice` | 参考模式；微量以写路径异步+懒算为主 |
| 宏量 backfill 进行中提示 | NutritionPage backfill banner | 是（同类 status UI） |
| 日期 key | `src/lib/streaks.ts#formatDateKey` | 是 |
| 微量目录 / 三态 / 指纹 | `src/lib/micronutrients.ts` + `server/src/micronutrients.js` | 是（前端目录扩展静态科普；后端核心不改） |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 当日 meals（id, name, kcal） | 餐食指纹（稳定 hash / 排序拼接） |
| Profile（性别等，可选） | 规则侧关注提示（如铁/叶酸）；不编造清单 |
| AI 整日估算 | 16 项 `{ id, status, note?, food_suggestions? }` + 可选短摘要 |
| 写路径 / 开页懒算 | `micronutrient_status`、`micronutrient_fingerprint`、`micronutrient_summary`（JSONB）落 `day_logs` |

### 固定 16 项 id

维生素：`vit_a` `vit_c` `vit_d` `vit_e` `vit_k` `vit_b1` `vit_b2` `vit_b6` `vit_b9` `vit_b12`

矿物质：`calcium` `iron` `zinc` `magnesium` `potassium` `iodine`

三态：`adequate` | `low` | `unknown`（UI：可能充足 / 可能不足 / 信息不足）

## 8. Edge cases

- 无餐食：不调 AI；空态 + CTA 记餐
- AI 未配置 / 超时 / 非法 JSON：status=`error` 或保留上次 `ready` 快照 + 可重试；不写成功指纹
- 进行中：`pending`；前端轮询或随 day-log 刷新看到提示
- 并发：同日多次 meal 变更应合并/串行最新指纹，避免旧任务覆盖新结果
- 跨日：前端本地 date key；与后端 Asia/Shanghai 边界沿用现网
- 仅 meal 变更触发；纯运动变更不触发微量重算
- 免责：非检测、非医疗；不足只推食物不推补剂剂量

## 9. 涉及文件 / 模块（预期）

- `server/migrations/035_day_logs_micronutrients.sql` + `db.js#runMigrations`
- `server/src/micronutrients.js`（目录常量、指纹、校验 AI JSON、调度）
- `server/src/ai/providers/deepseekText.js`（新估算入口）
- `server/src/routes/logs.js` + `dayLogMutation.js`（meal 后 kick）
- `server/src/routes/ai.js` 或 logs 下 `POST .../micronutrients/refresh`（手动重试）
- `src/lib/micronutrients.ts`、`src/types/index.ts`、`src/lib/api/index.ts`
- `src/pages/NutritionPage.tsx`（轻入口）、`src/pages/MicronutrientsPage.tsx`（独立页）+ 共享 hook + 必要 CSS
- `docs/architecture/api-contract.md`、`overview.md`、根 `README.md`
- 单测：指纹 / JSON 校验 / 状态机

## 10. 实现步骤（MVP 与后续分开）

**MVP：**

1. Schema + DayLog 映射
2. 固定目录 + 指纹 + AI prompt/parse
3. 异步调度（meal 后 + 历史懒算 + 重试）
4. 营养页轻入口 + 独立微量页：状态 / 筛选网格 / 单项详情 / 静态科普 / 免责 / 空态
5. 文档 + 单测 + verify

**后续（不做本轮）：** 趋势、手填、社区、补剂、OCR

## 11. 测试方案

- 纯函数：指纹稳定、AI JSON 校验、未知 id 丢弃
- 手动：记餐 → 营养页见 pending → ready；关 AI key 仍可记餐；历史无快照开页懒算
- 拟人：空态 / pending / low 建议 / 免责可见
- e2e：可选 mock；至少 smoke 不因新字段破页

### 拟人探查结论（2026-08-12）

- 人设：`self-today` 为主，补充 `self-history` / `new-empty`
- 环境：本地 API + Vite；默认视口与 320×720 窄屏
- 通过：无餐空态不调 AI；餐食保存后异步进入 pending；AI 未配置转为友好 error 且可重试；ready 固定渲染 16 项，按 low → unknown → adequate 排序，不足项展开 1–3 个日常食物建议；旧快照保留时明确标注可能过期；免责声明固定可见
- 通过：历史无快照开页懒算；失败不写成功指纹；纯运动写入前后快照状态 / 指纹 / 更新时间不变；餐食 POST / PATCH / DELETE 均触发或复位对应状态
- 通过：320px 无横向溢出；未登录访问 `/nutrition` 重定向 `/login`；浏览器控制台无 error / warning
- 未调用外部 AI：ready UI 使用隔离本地快照验证；AI 白名单、缺项补 unknown、定量文案过滤与 stale fingerprint 由服务端纯函数测试覆盖
- 已沉淀 smoke 断言：`e2e/smoke.spec.ts` 校验「微量元素」标题与固定免责声明

### 独立页 UI/IA 调整拟人探查（2026-08-12）

- 人设：`self-today` 为主，补充 `self-history` / `new-empty`
- 环境：本地 API + Vite；默认视口、320×640 与 500×720；外部 AI 禁用，ready 使用隔离本地快照
- 通过：`/nutrition` 仅显示标题、短状态和「查看详情」，DOM 中不再存在微量网格/长列表；链接携带当前日期进入 `/micronutrients`
- 通过：独立页无餐空态、历史日期与补记链接正确；ready 显示 2/3/11 三态芯片与 16 项紧凑网格，状态筛选 2 项、维生素 10 项、矿物质 6 项
- 通过：点开「铁」后 sheet 仅在详情内显示 AI note 与 3 个当日建议；「人体作用 / 常见食物」同权按钮可分别展开并再次收起，全程无模型调用
- 通过：pending 保留旧网格并在 1.5 秒轮询后自动结束；error 保留旧结果、明确过期提示并可重试；未登录访问重定向 `/login`
- 通过：底栏始终只有 今日/社区/营养三项，独立页仍高亮营养；320px 无横向溢出，sheet 修正盒模型后底边位于 tabbar 上方；网格 320px 为 2 列、500px 为 4 列
- 缺陷：无遗留缺陷。探查中发现 sheet 初版与 tabbar 重叠，已修复并复测通过
- 已更新 e2e：营养页断言轻入口且无网格，进入独立页断言路由、标题、免责声明与 ready/empty/error/pending 任一有效状态

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| AI 胡说精确 µg | 只输出三态+短 note；UI 不展示伪精确达标率 |
| 异步旧任务覆盖新餐 | 任务携带 fingerprint；写回前比对 |
| 配额/费用 | 整日一次；历史懒算；运动不触发 |
| 医疗误解 | 固定免责 + 只推食物 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md` ER 节
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status → `done` + README 索引归档

## 14. 回滚方案

- 代码 revert；DB JSON 列可保留 nullable
- 部署上一 dist

## 15. 是否满足最小可运行闭环

是——记餐成功 → 后台估微量 → 营养页入口 → 独立页查看三态、筛选、食物建议与静态科普。

## Grill 决策摘要（2026-08-12）

1. 整日一次汇总，非逐餐落库
2. 餐食变更后刷新；保存立刻成功，后台异步重算；进行中必须有提示
3. 16 项固定清单 + 三态；非精确医学报告
4. 今日自动异步；历史有快照只读，无则开页懒算，餐变再算
5. 不足只推日常食物，不推保健品剂量/品牌
6. 空态 / AI 失败 / stale 可重试整套接受
7. Non-goals：社区、手填、周报趋势、OCR、补剂商城、纤维水、新图表库
