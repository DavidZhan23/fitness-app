import { resolveProfileBmr, resolveProfileTdee, toKcal } from './calories.js'
import { evaluateCommunityDayStatus } from './communityBadges.js'
import { assertCanViewCommunity, loadProfile } from './community.js'
import { formatDateKeyInTz } from './dateKey.js'
import { calculateMacroTargetsFromMetabolism } from './macroTargets.js'
import { calculateDeficitByMode } from './metabolism.js'
import { requestDeepSeekTextJson } from './ai/providers/deepseekText.js'

function addDateDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function isoWeekInfo(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const year = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const weekNumber = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  )
  return { year, weekNumber }
}

export function getPreviousWeekRange(now = new Date()) {
  const today = formatDateKeyInTz(now)
  const day = new Date(`${today}T00:00:00Z`).getUTCDay() || 7
  const weekStartDate = addDateDays(today, -(day - 1) - 7)
  const weekEndDate = addDateDays(weekStartDate, 6)
  return { weekStartDate, weekEndDate, ...isoWeekInfo(weekStartDate) }
}

function dateKeysBetween(start, count = 7) {
  return Array.from({ length: count }, (_, index) => addDateDays(start, index))
}

function statusForDeficit(deficit) {
  if (deficit == null || !Number.isFinite(deficit)) return 'unknown'
  if (deficit < 0) return 'surplus'
  if (deficit < 300) return 'mild'
  if (deficit <= 900) return 'good'
  return 'aggressive'
}

export function levelForAverageDeficit(average, hasData = true) {
  if (!hasData || average == null || !Number.isFinite(average)) return 'unknown'
  if (average < 150) return 'too_low'
  if (average < 300) return 'mild'
  if (average <= 800) return 'good'
  return 'aggressive'
}

function rankNames(items) {
  const grouped = new Map()
  for (const item of items) {
    const name = String(item.name || '').trim() || '未命名记录'
    const current = grouped.get(name) || { name, count: 0, calories: 0 }
    current.count += 1
    current.calories += Math.round(toKcal(item.kcal))
    grouped.set(name, current)
  }
  return [...grouped.values()].sort(
    (a, b) => b.count - a.count || b.calories - a.calories || a.name.localeCompare(b.name, 'zh-CN'),
  )
}

function highestCalorieItem(items) {
  return [...items].sort((a, b) => toKcal(b.kcal) - toKcal(a.kcal))[0]
}

function achievementsForDay({ deficit, exerciseKcal, mealKcal, dailyBmr }) {
  const result = evaluateCommunityDayStatus({
    deficit,
    exerciseKcal,
    mealKcal,
    dailyBmr,
  })
  const achievements = []
  if (result.badge === 'champion') {
    achievements.push({
      type: 'exercise_king',
      title: '运动大王',
      description: '训练、补给和热量节奏都在线',
    })
  } else if (result.badge === 'elite') {
    achievements.push({
      type: 'fat_loss_pioneer',
      title: '减脂先锋',
      description: '当天的热量缺口达到先锋标准',
    })
  }
  if (result.foodKing) {
    achievements.push({
      type: 'food_king',
      title: '美食大王',
      description: '认真补给，也认真生活',
    })
  }
  return achievements
}

function chooseOverallTitle(summary, dietStats, calorieStats) {
  if (summary.dataStatus === 'insufficient') return '小狸陪伴周'
  if (summary.activeDays >= 5 && summary.dietLoggedDays >= 5) return '小狸认证自律周'
  if (summary.achievementCount >= 3) return '减脂先锋周'
  if (summary.activeDays >= 4) return '运动爆发周'
  if (dietStats.loggedDays >= 5) return '饮食记录达人'
  if (calorieStats.deficitLevel === 'good') return '稳定行动派'
  return '温和进步周'
}

function delta(current, previous) {
  const a = Number(current)
  const b = Number(previous)
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((a - b) * 10) / 10 : null
}

function buildWowDelta(report, prevReport) {
  if (!prevReport?.summary) {
    return {
      activeDays: null,
      dietLoggedDays: null,
      totalExerciseCalories: null,
      totalCaloriesIn: null,
      totalCalorieDeficit: null,
      achievementCount: null,
    }
  }
  return {
    activeDays: delta(report.summary.activeDays, prevReport.summary.activeDays),
    dietLoggedDays: delta(report.summary.dietLoggedDays, prevReport.summary.dietLoggedDays),
    totalExerciseCalories: delta(
      report.summary.totalExerciseCalories,
      prevReport.summary.totalExerciseCalories,
    ),
    totalCaloriesIn: delta(report.summary.totalCaloriesIn, prevReport.summary.totalCaloriesIn),
    totalCalorieDeficit:
      report.summary.totalCalorieDeficit == null ||
      prevReport.summary.totalCalorieDeficit == null
        ? null
        : delta(
            report.summary.totalCalorieDeficit,
            prevReport.summary.totalCalorieDeficit,
          ),
    achievementCount: delta(
      report.summary.achievementCount,
      prevReport.summary.achievementCount,
    ),
  }
}

