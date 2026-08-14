# Milestone: 逐餐微量估算再汇总（修「越吃越少」）

**Status:** done
**Branch:** `dev/huanghongli`
**Issue:**
**Started:** 2026-08-14

## 1. 任务背景

现有微量元素是整日定性重判：每次加/改/删一道菜，DeepSeek 只根据当天餐名+热量重新输出 16 项 `adequate|low|unknown`，禁止毫克数字。结果不可加、不可复现，用户每多吃一样东西，某项状态反而可能从「可能充足」变成「可能不足」。宏量已经是逐餐落库再 sum，微量应对齐同一范式。

## 2. 目标 (Goal)

每一餐用独立、完整的 AI 调用（先拆配料再出 16 项合计）把数量落在 `meals` 上；当日统计改为纯函数加总，再和按性别+年龄档的静态参考摄入量比较，生成现有 16 宫格三态。网格不展示毫克；点开单项后可见「估算 vs 参考值」进度条；微量页可打开「我的参考摄入量」表。加一道菜后，任一营养素的日合计不得下降。

## 3. 成功标准 (Success criteria)

- [x] `meals` 持久化该餐 16 项估算量（JSON）+ 名称/kcal 指纹；名称或热量变化才重估该餐
- [x] 记餐保存立刻成功；微量缺失时后台补全该餐，不挡保存
- [x] 日快照由加总派生，不再把「整日三态」当作 AI 原文写入
- [x] 只追加 amount≥0 的餐时：所有 id 的 `day_amount` 不减；`adequate` 不变成 `low`（单测锁死）
- [x] `/micronutrients` 网格仍只显示三态；详情 sheet 增加估算进度条，标明非检测
- [x] 微量页标题旁按钮「参考摄入量」打开 sheet：个人 16 项 DRI（mg/µg）+ 档位说明；单项详情进度条旁小「参考」滚到同一张表对应项；营养首页不放此表
- [x] 旧 version:1 整日三态快照可 normalize 兼容，不崩页
- [x] `npm run verify` 通过；api-contract / overview ER / README 功能节同步

## 4. Non-goals

- 社区 / 他人可见
- 手填编辑 16 项；营养表 OCR 微量
- 联网 USDA / 食物成分库
- 保健品商城 / 品牌剂量
- 纤维 / 水分 / 周趋势
- 网格上展示伪精确 mg
- 新图表 npm 依赖
- 塞进 `calories.ts` / BMR·TDEE 公式
- 为食物建议再打一次 AI（沿用现有 FALLBACK_FOODS / 静态科普）

## 5. 已阅读的相关文档（必填）

- [x] 本 milestone 文档
- [x] `docs/milestones/M-2026-08-daily-micronutrients.md`（前序：整日三态；本次要改估算引擎）
- [x] `docs/milestones/M-2026-08-daily-nutrition-macros.md`（逐餐宏量范式）
- [x] `docs/architecture/api-contract.md`（实现时更新 meals 字段与 refresh 语义）
- [x] `docs/architecture/overview.md` ER 节（实现时更新）
- [x] Grill 已确认 shared understanding（2026-08-14）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 16 项目录 / 三态 UI | `src/lib/micronutrients.ts` + `MicronutrientsPage` | 是；网格交互不改 |
| 餐食变更钩子 | `server/src/dayLogMutation.js#afterExerciseOrMealChanged` | 是；语义改为「补缺失餐 + 重算派生 summary」 |
| 日快照调度 / 指纹写回 | `server/src/micronutrients.js` | 是，原地扩展；停用整日 `estimateDailyMicronutrients` 主路径 |
| 记餐时 AI 补全 | `server/src/routes/logs.js#resolveMealMacrosForSave` | 宏量路径保持不动；微量用**独立、更完整**的餐级 DeepSeek 调用，不为省配额合并 |
| 宏量逐餐加总 | `server/src/mealMacros.js` / `src/lib/macroTargets.ts` | 参考范式；微量不要塞进宏量文件 |
| DeepSeek 文本 | `server/src/ai/providers/deepseekText.js` | 是；新餐级 prompt，勿破坏 kcal/宏量 |
| 营养日 hook / pending | `src/hooks/useNutritionDay.ts` | 是 |
| DRI / 参考摄入量 | 无 | 新建静态表：性别 + 粗年龄档（生日），勿让 AI 编 DRI |
| 日期 key / API | `streaks` / `httpData` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 单餐 name、kcal、已有宏量、可选 sex | 一次 round-trip：`components[]`（配料名+大约克数）+ 整餐 16 项 `{ amount, unit, confidence }` |
| 当日已估算餐的**餐级 16 项合计** + 静态 DRI | 派生 `micronutrient_summary` v2：三态 + estimated_pct |
| 详情点击 | 进度条（估算 vs 参考值）+ 现有 note / 建议 / 科普；进度条旁「参考」打开 DRI 表并滚到该项 |
| 微量页「参考摄入量」 | 个人 16 项静态 DRI + 档位（如成年女性）；膳食参考非医嘱 |

### 固定 16 项 id

维生素：`vit_a` `vit_c` `vit_d` `vit_e` `vit_k` `vit_b1` `vit_b2` `vit_b6` `vit_b9` `vit_b12`

矿物质：`calcium` `iron` `zinc` `magnesium` `potassium` `iodine`

单位：µg = vit_a(RAE)、vit_d、vit_k、vit_b9、vit_b12、iodine；其余 mg。

三态：`adequate` | `low` | `unknown`（UI 文案不变）

