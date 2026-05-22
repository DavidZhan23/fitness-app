import { resolveProfileBmr, toKcal } from './calories.js'
import { calculateSpreadDeficit } from './metabolism.js'
import { formatDateKeyInTz, isValidDateKey } from './dateKey.js'
import {
  applyYesterdayVisibilityRules,
  syncCommunityVisibility,
} from './communityVisibility.js'
import { loadMemberOrderMap, sortMembersByCustomOrder } from './communityOrder.js'
import { enrichLogItemsWithReactions } from './logItemReactions.js'
import { query } from './db.js'

function formatDateKey(d = new Date()) {
  return formatDateKeyInTz(d)
}

function resolveClientToday(clientToday) {
  return isValidDateKey(clientToday) ? clientToday : formatDateKeyInTz()
}

function publicNickname(profile) {
  const nick = profile.nickname?.trim()
  if (nick) return nick.slice(0, 32)
  return `健身者${String(profile.id).slice(0, 6)}`
}

function accountStartKey(createdAt) {
  if (!createdAt) return null
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  return formatDateKey(d)
}

export async function loadProfile(userId) {
  const { rows } = await query(`select * from profiles where id = $1`, [userId])
  return rows[0] ?? null
}

export function assertCanViewCommunity(profile, viewerId) {
  if (!profile) {
    const err = new Error('用户不存在')
    err.status = 404
    throw err
  }
  if (!profile.onboarding_complete) {
    const err = new Error('该用户尚未完成资料设置')
    err.status = 404
    throw err
  }
  if (profile.id === viewerId) return
  if (!profile.community_visible) {
    const err = new Error('该用户未公开社区动态')
    err.status = 403
    throw err
  }
}

export function toPublicMember(profile, viewerId) {
  return {
    id: profile.id,
    nickname: publicNickname(profile),
    isSelf: profile.id === viewerId,
  }
}

export async function computeDaySnapshot(profile, logDate, now = new Date()) {
  const bmr = resolveProfileBmr(profile)
  const { rows: logs } = await query(
    `select * from day_logs where user_id = $1 and log_date = $2`,
    [profile.id, logDate],
  )
  const log = logs[0]
  const exerciseKcal = toKcal(log?.exercise_kcal)
  const mealKcal = toKcal(log?.meal_kcal)
  const endOfDay =
    logDate === formatDateKey(now)
      ? now
      : new Date(`${logDate}T23:59:59`)
  const deficit = calculateSpreadDeficit(
    bmr,
    exerciseKcal,
    mealKcal,
    logDate,
    endOfDay,
  )

  let exerciseCount = 0
  let mealCount = 0
  if (log) {
    const [ex, meals] = await Promise.all([
      query(`select count(*)::int as c from exercises where day_log_id = $1`, [
        log.id,
      ]),
      query(`select count(*)::int as c from meals where day_log_id = $1`, [
        log.id,
      ]),
    ])
    exerciseCount = ex.rows[0]?.c ?? 0
    mealCount = meals.rows[0]?.c ?? 0
  }

  return {
    date: logDate,
    deficit,
    exerciseKcal,
    mealKcal,
    exerciseCount,
    mealCount,
    dailyBmr: bmr,
    threshold: toKcal(profile.deficit_threshold),
    accountStartKey: accountStartKey(profile.created_at),
  }
}

export async function listCommunityMembers(viewerId, clientToday, filter = 'all') {
  const today = resolveClientToday(clientToday)
  await syncCommunityVisibility(viewerId, today)

  const viewerProfile = await loadProfile(viewerId)

  const { rows } = await query(
    `select * from profiles
     where community_visible = true and onboarding_complete = true
     order by updated_at desc nulls last, created_at desc
     limit 80`,
  )

  let profiles = rows
  if (
    viewerProfile?.onboarding_complete &&
    !profiles.some((p) => p.id === viewerId)
  ) {
    profiles = [viewerProfile, ...profiles]
  }

  if (filter === 'following') {
    const { rows: followRows } = await query(
      `select followee_id from follows where follower_id = $1`,
      [viewerId],
    )
    const followingSet = new Set(followRows.map((r) => r.followee_id))
    profiles = profiles.filter(
      (p) => p.id === viewerId || followingSet.has(p.id),
    )
    if (
      viewerProfile?.onboarding_complete &&
      !profiles.some((p) => p.id === viewerId)
    ) {
      profiles = [viewerProfile, ...profiles]
    }
  }

  const members = []
  const withVisibility = await applyYesterdayVisibilityRules(
    profiles,
    viewerId,
    today,
  )
  for (const { todaySnap, ...profile } of withVisibility) {
    members.push({
      ...toPublicMember(profile, viewerId),
      today: todaySnap,
    })
  }

  const orderMap = await loadMemberOrderMap(viewerId)
  const sorted = sortMembersByCustomOrder(members, orderMap)

  return { members: sorted, today, filter }
}

export async function getCommunityUser(viewerId, targetUserId, logDate) {
  const profile = await loadProfile(targetUserId)
  assertCanViewCommunity(profile, viewerId)

  const date = logDate || formatDateKey()
  const snapshot = await computeDaySnapshot(profile, date)

  let exercises = []
  let meals = []
  const { rows: logs } = await query(
    `select * from day_logs where user_id = $1 and log_date = $2`,
    [targetUserId, date],
  )
  const dayLog = logs[0]
  if (dayLog) {
    const [ex, ml] = await Promise.all([
      query(
        `select id, name, kcal, created_at from exercises where day_log_id = $1 order by created_at desc`,
        [dayLog.id],
      ),
      query(
        `select id, name, kcal, created_at from meals where day_log_id = $1 order by created_at desc`,
        [dayLog.id],
      ),
    ])
    const enriched = await enrichLogItemsWithReactions(
      viewerId,
      targetUserId,
      ex.rows,
      ml.rows,
    )
    exercises = enriched.exercises
    meals = enriched.meals
  }

  return {
    member: toPublicMember(profile, viewerId),
    date,
    snapshot,
    exercises,
    meals,
  }
}

export async function getCommunityUserMonth(viewerId, targetUserId, year, month) {
  const profile = await loadProfile(targetUserId)
  assertCanViewCommunity(profile, viewerId)

  const y = Number(year)
  const m = Number(month)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { rows: logs } = await query(
    `select * from day_logs where user_id = $1 and log_date >= $2 and log_date <= $3 order by log_date`,
    [targetUserId, from, to],
  )

  return {
    member: toPublicMember(profile, viewerId),
    year: y,
    month: m,
    logs,
    dailyBmr: resolveProfileBmr(profile),
    threshold: toKcal(profile.deficit_threshold),
    accountStartKey: accountStartKey(profile.created_at),
  }
}