export function buildWeeklyInsights(report, prevReport = null) {
  const activeDays = Number(report.summary?.activeDays) || 0
  const dietLoggedDays = Number(report.summary?.dietLoggedDays) || 0
  const trackedDeficitDays = Number(report.calorieStats?.trackedDeficitDays) || 0
  const macroLoggedDays = Number(report.dietStats?.macroLoggedDays) || 0
  const dailyDiet = Array.isArray(report.dietStats?.dailyDiet)
    ? report.dietStats.dailyDiet
    : []
  const weekendDietMissing = dailyDiet.slice(5, 7).some((day) => !day?.foodCount)
  const totalWorkouts = Number(report.exerciseStats?.totalWorkouts) || 0
  const favoriteCount = Number(report.exerciseStats?.favoriteExerciseCount) || 0
  const concentration = totalWorkouts > 0 ? favoriteCount / totalWorkouts : 0
  const averageDeficit = report.calorieStats?.averageDailyDeficit ?? null
  const macroTargets = report.dietStats?.macroTargets ?? null
  const averageProtein = report.dietStats?.averageProtein ?? null
  const proteinStatus =
    macroLoggedDays < 4 || averageProtein == null || !macroTargets?.protein_g
      ? 'insufficient'
      : averageProtein < macroTargets.protein_g * 0.8
        ? 'low'
        : 'steady'

  const evidence = [
    {
      id: 'coverage-diet',
      dimension: 'coverage',
      text: `本周有 ${dietLoggedDays}/7 天记录了饮食`,
      value: dietLoggedDays,
    },
    {
      id: 'exercise-frequency',
      dimension: 'exercise',
      text: `本周运动 ${activeDays} 天，共 ${totalWorkouts} 次${
        report.exerciseStats?.favoriteExerciseName
          ? `，「${report.exerciseStats.favoriteExerciseName}」出现 ${favoriteCount} 次`
          : ''
      }`,
      value: activeDays,
    },
    {
      id: 'calorie-deficit',
      dimension: 'calorie',
      text:
        averageDeficit == null
          ? `本周 ${trackedDeficitDays}/7 天可计算热量缺口`
          : `本周 ${trackedDeficitDays}/7 天可计算缺口，有效日均 ${Math.round(averageDeficit)} kcal`,
      value: averageDeficit,
    },
    {
      id: 'macro-coverage',
      dimension: 'diet',
      text:
        macroLoggedDays >= 4
          ? `本周宏量覆盖 ${macroLoggedDays}/7 天，覆盖日日均蛋白质 ${Math.round(averageProtein ?? 0)} 克`
          : `本周宏量覆盖 ${macroLoggedDays}/7 天，暂不判断蛋白质高低`,
      value: macroLoggedDays,
    },
  ]

  let persona = 'steady'
  if (report.calorieStats?.deficitLevel === 'aggressive') persona = 'recovery'
  else if (dietLoggedDays < 5 || weekendDietMissing) persona = 'coverage'
  else if (activeDays < 3 || concentration >= 0.75) persona = 'movement'
  else if (proteinStatus === 'low') persona = 'protein'

  let headline
  if (report.calorieStats?.deficitLevel === 'aggressive' && averageDeficit != null) {
    headline = `有效日均缺口 ${Math.round(averageDeficit)} kcal，下周先把恢复放前面`
  } else if (activeDays > 0) {
    headline = report.exerciseStats?.favoriteExerciseName
      ? `运动 ${activeDays} 天，「${report.exerciseStats.favoriteExerciseName}」是本周主角`
      : `运动 ${activeDays} 天，行动已经开始累积`
  } else if (dietLoggedDays > 0) {
    headline = `饮食记录覆盖 ${dietLoggedDays}/7 天，本周节奏有迹可循`
  } else {
    headline = '本周记录还很少，先点亮第 1 个事实日'
  }

  return {
    coverage: {
      dietLoggedDays,
      activeDays,
      trackedDeficitDays,
      macroLoggedDays,
      weekendDietMissing,
    },
    calorie: {
      level: report.calorieStats?.deficitLevel ?? 'unknown',
      averageDailyDeficit: averageDeficit,
      trackedDays: trackedDeficitDays,
    },
    exercise: {
      activeDays,
      totalWorkouts,
      favoriteName: report.exerciseStats?.favoriteExerciseName ?? null,
      favoriteCount,
      concentration: Math.round(concentration * 100) / 100,
    },
    diet: {
      loggedDays: dietLoggedDays,
      macroStatus: macroLoggedDays >= 4 ? 'sufficient' : 'insufficient',
      proteinStatus,
      averageProtein,
      macroTargets,
    },
    persona,
    headline,
    evidence,
    wowDelta: buildWowDelta(report, prevReport),
  }
}

export function generateWeeklyFoxComment(report) {
  const evidence = report.insights?.evidence ?? []
  const exercise = evidence.find((item) => item.id === 'exercise-frequency')?.text
  const diet = evidence.find((item) => item.id === 'coverage-diet')?.text
  const calorie = evidence.find((item) => item.id === 'calorie-deficit')?.text
  const persona = report.insights?.persona
  if (persona === 'recovery') {
    return `${calorie}，这说明你的行动很坚决，也值得为恢复留出位置。${exercise}，下周不用再往上加码；先把规律进食和轻松日安排好，让训练能稳稳地接上，比短暂冲得更猛更重要。`
  }
  if (persona === 'coverage') {
    return `${exercise}，${diet}。你已经留下了一部分很有用的线索，只是空白日还会让热量节奏变得难判断。下周先补齐最容易漏的一天，不追求每餐完美，只要让一周的轮廓更连贯就是真进步。`
  }
  if (persona === 'movement') {
    return `${exercise}，${diet}。这周的基础并不空，下周的关键不是换更花哨的计划，而是让运动更均匀地出现。把最顺手的项目保留下来，再加一次低门槛活动，会比一天集中完成更容易坚持。`
  }
  if (persona === 'protein') {
    const macro = evidence.find((item) => item.id === 'macro-coverage')?.text
    return `${exercise}，${macro}。记录已经足够看到饮食结构，这比凭感觉猜要可靠得多。下周不需要大改菜单，先给每个已记录日补上一份熟悉的蛋白质来源，再用数字看看是否更接近目标。`
  }
  return `${exercise}，${diet}。这周没有需要被放大的短板，更值得肯定的是，运动和记录已经能在同一周里稳定出现。下周照着现在的节奏再做一次，保留可量化的底线，就能清楚看到这份稳定是怎样累积起来的。`
}

