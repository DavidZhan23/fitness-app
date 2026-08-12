# Milestone: 每日营养素（宏量饼图 + AI 补全 + 建议对照）

**Status:** done
**Branch:** `dev/huanghongli`
**Issue:**
**Started:** 2026-08-11

## 1. 任务背景

饮食目前只记名称与 kcal，用户无法看到蛋白 / 脂肪 / 碳水 / 添加糖的构成。需要在录入侧选填、缺省时 AI 补全，并在底栏新页用 P/F/C 饼图 + 独立添加糖卡 + 明细展示当日摄入，同时给出基于资料的建议对照。

## 2. 目标 (Goal)

本人可在营养页查看当日（可切历史日）宏量构成：上方按皮肤 token 配色的 P/F/C 饼图，添加糖按 50g 上限 / 25g 推荐参考单独展示，下方为餐食明细；录入可选填四项克数；仅名称+kcal 保存时 AI 补全并落库；页面展示规则算出的建议克数与今日实际对照，可选 AI 短文案微调。

## 3. 成功标准 (Success criteria)

- [x] `/log/meal` 与今日餐食编辑可折叠选填 protein/fat/carbs/sugar（克）；保存写入 DB
- [x] 四项皆空保存时触发 AI 宏量估算并落库；有任一手填则只补空字段；失败不挡保存，列表可标「待补全」
- [x] AI/手填 P/F/C 按 `P×4+C×4+F×9 ≈ meal.kcal` 缩放校准；添加糖独立保留，不随碳水缩放或重复计能
- [x] 底栏第三项「营养」→ `/nutrition`：饼图（总量 g、各物质 g 与占比）+ 明细 list + 建议对照（偏多/接近/偏少）
- [x] 12 套皮肤均有独立 `--macro-*` token，饼图/图例不写死跨皮肤同色
- [x] 日期切换与今日页一致（浏览器本地 date key）；不展示他人
- [x] `npm run verify` 通过；api-contract / overview ER / README 功能节已同步

## 4. Non-goals

- 餐食模板带宏量
- 社区 / 他人营养
- 周报接入真实宏量（现有 null 占位可不动）
- 拍照营养表识别宏量（仍只解析名称/克数/千焦；宏量走保存时 AI）
- 纤维 / 水分 / 微量元素
- 新图表 npm 依赖（用 SVG 或 `conic-gradient` 自绘）

## 5. 已阅读的相关文档（必填）

- [x] 本 milestone 文档
- [x] `docs/architecture/api-contract.md`（实现时更新 meals / AI estimate）
- [x] `docs/architecture/overview.md` ER 节（meals 新列）
- [x] 其它：`docs/decisions/0007-theme-tokens.md`、`src/styles/themes/README.md`、grill 结论 2026-08-11

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 日日志拉取 | `src/lib/dayLogService.ts` / `httpData` day-logs | 是 |
| 餐食写路径 | `submitLog` / `POST|PATCH /meals` + `afterExerciseOrMealChanged` | 是（扩展 body） |
| AI 估 kcal | `server/src/ai/providers/deepseekText.js`、`qwenVision.js`、`POST /ai/estimate-kcal` | 是（扩展 JSON 宏量） |
| 日期 key | `src/lib/streaks.ts#formatDateKey` | 是（营养页「今日」） |
| 底栏 | `src/components/Layout.tsx#navItems` | 是（加第三项） |
| 皮肤 token | `src/styles/themes/*.css` + `StyleContext` | 是（新增 `--macro-*`） |
| 社区缓存失效 | `dayLogService` → `invalidateCommunityListCache` | 是（勿绕过） |
| 宏量建议公式 | （无现成） | 新建 `src/lib/macroTargets.ts` + 可选 server 镜像；**勿**塞进 `calories.ts` 热量公式 |
| 宏量解析 / 校准 / 日汇总 | （无现成） | 服务端新增 `mealMacros.js` 作为写入校准真源；前端汇总与目标同属 `macroTargets.ts`，不复制 BMR/TDEE |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 餐食 name + kcal；可选 protein_g/fat_g/carbs_g/sugar_g（添加糖） | 落库 meals；`sugar_scope=added`；`macros_source`: `user` \| `ai` \| null |
| AI estimate（扩展） | items 可带宏量克数；保存路径归一化+kcal 校准 |
| Profile（性别/体重/活动/目标缺口相关字段） | 规则建议：今日 P/F/C 目标克数 + 独立添加糖参考值 |
| 当日 meals 汇总 | P/F/C 饼图三扇区 + 独立添加糖卡；明细；实际 vs 建议状态 |
| 用户点「重新评估」（可选） | 短中文建议文案 + 可选比例微调（非每次打开调模型） |

## 8. Edge cases

