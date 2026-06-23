import type { UserWeeklyReport } from '../types'
import { normalizeDateKey, parseDateKey } from './streaks'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

function toReportDateKey(value: unknown): string {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return normalizeDateKey(value)
  }
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (head) return head[1]
  return ''
}

/** 安全格式化周报日期，避免 Invalid Date 触发 Intl 崩溃。 */
export function formatWeeklyDateLabel(
  value: string | null | undefined,
  style: 'short' | 'long' = 'long',
): string {
  const key = toReportDateKey(value)
  if (!key) return '—'
  const d = parseDateKey(key)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: style === 'short' ? 'numeric' : 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return '—'
  }
}

/** 补齐 API / 旧数据里可能缺失的嵌套字段，避免周报页渲染崩溃。 */
export function normalizeUserWeeklyReport(
  report: UserWeeklyReport | null | undefined,
): UserWeeklyReport | null {
  if (!report || typeof report !== 'object') return null

  const summary = report.summary ?? ({} as UserWeeklyReport['summary'])
  const exerciseStats = report.exerciseStats ?? ({} as UserWeeklyReport['exerciseStats'])
  const dietStats = report.dietStats ?? ({} as UserWeeklyReport['dietStats'])
  const calorieStats = report.calorieStats ?? ({} as UserWeeklyReport['calorieStats'])
  const achievementStats =
    report.achievementStats ?? ({} as UserWeeklyReport['achievementStats'])

  return {
    ...report,
    weekStartDate: toReportDateKey(report.weekStartDate),
    weekEndDate: toReportDateKey(report.weekEndDate),
    weekNumber: Number(report.weekNumber) || 0,
    year: Number(report.year) || 0,
    sharedToCommunityAt: report.sharedToCommunityAt ?? null,
    isSharedToCommunity: Boolean(report.isSharedToCommunity ?? report.sharedToCommunityAt),
    summary: {
      dataStatus: summary.dataStatus === 'insufficient' ? 'insufficient' : 'complete',
      activeDays: Number(summary.activeDays) || 0,
      dietLoggedDays: Number(summary.dietLoggedDays) || 0,
      totalExerciseMinutes: summary.totalExerciseMinutes ?? null,
      totalExerciseCalories: Number(summary.totalExerciseCalories) || 0,
      totalCaloriesIn: Number(summary.totalCaloriesIn) || 0,
      totalCalorieDeficit: summary.totalCalorieDeficit ?? null,
      averageDailyDeficit: summary.averageDailyDeficit ?? null,
      weightChangeKg: summary.weightChangeKg ?? null,
      achievementCount: Number(summary.achievementCount) || 0,
      overallTitle: summary.overallTitle || '小满周报',
    },
    exerciseStats: {
      totalWorkouts: Number(exerciseStats.totalWorkouts) || 0,
      totalMinutes: exerciseStats.totalMinutes ?? null,
      totalCalories: Number(exerciseStats.totalCalories) || 0,
      favoriteExerciseName: exerciseStats.favoriteExerciseName,
      favoriteExerciseCount: exerciseStats.favoriteExerciseCount,
      favoriteExerciseMinutes: exerciseStats.favoriteExerciseMinutes ?? null,
      longestWorkoutMinutes: exerciseStats.longestWorkoutMinutes ?? null,
      bestExerciseDay: toReportDateKey(exerciseStats.bestExerciseDay) || undefined,
      exerciseTypeDistribution: asArray(exerciseStats.exerciseTypeDistribution),
      dailyExercise: asArray(exerciseStats.dailyExercise),
    },
    dietStats: {
      loggedDays: Number(dietStats.loggedDays) || 0,
      totalCalories: Number(dietStats.totalCalories) || 0,
      averageCalories: dietStats.averageCalories ?? null,
      totalProtein: dietStats.totalProtein ?? null,
      averageProtein: dietStats.averageProtein ?? null,
      totalCarbs: dietStats.totalCarbs ?? null,
      averageCarbs: dietStats.averageCarbs ?? null,
      totalFat: dietStats.totalFat ?? null,
      averageFat: dietStats.averageFat ?? null,
      favoriteFood: dietStats.favoriteFood,
      favoriteFoodCount: dietStats.favoriteFoodCount,
      highestCalorieFood: dietStats.highestCalorieFood,
      highestCalorieFoodCalories: dietStats.highestCalorieFoodCalories ?? null,
      bestProteinFood: dietStats.bestProteinFood ?? null,
      snackCount: dietStats.snackCount ?? null,
      drinkCount: dietStats.drinkCount ?? null,
      dailyDiet: asArray(dietStats.dailyDiet),
    },
    calorieStats: {
      totalCaloriesIn: Number(calorieStats.totalCaloriesIn) || 0,
      totalExerciseCalories: Number(calorieStats.totalExerciseCalories) || 0,
      estimatedTdeeTotal: calorieStats.estimatedTdeeTotal ?? null,
      totalDeficit: calorieStats.totalDeficit ?? null,
      averageDailyDeficit: calorieStats.averageDailyDeficit ?? null,
      deficitLevel: calorieStats.deficitLevel ?? 'unknown',
      trackedDeficitDays: Number(calorieStats.trackedDeficitDays) || 0,
      dailyCalories: asArray(calorieStats.dailyCalories),
    },
    achievementStats: {
      totalCards: Number(achievementStats.totalCards) || 0,
      exerciseKingCount: Number(achievementStats.exerciseKingCount) || 0,
      fatLossPioneerCount: Number(achievementStats.fatLossPioneerCount) || 0,
      foodKingCount: Number(achievementStats.foodKingCount) || 0,
      bestAchievementDay: toReportDateKey(achievementStats.bestAchievementDay) || undefined,
      dailyAchievements: asArray(achievementStats.dailyAchievements),
    },
    foxComment: report.foxComment || '小狸还在整理你的上周故事，继续记录会更完整。',
    nextWeekSuggestions: asArray(report.nextWeekSuggestions),
  }
}