function suggestion({ type, title, why, action, successMetric, evidenceIds }) {
  return {
    type,
    title,
    why,
    content: `${why}。${action}。做到标准：${successMetric}。`,
    successMetric,
    evidenceIds,
  }
}

export function generateNextWeekSuggestions(report) {
  const insights = report.insights ?? buildWeeklyInsights(report)
  const suggestions = []
  const usedTypes = new Set()
  const add = (item) => {
    if (suggestions.length >= 3 || usedTypes.has(item.type)) return
    suggestions.push(item)
    usedTypes.add(item.type)
  }

  if (insights.calorie.level === 'aggressive') {
    add(suggestion({
      type: 'recovery',
      title: '先把缺口收回稳健区',
      why: `本周有效日均缺口是 ${Math.round(insights.calorie.averageDailyDeficit ?? 0)} kcal，继续加练会挤压恢复`,
      action: '下周保持规律进食，至少安排 2 个不额外加练的轻松日',
      successMetric: '周报的有效日均缺口不再处于 aggressive',
      evidenceIds: ['calorie-deficit'],
    }))
  }

  if (insights.coverage.dietLoggedDays < 5 || insights.coverage.weekendDietMissing) {
    const target = insights.coverage.dietLoggedDays < 5 ? 5 : 6
    add(suggestion({
      type: 'diet',
      title: insights.coverage.weekendDietMissing ? '补上一个周末饮食日' : '把饮食轮廓补到 5 天',
      why: `本周饮食只覆盖 ${insights.coverage.dietLoggedDays}/7 天，空白日会让缺口变成 unknown`,
      action: insights.coverage.weekendDietMissing
        ? '选周六或周日其中 1 天，在每餐完成后当场记下'
        : '先选定 5 天，每餐完成后当场记下，不要求菜单完美',
      successMetric: `下周饮食记录至少覆盖 ${target}/7 天`,
      evidenceIds: ['coverage-diet'],
    }))
  }

  if (
    insights.calorie.level !== 'aggressive' &&
    (insights.exercise.activeDays < 3 ||
      (insights.exercise.totalWorkouts >= 3 && insights.exercise.concentration >= 0.75))
  ) {
    const favorite = insights.exercise.favoriteName
    add(suggestion({
      type: 'exercise',
      title: insights.exercise.activeDays < 3 ? '让运动稳定出现 3 天' : '给单一项目加一次补充',
      why: insights.exercise.activeDays < 3
        ? `本周运动 ${insights.exercise.activeDays} 天，频率还没有形成稳定节奏`
        : `「${favorite}」占了本周大部分运动记录，项目较集中`,
      action: insights.exercise.activeDays < 3
        ? `保留${favorite ? `「${favorite}」` : '最顺手的活动'}，拆成 3 个不连续的完成日`
        : '保留主项目，另加 1 天散步、拉伸或其他低门槛活动',
      successMetric: '下周至少 3 个运动日，且不在同一天补齐',
      evidenceIds: ['exercise-frequency'],
    }))
  }

  if (insights.diet.proteinStatus === 'low' && !usedTypes.has('diet')) {
    const target = Math.round(insights.diet.macroTargets?.protein_g ?? 0)
    add(suggestion({
      type: 'diet',
      title: '让蛋白质靠近日均目标',
      why: `宏量已覆盖 ${insights.coverage.macroLoggedDays}/7 天，覆盖日日均蛋白质 ${Math.round(insights.diet.averageProtein ?? 0)} 克，低于规则目标`,
      action: '每个已记录日选 1 餐，增加一份熟悉且可记录的蛋白质来源',
      successMetric: `下周宏量覆盖日的日均蛋白质达到 ${Math.round(target * 0.8)} 克或以上`,
      evidenceIds: ['macro-coverage'],
    }))
  }

  if (insights.exercise.activeDays >= 3 && !usedTypes.has('exercise')) {
    add(suggestion({
      type: 'exercise',
      title: '把本周的运动底线保留下来',
      why: `本周已有 ${insights.exercise.activeDays} 个运动日，稳定复制比临时加码更有价值`,
      action: `优先排入${insights.exercise.favoriteName ? `「${insights.exercise.favoriteName}」` : '最顺手的运动'}，并预留同样数量的运动日`,
      successMetric: `下周运动日不低于 ${insights.exercise.activeDays} 天`,
      evidenceIds: ['exercise-frequency'],
    }))
  }

  if (insights.coverage.dietLoggedDays >= 5 && !usedTypes.has('diet')) {
    add(suggestion({
      type: 'diet',
      title: '保持现有饮食覆盖',
      why: `本周饮食已覆盖 ${insights.coverage.dietLoggedDays}/7 天，数据连续性已经足够支撑周报判断`,
      action: '沿用现在最顺手的记录方式，不额外增加复杂步骤',
      successMetric: `下周饮食记录仍覆盖至少 ${insights.coverage.dietLoggedDays}/7 天`,
      evidenceIds: ['coverage-diet'],
    }))
  }

  if (suggestions.length < 3) {
    add(suggestion({
      type: 'habit',
      title: '周末用 2 分钟验收本周',
      why: '可量化的周目标需要一个固定的收尾时刻，才不会只凭感觉判断',
      action: '周日打开 7 天记录，只核对运动日和饮食覆盖天数',
      successMetric: '周日能说出本周运动天数和饮食覆盖天数',
      evidenceIds: ['exercise-frequency', 'coverage-diet'],
    }))
  }

  return suggestions.slice(0, 3)
}

const WEEKLY_NARRATIVE_BANNED = /AI|时长字段|绝食|断食|极端节食|暴食|羞耻|废物|胖子|诊断|治疗|带伤训练/i