- 无餐食 / 全日无宏量：空态文案 + CTA 去记饮食；饼图不画或示意空环
- AI 失败：餐食仍保存；宏量为 null；明细「待补全」；饼图仅汇总已有宏量的餐
- 批量 AI 多条：按 meal 行各自宏量 sum，勿按 batch 展示组只加总 kcal
- 添加糖与碳水在 UI 中独立跟踪；不将包装上无法区分来源的「总糖」自动当成添加糖
- 跨日：前端本地 date key；与后端 Asia/Shanghai 边界差异沿用现网约定
- 仅部分宏量手填：只 AI 补空字段；任一手填则整行 `macros_source=user`
- 建议对照阈值（推荐）：相对目标 |diff|/target ≤ 10% → 接近；否则偏多/偏少

## 9. 涉及文件 / 模块（预期）

- `server/migrations/032_meals_macros.sql`、`036_meals_added_sugar_scope.sql` + `server/src/db.js#runMigrations`
- `server/src/routes/logs.js`（POST/PATCH meals）
- `server/src/ai/providers/deepseekText.js`、`qwenVision.js`（及 normalize）
- `src/types/index.ts`（Meal）
- `src/lib/api/index.ts`、`dayLogService.ts`、`submitLog` 路径
- `src/hooks/useLogForm.ts`、`src/features/log/SecondaryManualLogSection.tsx`、`AiLogSection.tsx`
- `src/components/LogList.tsx` / `TodayMealGroupRow.tsx`
- `src/pages/NutritionPage.tsx`（新）+ 饼图组件
- `src/lib/macroTargets.ts`（新，建议克数）
- `src/components/Layout.tsx`、`App.tsx`
- `src/styles/themes/*.css`（12 套 `--macro-protein/fat/carbs/sugar`）
- `docs/architecture/api-contract.md`、`overview.md`、根 `README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. Schema：meals 四列克数 + macros_source；API 贯通
2. 录入/编辑 UI 选填 + 添加糖口径提示
3. AI estimate 扩展 + 保存时补全/校准
4. `macroTargets` 规则建议 + 营养页对照 UI
5. 营养页饼图（自绘）+ 明细 + 底栏路由
6. 12 皮肤 macro token
7. 单测（校准/建议/汇总）+ verify + 文档

**后续（不做本轮）：**

- 模板宏量、周报宏量、营养表 OCR 宏量、纤维水
- 每次打开营养页都调大模型（仅「重新评估」）

## 11. 测试方案

- 纯函数：P/F/C kcal 校准、添加糖独立保留、日汇总、macroTargets
- Smoke：`npm run verify`
- 手动：只填名称+kcal → 保存后营养页有数；手填蛋白 → AI 不覆盖；切皮肤饼图色变；切历史日
- **拟人探查**：营养页空态 / 有数据 / 建议条；底栏三 tab
- **拟沉淀 e2e**：登录 → 记一餐（可 mock AI）→ 打开营养页见汇总（视 AI 稳定性决定是否 e2e）

### 拟人探查结论（2026-08-11）

- 人设：`new-empty` → `self-today`，本地 API `:3001` / Web `:5173`，移动视口 390×844。
- 通过（初版）：空态 CTA；三项底栏；手动四项保存；P/F/C kcal 缩放；今日行内宏量编辑；逐餐不按 batch 合并；AI 未配置时仍保存并显示「待补全」；部分手填显示 `user · 部分待补全`；历史日期切换；默认打开不调 AI、主动「重新评估」返回短建议；深海→碧空樱缀后宏量 token 实际变色；移动端饼图/图例/建议条无横向溢出。初版“糖随碳水夹紧”已被 2026-08-12 添加糖口径替代。
- 修复：从长页面底部进入营养页会继承滚动位置；现复用主滚动容器回顶函数，复测通过。
- Follow-up 通过（2026-08-11）：旧餐食后台补全期间先显示状态，落库后同页自动刷新；重新打开不重复补全。三档数值与 320px 窄屏布局通过；当时少油少糖为脂肪 / 糖各 30g，添加糖目标后续由 2026-08-12 follow-up 调整为 15g。
- 未发现本功能 P0/P1；启动验收前的残留无 profile 测试会话产生旧控制台错误，退出并新建完整测试人设后未复现。
- 建议 e2e：`e2e/nutrition.spec.ts`——注册并完成资料 → 手动保存带宏量餐食 → 断言 `/nutrition` 饼图、每餐克数、source、建议状态；另 mock/关闭 AI 保存纯 kcal → 断言保存成功且「待补全」。

### 添加糖 follow-up 拟人探查结论（2026-08-12）

- 人设：`new-empty` → `self-today`，兼顾 `self-history`；本地 API `:3001` / Web `:5173`，默认视口与 320×720。
- 通过：空态与 CTA；录入文案明确排除完整水果 / 牛奶天然糖；手填添加糖 18g、碳水 12g 时添加糖不随 P/F/C kcal 校准缩放或夹紧；独立卡片不出现「占碳水」，三档分别为 50 / 25 / 15g，少油档脂肪 30g；跨日切换；未登录访问回登录页；320px `scrollWidth=clientWidth=320`。
- 历史升级：旧 AI 餐食「纯牛奶与苹果」「完整苹果」均只触发一次新口径后台估算，添加糖落为 0g、`sugar_scope=added`；重载不再调用。升级期间旧总糖不进入合计，明细显示「添加糖 — · 部分待补全」。
- 探查中修复：最初升级期间会短暂把旧总糖计入添加糖卡；现汇总和明细仅采纳 `sugar_scope=added`。
- 错误态：添加糖输入 10001g 时拦截并显示「营养素克数须为 0–10000 的数字」。未发现本 follow-up 的 P0/P1/P2。
- 已沉淀：`e2e/smoke.spec.ts` 断言独立添加糖卡、少油档 15g 与脂肪 30g；纯函数覆盖旧总糖升级期间不进入添加糖合计。

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| AI 宏量乱、与 kcal 不符 | 能量约束缩放；标 source；允许手改 |
| 底栏三 tab 拥挤 | 短标签「营养」；icon 简洁 |
| 皮肤漏 token | themes README 清单 + 每套必填四色 |
| 保存变慢（同步 AI） | 可先同步估（体验简单）；超时则 null + 待补全；避免阻塞 > 数秒则前端 loading |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md` ER 节
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status → `done` + README 索引归档

