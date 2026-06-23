import { query } from './db.js'
import { resolveProfileBmr, toKcal } from './calories.js'
import { calculateDeficitByMode, normalizeMetabolismMode } from './metabolism.js'
import { formatDateKeyInTz } from './dateKey.js'
import { evaluateCommunityDayStatus } from './communityBadges.js'

const FALLBACK_MESSAGES = [
  '小狐狸看见了，你这周已经很争气。再记一笔，气势就稳住了。',
  '运动大王别躲懒。今天慢一点也行，但别把自己的节奏丢了。',
  '你这股劲儿很漂亮。去动一动，回来让小狐狸继续夸你。',
  '本周的王冠已经亮过了，今天只要续上一点点，就很好看。',
]

function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getCurrentWeekRange(now = new Date()) {
  const today = formatDateKeyInTz(now)
  const day = new Date(`${today}T00:00:00Z`).getUTCDay()
  // Fox-only reward week: Saturday through Friday, so weekend big workouts
  // keep the companion visible through the following workweek.
  const daysSinceSaturday = (day + 1) % 7
  const weekStart = addDays(today, -daysSinceSaturday)
  const weekEnd = addDays(weekStart, 6)
  return { today, weekStart, weekEnd }
}

function fallbackIndex(seed) {
  let n = 0
  for (const ch of String(seed || '')) n += ch.charCodeAt(0)
  return n % FALLBACK_MESSAGES.length
}

export function buildFoxFallbackMessage(seed) {
  return FALLBACK_MESSAGES[fallbackIndex(seed)]
}

export function sanitizeFoxMessage(raw, fallback) {
  const cleaned = String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim()
  if (!cleaned) return fallback
  return Array.from(cleaned).slice(0, 90).join('')
}

export function calculateFoxCompanionDeficit({
  dailyBmr,
  exerciseKcal,
  mealKcal,
  logDate,
  today,
  metabolismMode,
  now = new Date(),
}) {
  if (logDate !== today) {
    return Math.round(toKcal(dailyBmr) + toKcal(exerciseKcal) - toKcal(mealKcal))
  }
  return calculateDeficitByMode(
    dailyBmr,
    exerciseKcal,
    mealKcal,
    logDate,
    metabolismMode,
    now,
  )
}

export async function getWeeklyChampionSummary(userId, now = new Date()) {
  const { today, weekStart, weekEnd } = getCurrentWeekRange(now)
  const { rows: profiles } = await query(
    `select * from profiles where id = $1`,
    [userId],
  )
  const profile = profiles[0]
  if (!profile?.onboarding_complete) {
    return {
      eligible: false,
      today,
      weekStart,
      weekEnd,
      todayChampion: false,
      historicalChampionDates: [],
      championDates: [],
    }
  }

  const dailyBmr = resolveProfileBmr(profile)
  const metabolismMode = normalizeMetabolismMode(profile.metabolism_mode)
  const { rows: logs } = await query(
    `select log_date::text as log_date, exercise_kcal, meal_kcal
     from day_logs
     where user_id = $1 and log_date >= $2 and log_date <= $3
     order by log_date`,
    [userId, weekStart, today],
  )

  const championDates = []
  const historicalChampionDates = []
  let todayChampion = false
  for (const log of logs) {
    const logDate = log.log_date
    const exerciseKcal = toKcal(log.exercise_kcal)
    const mealKcal = toKcal(log.meal_kcal)
    const deficit = calculateFoxCompanionDeficit({
      dailyBmr,
      exerciseKcal,
      mealKcal,
      logDate,
      today,
      metabolismMode,
      now,
    })
    const status = evaluateCommunityDayStatus({
      deficit,
      exerciseKcal,
      mealKcal,
      dailyBmr,
    })
    if (status.badge === 'champion') {
      championDates.push(logDate)
      if (logDate === today) {
        todayChampion = true
      } else {
        historicalChampionDates.push(logDate)
      }
    }
  }

  return {
    eligible: historicalChampionDates.length > 0 || todayChampion,
    today,
    weekStart,
    weekEnd,
    todayChampion,
    historicalChampionDates,
    championDates,
    latestChampionDate: championDates.at(-1) ?? null,
  }
}