function narrativeStrings(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(narrativeStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(narrativeStrings)
  return []
}

function numericTokens(value) {
  return new Set(
    narrativeStrings(value).flatMap(
      (text) => text.match(/\d+(?:\.\d+)?|[零一二两三四五六七八九十百千万]+/g) ?? [],
    ),
  )
}

export function validateWeeklyNarrative(raw, report) {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      throw new Error('AI 周报文案不是严格 JSON')
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI 周报文案结构无效')
  }
  const foxComment = typeof value.foxComment === 'string' ? value.foxComment.trim() : ''
  const commentLength = Array.from(foxComment).length
  if (commentLength < 80 || commentLength > 220) {
    throw new Error('AI 周报点评长度无效')
  }
  const evidenceIds = Array.isArray(value.foxEvidenceIds)
    ? value.foxEvidenceIds.filter((id) => typeof id === 'string')
    : []
  const evidenceById = new Map((report.insights?.evidence ?? []).map((item) => [item.id, item]))
  if (evidenceIds.length === 0 || evidenceIds.some((id) => !evidenceById.has(id))) {
    throw new Error('AI 周报点评未引用有效 evidence')
  }
  const referencedTokens = numericTokens(
    evidenceIds.map((id) => evidenceById.get(id)?.text ?? ''),
  )
  if (![...referencedTokens].some((token) => foxComment.includes(token))) {
    throw new Error('AI 周报点评未点到 evidence 中的事实')
  }
  if (!Array.isArray(value.suggestions) || value.suggestions.length !== report.nextWeekSuggestions.length) {
    throw new Error('AI 周报建议数量无效')
  }
  const polishedSuggestions = value.suggestions.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('AI 周报建议结构无效')
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const why = typeof item.why === 'string' ? item.why.trim() : ''
    const content = typeof item.content === 'string' ? item.content.trim() : ''
    if (!title || !why || !content || Array.from(title).length > 36 || Array.from(content).length > 220) {
      throw new Error('AI 周报建议文案无效')
    }
    const ruleSuggestion = report.nextWeekSuggestions[index]
    const completeContent = `${why}。${content}。${
      ruleSuggestion.successMetric
        ? `做到标准：${ruleSuggestion.successMetric}。`
        : ''
    }`
    return {
      ...ruleSuggestion,
      title,
      why,
      content: completeContent,
    }
  })
  const polishedText = [foxComment, ...polishedSuggestions.flatMap((item) => [item.title, item.why, item.content])]
  if (polishedText.some((text) => WEEKLY_NARRATIVE_BANNED.test(text))) {
    throw new Error('AI 周报文案包含禁止内容')
  }
  const allowedNumbers = numericTokens({
    evidence: report.insights?.evidence,
    suggestions: report.nextWeekSuggestions,
  })
  for (const token of numericTokens(polishedText)) {
    if (!allowedNumbers.has(token)) throw new Error(`AI 周报文案编造数字 ${token}`)
  }
  const allowedEntities = new Set([
    ...(report.exerciseStats?.exerciseTypeDistribution ?? []).map((item) => item.name),
    ...(report.dietStats?.foodRanking ?? []).map((item) => item.name),
  ])
  for (const text of polishedText) {
    for (const entity of text.matchAll(/「([^\」]+)」/g)) {
      if (!allowedEntities.has(entity[1])) throw new Error(`AI 周报文案编造项目 ${entity[1]}`)
    }
  }
  return { foxComment, nextWeekSuggestions: polishedSuggestions }
}

function buildWeeklyNarrativePrompt(report) {
  return JSON.stringify({
    headline: report.insights.headline,
    persona: report.insights.persona,
    evidence: report.insights.evidence,
    allowedExerciseNames: report.exerciseStats.exerciseTypeDistribution.map((item) => item.name),
    allowedFoodNames: report.dietStats.foodRanking.map((item) => item.name),
    ruleFoxComment: report.foxComment,
    ruleSuggestions: report.nextWeekSuggestions,
  })
}

export async function polishWeeklyNarrative(report, options = {}) {
  if (options.skipAi) return report
  const provider = options.provider ?? requestDeepSeekTextJson
  try {
    const raw = await provider({
      timeoutMs: 12_000,
      maxTokens: 1200,
      temperature: 0.45,
      systemPrompt:
        '你只负责润色小满周报文案，规则引擎已决定事实、人设、选题、数字和验收标准。不得修改或增加数字、食物、运动、类型、successMetric 或 evidenceIds；若提到具体食物或运动项目，必须从 allowed 列表选择并用「」包裹。语气温柔、具体、不说教，比今日气泡更稳，不要每句自称。禁止医疗建议、极端节食、过度运动、羞辱、编造，禁止提 AI 或工程字段。只输出严格 JSON：{"foxComment":"80-220字","foxEvidenceIds":["evidence id"],"suggestions":[{"title":"","why":"","content":""}]}。',
      userPrompt: buildWeeklyNarrativePrompt(report),
    })
    const polished = validateWeeklyNarrative(raw, report)
    return {
      ...report,
      ...polished,
      narrativeSource: 'ai',
    }
  } catch (err) {
    console.warn('[weekly-report] narrative fallback', err?.message || err)
    return { ...report, narrativeSource: 'rules' }
  }
}