## 8. Edge cases

- 无餐食：不调 AI；空态 + CTA 记餐
- 单餐 AI 失败：该餐不挡保存；日汇总用已有餐；缺项按 unknown/0；可重试
- 并发：按 dayLogId 串行；写回前比对当前餐集合
- 仅 meal 变更触发餐级估算；纯运动不触发
- 加餐单调性：amount≥0 时 day_amount 不减；adequate 不降为 low
- 旧 v1 快照：页面可渲染；有餐级数据后被派生 v2 替换
- 历史缺失餐：打开该日微量页，或当天再记/改一餐时，只并行补这一天里还缺的餐；不批量重跑全部历史。新餐保存时就估。未打开、未再改的旧日可暂留 v1 整日三态，点开后再换成加总结果
- 配额不是约束：独立、更完整的餐级 prompt；一次 round-trip 先拆配料再出 16 项合计
- 日加总只使用餐级 16 项，不把 `components` 再加一遍
- 免责：非检测、非医疗；网格不展示 mg；DRI 表标明膳食参考、非医嘱
- 无生日：成人+该性别；性别未知：铁用女性较高参考
- 参考摄入量入口：仅微量页；营养首页不放 16 项参考长列表

## 9. 涉及文件 / 模块（预期）

- `server/migrations/0NN_meals_micronutrients.sql` + `db.js#runMigrations`
- `server/src/micronutrients.js`（餐级校验、日加总、调度）
- `server/src/micronutrientTargets.js` + 前端镜像或同文件目录（静态 DRI）
- `server/src/ai/providers/deepseekText.js`（餐级 prompt）
- `server/src/routes/logs.js`（保存时补该餐）
- `src/pages/MicronutrientsPage.tsx`（详情进度条 + 参考摄入量 sheet）
- `src/lib/micronutrientTargets.ts`（与 server 同规则的 DRI 解析，供参考表 UI）
- `src/types/index.ts`、`src/lib/micronutrients.ts`
- `docs/architecture/api-contract.md`、`overview.md`、根 `README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. Schema：meals 微量 JSON（含 components + 16 项合计）+ 指纹
2. 独立餐级 prompt（拆配料）+ JSON 校验 + 静态 DRI（性别+年龄档）+ 日加总与单调性单测
3. 停用整日重判主路径；保存时估该餐；开页并行补当日缺失餐；派生 day summary
4. 详情进度条；标题旁「参考摄入量」sheet；网格三态保持
5. 文档 + verify

**后续（不做）：** USDA 联网、手填、趋势、补剂

## 11. 测试方案

- 纯函数：加餐 day_amount 单调不减；adequate 不降为 low；删除=减去该餐
- 指纹：改名/改 kcal 才重估该餐
- normalize：缺项、非法单位、荒唐超量、v1 兼容
- 拟人：加餐后已 adequate 项不掉成 low；详情有进度条；标题旁能打开参考摄入量表；免责可见
- e2e：smoke 进入微量页可见「参考摄入量」按钮与免责声明

### 拟人探查结论（2026-08-14）

- 人设：`self-today`；本轮 e2e smoke 覆盖营养入口 → `/micronutrients` 标题、参考摄入量按钮、免责声明
- 通过：无餐空态不调 AI；记餐不阻塞；AI 未配置时餐级估算失败转为 error 且可重试（e2e 日志）；网格仍三态；参考摄入量入口在微量页
- 未探：配置了 DeepSeek 的真实加餐单调性（由纯函数单测锁死）；窄屏 sheet 叠层以 e2e 布局套件覆盖主路径
- 已沉淀 e2e：`e2e/smoke.spec.ts` 断言微量页「参考摄入量」按钮

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| AI 胡说精确 µg | 网格仍三态；详情只给估算进度并标明非检测 |
| 每餐独立 API 更慢 | 保存仍立刻 200；后台并行估缺失餐；单餐一次 round-trip（可先拆配料再出 16 项） |
| 旧任务覆盖新餐 | 写回前比对当前餐集合；dayLogId 串行 |
| 医疗误解 | 固定免责；不足只推食物 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md` ER 节
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status → `done` + README 索引归档

## 14. 回滚方案

- 代码 revert；`meals.micronutrients*` 列可保留 nullable
- 部署上一 dist

## 15. 是否满足最小可运行闭环

是——记餐成功 → 该餐微量落库 → 日加总刷新三态网格 → 详情可见估算进度条 → 可打开个人参考摄入量表。

## Grill 决策摘要（已确认 shared understanding）

1. 估算改为逐餐定量 + 日纯函数加总，不再整日定性重判
2. 网格仍只显示三态；数字只出现在详情「估算 vs 参考值」进度条
3. 配额不是约束：为准确度与短等待服务；不靠合并请求省 token
4. 微量用独立、更完整的餐级 DeepSeek prompt，不并进现有宏量估算 JSON
5. 历史缺失餐：打开该日或当天再记/改餐时，只并行补这一天缺的餐；不扫全部历史；未点开的旧日可暂留 v1 快照
6. 一次 round-trip 先拆配料再出整餐 16 项；配料可存库核对，日统计只加餐级合计
7. DRI 静态表：性别 + 粗年龄档（儿童/成人/老年），年龄从现有生日算；无生日按成人+性别；性别未知时铁用女性较高值
8. 微量页标题旁「参考摄入量」打开 16 项个人 DRI sheet；单项详情进度条旁小「参考」滚到同一张表对应项；营养首页不放此表