## 14. 回滚方案

- 代码：revert PR
- DB：新列可保留（nullable）；无需强制 down
- 部署：上一 dist symlink

## 15. 是否满足最小可运行闭环

是——记餐（选填或 AI 补全）→ 营养页看饼图/明细/建议对照。

## Grill 决策摘要（2026-08-11）

1. 饼图三扇区 P/F/C；添加糖为独立卡片，不占扇区、不显示占碳水比
2. 建议宏量：资料规则为主；AI 短文案/微调按需；对照偏多/接近/偏少
3. 保存时 AI 补全并落库；营养页只读汇总
4. 底栏「营养」`/nutrition`；本地今日 + 日期切换；仅本人
5. MVP 不含模板/社区/周报宏量/营养表宏量/纤维水；无新图表库
6. 部分字段只补空；P/F/C 做 kcal 能量校准；添加糖不随碳水缩放
7. 凡可编辑餐食处均可改宏量；营养页明细可编辑或跳转编辑

## Follow-up（2026-08-11）

- [x] 营养页对功能上线前已记录、且宏量从未尝试补全的餐食，发起一次后台 AI 补全并自动刷新；失败落下已尝试标记，不因重新打开页面反复调用。
- [x] 今日建议提供「较高油糖 / 正常油糖 / 少油少糖」三档；当时少油少糖的脂肪和糖均固定为 30g，碳水按当日目标热量重新平衡。（添加糖目标已由 2026-08-12 follow-up 调整为 15g；脂肪仍为 30g。）
- [x] 同步 API 契约并通过 `npm run verify`。

## Follow-up（2026-08-12）

- [x] `sugar_g` 口径改为添加糖 / 游离糖：包括制作或加工时加入的蔗糖、葡萄糖、果糖、糖浆、蜂蜜等；不把完整水果、牛奶中天然存在的糖记入。
- [x] 新增 `sugar_scope=added` 版本标记；旧 AI / 未标记餐食打开营养页时仅重新估算一次添加糖，不将旧「总糖」直接当成添加糖。
- [x] 添加糖从 P/F/C 饼图、图例和建议列表中独立成卡；不再显示「占碳水」，不随碳水缩放或夹紧，也不重复计入宏量热量。
- [x] 添加糖参考档为 50g（宽松上限）/ 25g（推荐）/ 15g（自选严格，非官方独立标准）；少油档脂肪仍为 30g。
- [x] 同步 AI prompt、录入文案、API 契约与 README，完成拟人验收和 `npm run verify`。

## 资料依据（2026-08-12）

- [国家卫健委 2024 发布会](https://www.nhc.gov.cn/xcs/c100122/202406/4712324a0508410b953a3d3eb717ab43.shtml)：健康成年人每天添加糖摄入量不超过 50g，最好控制在 25g 以下；[健康中国行动相关答复](https://www.nhc.gov.cn/wjw/jiany/202301/b3ff2797cb25418ea62be87cc894247b.shtml)进一步倡导人均每日添加糖不高于 25g。
- [WHO 游离糖指南说明](https://www.who.int/news-room/detail/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children)：游离糖应低于总能量 10%，进一步降至 5%（约 25g）可带来额外健康益处；游离糖包含加入食品的单糖 / 双糖，以及蜂蜜、糖浆、果汁和浓缩果汁中的糖。
- [国家卫健委 `GB 28050-2025` 问答](https://www.nhc.gov.cn/sps/c100087/202509/470fa4ff5de14dd38619223cce9da4e7.shtml)：标签强制标示的“糖”是葡萄糖、果糖、蔗糖、麦芽糖和乳糖总和，不能自动等同添加糖。因此 UI 提示优先采用明确的“添加糖”，只写“糖”时结合配料表判断。
- 15g 是产品提供的自选严格档，不宣称为官方独立限值；50g 仅作为宽松上限，不鼓励吃满。