function macroValue(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function completeMealMacros(meals) {
  return meals.length > 0 && meals.every((meal) =>
    ['protein_g', 'fat_g', 'carbs_g'].every((field) => macroValue(meal[field]) != null),
  )
}

function sumMealMacro(meals, field) {
  return Math.round(
    meals.reduce((sum, meal) => sum + (macroValue(meal[field]) ?? 0), 0) * 10,
  ) / 10
}

export function buildWeeklyReportSnapshot({
  userId,
  weekStartDate,
  weekEndDate,
  year,
  weekNumber,
  profile,
  logs = [],
  exercises = [],
  meals = [],
  prevReport = null,
  generatedAt = new Date().toISOString(),
}) {
  const dates = dateKeysBetween(weekStartDate)
  const logsByDate = new Map(logs.map((log) => [String(log.log_date).slice(0, 10), log]))
  const exerciseByDate = new Map(dates.map((date) => [date, []]))
  const mealsByDate = new Map(dates.map((date) => [date, []]))
  for (const item of exercises) exerciseByDate.get(String(item.log_date).slice(0, 10))?.push(item)
  for (const item of meals) mealsByDate.get(String(item.log_date).slice(0, 10))?.push(item)

  const dailyBmr = resolveProfileBmr(profile)
  const hasAnyRecord = exercises.length > 0 || meals.length > 0
  const dailyExercise = []
  const dailyDiet = []
  const dailyCalories = []
  const dailyAchievements = []
  let exerciseKingCount = 0
  let fatLossPioneerCount = 0
  let foodKingCount = 0

  for (const date of dates) {
    const dayExercises = exerciseByDate.get(date) || []
    const dayMeals = mealsByDate.get(date) || []
    const log = logsByDate.get(date)
    const exerciseCalories = Math.round(
      dayExercises.reduce((sum, item) => sum + toKcal(item.kcal), 0),
    )
    const caloriesIn = Math.round(
      dayMeals.reduce((sum, item) => sum + toKcal(item.kcal), 0),
    )
    const hasDeficitData = dailyBmr > 0 && dayMeals.length > 0
    const deficit = hasDeficitData
      ? calculateDeficitByMode(
          dailyBmr,
          exerciseCalories,
          caloriesIn,
          date,
          'full_day',
          new Date(`${date}T23:59:59Z`),
        )
      : null
    const achievementDeficit = dayMeals.length > 0
      ? calculateDeficitByMode(
          dailyBmr,
          exerciseCalories,
          caloriesIn,
          date,
          'full_day',
          new Date(`${date}T23:59:59Z`),
        )
      : exerciseCalories
    const hasCompleteMacros = completeMealMacros(dayMeals)
    const achievements = log
      ? achievementsForDay({
          deficit: achievementDeficit,
          exerciseKcal: exerciseCalories,
          mealKcal: caloriesIn,
          dailyBmr: dayMeals.length > 0 ? dailyBmr : 0,
        })
      : []
    for (const achievement of achievements) {
      if (achievement.type === 'exercise_king') exerciseKingCount += 1
      if (achievement.type === 'fat_loss_pioneer') fatLossPioneerCount += 1
      if (achievement.type === 'food_king') foodKingCount += 1
    }
    dailyExercise.push({
      date,
      minutes: null,
      calories: exerciseCalories,
      workoutCount: dayExercises.length,
    })
    dailyDiet.push({
      date,
      calories: caloriesIn,
      protein: hasCompleteMacros ? sumMealMacro(dayMeals, 'protein_g') : null,
      carbs: hasCompleteMacros ? sumMealMacro(dayMeals, 'carbs_g') : null,
      fat: hasCompleteMacros ? sumMealMacro(dayMeals, 'fat_g') : null,
      sugar: hasCompleteMacros
        ? Math.round(dayMeals.reduce((sum, meal) => sum + (macroValue(meal.sugar_g) ?? 0), 0) * 10) / 10
        : null,
      hasCompleteMacros,
      foodCount: dayMeals.length,
    })
    dailyCalories.push({
      date,
      caloriesIn,
      exerciseCalories,
      estimatedTdee: null,
      baseMetabolism: dailyBmr > 0 ? dailyBmr : null,
      deficit,
      status: statusForDeficit(deficit),
    })
    dailyAchievements.push({ date, achievements })
  }

  const exerciseRanking = rankNames(exercises)
  const foodRanking = rankNames(meals)
  const highestFood = highestCalorieItem(meals)
  const totalExerciseCalories = dailyExercise.reduce((sum, day) => sum + day.calories, 0)
  const totalCaloriesIn = dailyDiet.reduce((sum, day) => sum + day.calories, 0)
  const knownDeficits = dailyCalories
    .map((day) => day.deficit)
    .filter((value) => value != null)
  const totalDeficit = knownDeficits.reduce((sum, value) => sum + value, 0)
  const averageDailyDeficit = knownDeficits.length
    ? Math.round(totalDeficit / knownDeficits.length)
    : null
  const achievementCount = exerciseKingCount + fatLossPioneerCount + foodKingCount
  const macroDays = dailyDiet.filter((day) => day.hasCompleteMacros)
  const macroLoggedDays = macroDays.length
  const hasSufficientMacros = macroLoggedDays >= 4
  const totalProtein = hasSufficientMacros
    ? Math.round(macroDays.reduce((sum, day) => sum + day.protein, 0) * 10) / 10
    : null
  const totalCarbs = hasSufficientMacros
    ? Math.round(macroDays.reduce((sum, day) => sum + day.carbs, 0) * 10) / 10
    : null
  const totalFat = hasSufficientMacros
    ? Math.round(macroDays.reduce((sum, day) => sum + day.fat, 0) * 10) / 10
    : null
  const macroTargets = calculateMacroTargetsFromMetabolism({
    sex: profile?.sex,
    weightKg: profile?.weight_kg,
    activityFactor: profile?.activity_factor,
    tdee: resolveProfileTdee(profile),
    deficitThreshold: profile?.deficit_threshold,
  })
  const bestProteinMeal = [...meals]
    .filter((meal) => macroValue(meal.protein_g) != null)
    .sort((a, b) => macroValue(b.protein_g) - macroValue(a.protein_g))[0]
  const bestExerciseDay = [...dailyExercise]
    .filter((day) => day.workoutCount > 0)
    .sort((a, b) => b.calories - a.calories || b.workoutCount - a.workoutCount)[0]?.date
  const bestAchievementDay = [...dailyAchievements]
    .filter((day) => day.achievements.length > 0)
    .sort((a, b) => b.achievements.length - a.achievements.length)[0]?.date

  const summary = {
    dataStatus: hasAnyRecord ? 'complete' : 'insufficient',
    activeDays: dailyExercise.filter((day) => day.workoutCount > 0).length,
    dietLoggedDays: dailyDiet.filter((day) => day.foodCount > 0).length,
    totalExerciseMinutes: null,
    totalExerciseCalories,
    totalCaloriesIn,
    totalCalorieDeficit: knownDeficits.length ? totalDeficit : null,
    averageDailyDeficit,
    weightChangeKg: null,
    achievementCount,
    overallTitle: '',
  }
  const exerciseStats = {
    totalWorkouts: exercises.length,
    totalMinutes: null,
    totalCalories: totalExerciseCalories,
    favoriteExerciseName: exerciseRanking[0]?.name,
    favoriteExerciseCount: exerciseRanking[0]?.count,
    favoriteExerciseMinutes: null,
    longestWorkoutMinutes: null,
    bestExerciseDay,
    exerciseTypeDistribution: exerciseRanking.map((item) => ({
      name: item.name,
      minutes: null,
      calories: item.calories,
      count: item.count,
    })),
    dailyExercise,
  }
  const dietStats = {
    loggedDays: summary.dietLoggedDays,
    totalCalories: totalCaloriesIn,
    averageCalories: summary.dietLoggedDays
      ? Math.round(totalCaloriesIn / summary.dietLoggedDays)
      : null,
    macroStatus: hasSufficientMacros ? 'sufficient' : 'insufficient',
    macroLoggedDays,
    macroTargets,
    totalProtein,
    averageProtein: totalProtein == null ? null : Math.round((totalProtein / macroLoggedDays) * 10) / 10,
    totalCarbs,
    averageCarbs: totalCarbs == null ? null : Math.round((totalCarbs / macroLoggedDays) * 10) / 10,
    totalFat,
    averageFat: totalFat == null ? null : Math.round((totalFat / macroLoggedDays) * 10) / 10,
    favoriteFood: foodRanking[0]?.name,
    favoriteFoodCount: foodRanking[0]?.count,
    highestCalorieFood: highestFood?.name,
    highestCalorieFoodCalories: highestFood ? Math.round(toKcal(highestFood.kcal)) : null,
    bestProteinFood: bestProteinMeal?.name ?? null,
    snackCount: null,
    drinkCount: null,
    foodRanking,
    dailyDiet,
  }
  const calorieStats = {
    totalCaloriesIn,
    totalExerciseCalories,
    estimatedTdeeTotal: null,
    baseMetabolismTotal: dailyBmr > 0 ? dailyBmr * 7 : null,
    totalDeficit: knownDeficits.length ? totalDeficit : null,
    averageDailyDeficit,
    deficitLevel: levelForAverageDeficit(averageDailyDeficit, knownDeficits.length > 0),
    trackedDeficitDays: knownDeficits.length,
    dailyCalories,
  }
  const achievementStats = {
    totalCards: achievementCount,
    exerciseKingCount,
    fatLossPioneerCount,
    foodKingCount,
    bestAchievementDay,
    dailyAchievements,
  }
  summary.overallTitle = chooseOverallTitle(summary, dietStats, calorieStats)

  const report = {
    userId,
    weekStartDate,
    weekEndDate,
    weekNumber,
    year,
    generatedAt,
    summary,
    exerciseStats,
    dietStats,
    calorieStats,
    achievementStats,
    narrativeSource: 'rules',
    foxComment: '',
    nextWeekSuggestions: [],
  }
  report.insights = buildWeeklyInsights(report, prevReport)
  report.headline = report.insights.headline
  report.wowDelta = report.insights.wowDelta
  report.foxComment = generateWeeklyFoxComment(report)
  report.nextWeekSuggestions = generateNextWeekSuggestions(report)
  return report
}

export function weekHasReportableActivity(logs = [], exercises = [], meals = []) {
  if (exercises.length > 0 || meals.length > 0) return true
  return logs.some(
    (log) => toKcal(log.exercise_kcal) > 0 || toKcal(log.meal_kcal) > 0,
  )
}

export function isPublishableUserWeeklyReport(report) {
  return report?.summary?.dataStatus === 'complete'
}

export function normalizeReportJson(report) {
  if (!report || typeof report !== 'object') return null
  const summary = report.summary ?? {}
  const exerciseStats = report.exerciseStats ?? {}
  const dietStats = report.dietStats ?? {}
  const calorieStats = report.calorieStats ?? {}
  const achievementStats = report.achievementStats ?? {}
  const normalized = {
    ...report,
    summary,
    exerciseStats: {
      ...exerciseStats,
      exerciseTypeDistribution: Array.isArray(exerciseStats.exerciseTypeDistribution)
        ? exerciseStats.exerciseTypeDistribution
        : [],
      dailyExercise: Array.isArray(exerciseStats.dailyExercise)
        ? exerciseStats.dailyExercise
        : [],
    },
    dietStats: {
      ...dietStats,
      macroStatus: dietStats.macroStatus === 'sufficient' ? 'sufficient' : 'insufficient',
      macroLoggedDays: Number(dietStats.macroLoggedDays) || 0,
      macroTargets: dietStats.macroTargets ?? null,
      foodRanking: Array.isArray(dietStats.foodRanking) ? dietStats.foodRanking : [],
      dailyDiet: Array.isArray(dietStats.dailyDiet) ? dietStats.dailyDiet : [],
    },
    calorieStats: {
      ...calorieStats,
      dailyCalories: Array.isArray(calorieStats.dailyCalories)
        ? calorieStats.dailyCalories
        : [],
    },
    achievementStats: {
      ...achievementStats,
      dailyAchievements: Array.isArray(achievementStats.dailyAchievements)
        ? achievementStats.dailyAchievements
        : [],
    },
    narrativeSource: report.narrativeSource === 'ai' ? 'ai' : 'rules',
    nextWeekSuggestions: Array.isArray(report.nextWeekSuggestions)
      ? report.nextWeekSuggestions.map((item) => ({
          ...item,
          why: typeof item?.why === 'string' ? item.why : '',
          content:
            typeof item?.content === 'string' && item.content.trim()
              ? item.content
              : typeof item?.why === 'string'
                ? item.why
                : '',
          successMetric:
            typeof item?.successMetric === 'string' ? item.successMetric : '',
          evidenceIds: Array.isArray(item?.evidenceIds) ? item.evidenceIds : [],
        }))
      : [],
  }
  normalized.insights =
    report.insights && typeof report.insights === 'object'
      ? {
          ...report.insights,
          headline: report.insights.headline || report.headline || summary.overallTitle || '小满周报',
          evidence: Array.isArray(report.insights.evidence) ? report.insights.evidence : [],
          wowDelta: report.insights.wowDelta ?? buildWowDelta(normalized, null),
        }
      : buildWeeklyInsights(normalized, null)
  normalized.headline = report.headline || normalized.insights.headline || summary.overallTitle || '小满周报'
  normalized.wowDelta = report.wowDelta ?? normalized.insights.wowDelta ?? buildWowDelta(normalized, null)
  return normalized
}

export function rowDateKey(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return formatDateKeyInTz(value)
  }
  if (typeof value === 'string') {
    const s = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const head = s.match(/^(\d{4}-\d{2}-\d{2})/)
    if (head) return head[1]
  }
  return ''
}

