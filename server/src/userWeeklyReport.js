import { resolveProfileBmr, toKcal } from './calories.js'
import { evaluateCommunityDayStatus } from './communityBadges.js'
import { assertCanViewCommunity, loadProfile } from './community.js'
import { formatDateKeyInTz } from './dateKey.js'

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

export function generateWeeklyFoxComment(report) {
  if (report.summary.dataStatus === 'insufficient') {
    return '小狸还没有收集到足够多的上周记录，所以这次周报比较简单。没关系，从今天开始多记录一点，下周一小满就能给你一份更完整的专属周报。'
  }
  if (report.summary.activeDays >= 4 && report.summary.dietLoggedDays < 3) {
    return '小狸发现你上周运动很努力，不过饮食记录有点少。下周不用一下子做到完美，先把晚餐认真记下来，小满就能更准确地帮你分析。'
  }
  if (report.summary.activeDays < 2 && report.summary.dietLoggedDays >= 4) {
    return '你上周的饮食记录很认真，这是很好的开始。下周可以从散步、拉伸或短时间力量训练开始，小狸会陪你慢慢加起来。'
  }
  if (report.calorieStats.deficitLevel === 'aggressive') {
    return '小狸看见你上周很有行动力，也想提醒你给身体留一点恢复空间。稳定吃、安心练，比把缺口拉得太大更容易走得长久。'
  }
  return '小狸看完你的上周记录啦！这一周的进步不是靠某一天突然爆发，而是由一次次认真记录撑起来的。继续保持自己的节奏，身体会慢慢给你反馈。'
}

export function generateNextWeekSuggestions(report) {
  const suggestions = []
  if (report.summary.activeDays < 3) {
    suggestions.push({
      type: 'exercise',
      title: '先稳定出现三次',
      content: '下周先安排 3 次轻量运动。当前记录没有时长字段，以完成一次可持续的活动为准，不用追求练得很猛。',
    })
  } else {
    suggestions.push({
      type: 'exercise',
      title: '延续最顺手的运动',
      content: report.exerciseStats.favoriteExerciseName
        ? `继续安排你最常做的「${report.exerciseStats.favoriteExerciseName}」，再留一天做轻松恢复。`
        : '保持当前运动频率，并留一天做散步或拉伸恢复。',
    })
  }
  if (report.summary.dietLoggedDays < 5) {
    suggestions.push({
      type: 'diet',
      title: '挑战记录五天',
      content: '下周先挑战 5 天饮食记录，不要求每餐完美，只要让小满更了解你的真实节奏。',
    })
  } else if (report.calorieStats.deficitLevel === 'aggressive') {
    suggestions.push({
      type: 'recovery',
      title: '给恢复留出空间',
      content: '下周不要继续拉大热量缺口，规律进食并保证休息，减脂也需要恢复。',
    })
  } else {
    suggestions.push({
      type: 'diet',
      title: '继续完整记录',
      content: '保持现在的记录习惯，每餐优先安排一份看得见的蛋白质来源。',
    })
  }
  suggestions.push({
    type: 'habit',
    title: '给记录一个固定触发点',
    content: '试试在晚餐后统一补齐当天记录，用两分钟收尾，比靠记忆更轻松。',
  })
  return suggestions.slice(0, 3)
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
      ? Math.round(dailyBmr + exerciseCalories - caloriesIn)
      : null
    const achievementDeficit = dayMeals.length > 0
      ? Math.round(dailyBmr + exerciseCalories - caloriesIn)
      : exerciseCalories
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
      protein: null,
      carbs: null,
      fat: null,
      foodCount: dayMeals.length,
    })
    dailyCalories.push({
      date,
      caloriesIn,
      exerciseCalories,
      estimatedTdee: dailyBmr > 0 ? dailyBmr : null,
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
    totalProtein: null,
    averageProtein: null,
    totalCarbs: null,
    averageCarbs: null,
    totalFat: null,
    averageFat: null,
    favoriteFood: foodRanking[0]?.name,
    favoriteFoodCount: foodRanking[0]?.count,
    highestCalorieFood: highestFood?.name,
    highestCalorieFoodCalories: highestFood ? Math.round(toKcal(highestFood.kcal)) : null,
    bestProteinFood: null,
    snackCount: null,
    drinkCount: null,
    dailyDiet,
  }
  const calorieStats = {
    totalCaloriesIn,
    totalExerciseCalories,
    estimatedTdeeTotal: dailyBmr > 0 ? dailyBmr * 7 : null,
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
    foxComment: '',
    nextWeekSuggestions: [],
  }
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

function normalizeReportJson(report) {
  if (!report || typeof report !== 'object') return null
  const summary = report.summary ?? {}
  const exerciseStats = report.exerciseStats ?? {}
  const dietStats = report.dietStats ?? {}
  const calorieStats = report.calorieStats ?? {}
  const achievementStats = report.achievementStats ?? {}
  return {
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
    nextWeekSuggestions: Array.isArray(report.nextWeekSuggestions)
      ? report.nextWeekSuggestions
      : [],
  }
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

  const [profileResult, logsResult, exerciseResult, mealResult] = await Promise.all([
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
      `select m.name, m.kcal, d.log_date::text as log_date
       from meals m join day_logs d on d.id = m.day_log_id
       where m.user_id = $1 and d.log_date between $2 and $3 order by d.log_date, m.created_at`,
      [userId, range.weekStartDate, range.weekEndDate],
    ),
  ])
  const logs = logsResult.rows
  const exercises = exerciseResult.rows
  const meals = mealResult.rows

  if (!weekHasReportableActivity(logs, exercises, meals)) {
    return { report: null, generated: false, eligible: false }
  }

  const snapshot = buildWeeklyReportSnapshot({
    userId,
    ...range,
    profile: profileResult.rows[0],
    logs,
    exercises,
    meals,
  })
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
     order by shared_to_community_at desc
     limit 52`,
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
