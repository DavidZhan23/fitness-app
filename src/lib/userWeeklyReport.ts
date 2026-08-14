import type {
  UserWeeklyReport,
  WeeklyReportWowDelta,
  WeeklySuggestionType,
} from '../types'
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

const SUGGESTION_TYPES = new Set<WeeklySuggestionType>([
  'exercise',
  'diet',
  'habit',
  'recovery',
])

function normalizeWowDelta(value: Partial<WeeklyReportWowDelta> | null | undefined): WeeklyReportWowDelta {
  return {
    activeDays: value?.activeDays ?? null,
    dietLoggedDays: value?.dietLoggedDays ?? null,
    totalExerciseCalories: value?.totalExerciseCalories ?? null,
    totalCaloriesIn: value?.totalCaloriesIn ?? null,
    totalCalorieDeficit: value?.totalCalorieDeficit ?? null,
    achievementCount: value?.achievementCount ?? null,
  }
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
  const rawInsights = report.insights ?? ({} as UserWeeklyReport['insights'])
  const headline = report.headline || rawInsights.headline || summary.overallTitle || '小满周报'
  const wowDelta = normalizeWowDelta(report.wowDelta ?? rawInsights.wowDelta)

  return {
    ...report,
    weekStartDate: toReportDateKey(report.weekStartDate),
    weekEndDate: toReportDateKey(report.weekEndDate),
    weekNumber: Number(report.weekNumber) || 0,
    year: Number(report.year) || 0,
    sharedToCommunityAt: report.sharedToCommunityAt ?? null,
    isSharedToCommunity: Boolean(report.isSharedToCommunity ?? report.sharedToCommunityAt),
    headline,
    narrativeSource: report.narrativeSource === 'ai' ? 'ai' : 'rules',
    wowDelta,
    insights: {
      coverage: {
        dietLoggedDays: Number(rawInsights.coverage?.dietLoggedDays ?? summary.dietLoggedDays) || 0,
        activeDays: Number(rawInsights.coverage?.activeDays ?? summary.activeDays) || 0,
        trackedDeficitDays: Number(rawInsights.coverage?.trackedDeficitDays ?? calorieStats.trackedDeficitDays) || 0,
        macroLoggedDays: Number(rawInsights.coverage?.macroLoggedDays ?? dietStats.macroLoggedDays) || 0,
        weekendDietMissing: Boolean(rawInsights.coverage?.weekendDietMissing),
      },
      calorie: {
        level: rawInsights.calorie?.level ?? calorieStats.deficitLevel ?? 'unknown',
        averageDailyDeficit: rawInsights.calorie?.averageDailyDeficit ?? calorieStats.averageDailyDeficit ?? null,
        trackedDays: Number(rawInsights.calorie?.trackedDays ?? calorieStats.trackedDeficitDays) || 0,
      },
      exercise: {
        activeDays: Number(rawInsights.exercise?.activeDays ?? summary.activeDays) || 0,
        totalWorkouts: Number(rawInsights.exercise?.totalWorkouts ?? exerciseStats.totalWorkouts) || 0,
        favoriteName: rawInsights.exercise?.favoriteName ?? exerciseStats.favoriteExerciseName ?? null,
        favoriteCount: Number(rawInsights.exercise?.favoriteCount ?? exerciseStats.favoriteExerciseCount) || 0,
        concentration: Number(rawInsights.exercise?.concentration) || 0,
      },
      diet: {
        loggedDays: Number(rawInsights.diet?.loggedDays ?? dietStats.loggedDays) || 0,
        macroStatus:
          rawInsights.diet?.macroStatus === 'sufficient' || dietStats.macroStatus === 'sufficient'
            ? 'sufficient'
            : 'insufficient',
        proteinStatus:
          rawInsights.diet?.proteinStatus === 'low' || rawInsights.diet?.proteinStatus === 'steady'
            ? rawInsights.diet.proteinStatus
            : 'insufficient',
        averageProtein: rawInsights.diet?.averageProtein ?? dietStats.averageProtein ?? null,
        macroTargets: rawInsights.diet?.macroTargets ?? dietStats.macroTargets ?? null,
      },
      persona:
        rawInsights.persona === 'recovery' ||
        rawInsights.persona === 'coverage' ||
        rawInsights.persona === 'movement' ||
        rawInsights.persona === 'protein'
          ? rawInsights.persona
          : 'steady',
      headline,
      evidence: asArray(rawInsights.evidence),
      wowDelta,
    },
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
      macroStatus: dietStats.macroStatus === 'sufficient' ? 'sufficient' : 'insufficient',
      macroLoggedDays: Number(dietStats.macroLoggedDays) || 0,
      macroTargets: dietStats.macroTargets ?? null,
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
      foodRanking: asArray(dietStats.foodRanking),
      dailyDiet: asArray(dietStats.dailyDiet),
    },
    calorieStats: {
      totalCaloriesIn: Number(calorieStats.totalCaloriesIn) || 0,
      totalExerciseCalories: Number(calorieStats.totalExerciseCalories) || 0,
      estimatedTdeeTotal: calorieStats.estimatedTdeeTotal ?? null,
      baseMetabolismTotal: calorieStats.baseMetabolismTotal ?? null,
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
    nextWeekSuggestions: asArray<UserWeeklyReport['nextWeekSuggestions'][number]>(
      report.nextWeekSuggestions,
    ).map((item) => {
      const why = typeof item?.why === 'string' ? item.why : ''
      const content =
        typeof item?.content === 'string' && item.content.trim()
          ? item.content
          : why || '按这个方向完成一次就很好。'
      return {
        ...item,
        type: SUGGESTION_TYPES.has(item?.type) ? item.type : 'habit',
        title: item?.title || '下周小目标',
        why,
        content,
        successMetric:
          typeof item?.successMetric === 'string' ? item.successMetric : '',
        evidenceIds: asArray<string>(item?.evidenceIds),
      }
    }),
  }
}