function rowToReport(row) {
  if (!row) return null
  const payload =
    typeof row.report_json === 'string'
      ? JSON.parse(row.report_json)
      : row.report_json
  const normalized = normalizeReportJson(payload)
  if (!normalized) return null
  return {
    id: row.id,
    ...normalized,
    userId: row.user_id,
    weekStartDate: rowDateKey(row.week_start_date),
    weekEndDate: rowDateKey(row.week_end_date),
    weekNumber: Number(row.week_number),
    year: Number(row.year),
    generatedAt: row.generated_at,
    viewedAt: row.viewed_at,
    isViewed: Boolean(row.is_viewed),
    sharedToCommunityAt: row.shared_to_community_at ?? null,
    isSharedToCommunity: Boolean(row.shared_to_community_at),
  }
}

async function loadWeeklyReportInputs(userId, range, queryFn) {
  const previousWeekStart = addDateDays(range.weekStartDate, -7)
  const [profileResult, logsResult, exerciseResult, mealResult, previousResult] =
    await Promise.all([
      queryFn(`select * from profiles where id = $1`, [userId]),
      queryFn(
        `select log_date::text as log_date, exercise_kcal, meal_kcal, deficit
         from day_logs where user_id = $1 and log_date between $2 and $3 order by log_date`,
        [userId, range.weekStartDate, range.weekEndDate],
      ),
      queryFn(
        `select e.name, e.kcal, d.log_date::text as log_date
         from exercises e join day_logs d on d.id = e.day_log_id
         where e.user_id = $1 and d.log_date between $2 and $3 order by d.log_date, e.created_at`,
        [userId, range.weekStartDate, range.weekEndDate],
      ),
      queryFn(
        `select m.name, m.kcal, m.protein_g, m.fat_g, m.carbs_g, m.sugar_g,
                d.log_date::text as log_date
         from meals m join day_logs d on d.id = m.day_log_id
         where m.user_id = $1 and d.log_date between $2 and $3 order by d.log_date, m.created_at`,
        [userId, range.weekStartDate, range.weekEndDate],
      ),
      queryFn(
        `select * from user_weekly_reports
         where user_id = $1 and week_start_date = $2`,
        [userId, previousWeekStart],
      ),
    ])
  return {
    profile: profileResult.rows[0],
    logs: logsResult.rows,
    exercises: exerciseResult.rows,
    meals: mealResult.rows,
    prevReport: rowToReport(previousResult.rows[0]),
  }
}

export async function ensureLatestUserWeeklyReport(userId, queryFn, now = new Date()) {
  const range = getPreviousWeekRange(now)
  const existing = await queryFn(
    `select * from user_weekly_reports where user_id = $1 and week_start_date = $2`,
    [userId, range.weekStartDate],
  )
  if (existing.rows[0]) {
    const report = rowToReport(existing.rows[0])
    return {
      report: isPublishableUserWeeklyReport(report) ? report : null,
      generated: false,
      eligible: isPublishableUserWeeklyReport(report),
    }
  }

  const inputs = await loadWeeklyReportInputs(userId, range, queryFn)
  const { logs, exercises, meals } = inputs

  if (!weekHasReportableActivity(logs, exercises, meals)) {
    return { report: null, generated: false, eligible: false }
  }

  const ruleSnapshot = buildWeeklyReportSnapshot({
    userId,
    ...range,
    ...inputs,
  })
  const snapshot = await polishWeeklyNarrative(ruleSnapshot)
  const inserted = await queryFn(
    `insert into user_weekly_reports
       (user_id, week_start_date, week_end_date, week_number, year, report_json)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (user_id, week_start_date) do nothing
     returning *`,
    [userId, range.weekStartDate, range.weekEndDate, range.weekNumber, range.year, JSON.stringify(snapshot)],
  )
  if (inserted.rows[0]) {
    const report = rowToReport(inserted.rows[0])
    return { report, generated: true, eligible: true }
  }
  const raced = await queryFn(
    `select * from user_weekly_reports where user_id = $1 and week_start_date = $2`,
    [userId, range.weekStartDate],
  )
  const report = rowToReport(raced.rows[0])
  return {
    report: isPublishableUserWeeklyReport(report) ? report : null,
    generated: false,
    eligible: isPublishableUserWeeklyReport(report),
  }
}

export async function regenerateUserWeeklyReport(
  userId,
  reportId,
  queryFn,
  options = {},
) {
  const existing = await queryFn(
    `select * from user_weekly_reports where id = $1 and user_id = $2`,
    [reportId, userId],
  )
  const row = existing.rows[0]
  if (!row) return null
  const range = {
    weekStartDate: rowDateKey(row.week_start_date),
    weekEndDate: rowDateKey(row.week_end_date),
    weekNumber: Number(row.week_number),
    year: Number(row.year),
  }
  const inputs = await loadWeeklyReportInputs(userId, range, queryFn)
  const ruleSnapshot = buildWeeklyReportSnapshot({
    userId,
    ...range,
    ...inputs,
    generatedAt: new Date().toISOString(),
  })
  const snapshot = await polishWeeklyNarrative(ruleSnapshot, options)
  const updated = await queryFn(
    `update user_weekly_reports
     set report_json = $3::jsonb, generated_at = now(), updated_at = now()
     where id = $1 and user_id = $2 returning *`,
    [reportId, userId, JSON.stringify(snapshot)],
  )
  return rowToReport(updated.rows[0])
}

export async function listUserWeeklyReports(userId, queryFn) {
  const result = await queryFn(
    `select * from user_weekly_reports where user_id = $1 order by week_start_date desc limit 104`,
    [userId],
  )
  return result.rows
    .map(rowToReport)
    .filter((report) => isPublishableUserWeeklyReport(report))
}

export async function getUserWeeklyReport(userId, reportId, queryFn) {
  const result = await queryFn(
    `select * from user_weekly_reports where id = $1 and user_id = $2`,
    [reportId, userId],
  )
  const report = rowToReport(result.rows[0])
  return isPublishableUserWeeklyReport(report) ? report : null
}

export async function markUserWeeklyReportViewed(userId, reportId, queryFn) {
  const result = await queryFn(
    `update user_weekly_reports
     set is_viewed = true, viewed_at = coalesce(viewed_at, now()), updated_at = now()
     where id = $1 and user_id = $2 returning *`,
    [reportId, userId],
  )
  return rowToReport(result.rows[0])
}

function toCommunitySharedSummary(report) {
  return {
    id: report.id,
    weekStartDate: report.weekStartDate,
    weekEndDate: report.weekEndDate,
    weekNumber: report.weekNumber,
    year: report.year,
    overallTitle: report.summary?.overallTitle ?? '小满周报',
    activeDays: report.summary?.activeDays ?? 0,
    totalCalorieDeficit: report.summary?.totalCalorieDeficit ?? null,
    achievementCount: report.summary?.achievementCount ?? 0,
    sharedToCommunityAt: report.sharedToCommunityAt,
  }
}

export async function shareUserWeeklyReportToCommunity(userId, reportId, queryFn) {
  const profile = await loadProfile(userId)
  if (!profile?.community_visible) {
    const err = new Error('请先在设置中公开社区名片后再分享周报')
    err.status = 400
    throw err
  }
  const existing = await getUserWeeklyReport(userId, reportId, queryFn)
  if (!existing) {
    const err = new Error('周报不存在')
    err.status = 404
    throw err
  }
  const result = await queryFn(
    `update user_weekly_reports
     set shared_to_community_at = now(), updated_at = now()
     where id = $1 and user_id = $2 returning *`,
    [reportId, userId],
  )
  const report = rowToReport(result.rows[0])
  return isPublishableUserWeeklyReport(report) ? report : null
}

export async function unshareUserWeeklyReportFromCommunity(userId, reportId, queryFn) {
  const result = await queryFn(
    `update user_weekly_reports
     set shared_to_community_at = null, updated_at = now()
     where id = $1 and user_id = $2 returning *`,
    [reportId, userId],
  )
  if (!result.rows[0]) {
    const err = new Error('周报不存在')
    err.status = 404
    throw err
  }
  const report = rowToReport(result.rows[0])
  return isPublishableUserWeeklyReport(report) ? report : null
}

export async function listCommunitySharedWeeklyReports(ownerId, viewerId, queryFn) {
  const profile = await loadProfile(ownerId)
  assertCanViewCommunity(profile, viewerId)
  const result = await queryFn(
    `select * from user_weekly_reports
     where user_id = $1 and shared_to_community_at is not null
     order by week_start_date desc, shared_to_community_at desc
     limit 1`,
    [ownerId],
  )
  return result.rows
    .map(rowToReport)
    .filter((report) => isPublishableUserWeeklyReport(report))
    .map(toCommunitySharedSummary)
}

export async function getCommunitySharedWeeklyReport(ownerId, reportId, viewerId, queryFn) {
  const profile = await loadProfile(ownerId)
  assertCanViewCommunity(profile, viewerId)
  const result = await queryFn(
    `select * from user_weekly_reports
     where id = $1 and user_id = $2 and shared_to_community_at is not null`,
    [reportId, ownerId],
  )
  const report = rowToReport(result.rows[0])
  if (!isPublishableUserWeeklyReport(report)) {
    const err = new Error('周报不存在或未公开')
    err.status = 404
    throw err
  }
  return report
}
