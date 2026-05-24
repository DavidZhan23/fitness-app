import { computeDaySnapshot, loadProfile } from './community.js'
import {
  formatDateKeyInTz,
  isValidDateKey,
  yesterdayDateKey,
} from './dateKey.js'
import { query } from './db.js'

export function snapshotHasLogData(snapshot) {
  return (snapshot?.exerciseCount ?? 0) > 0 || (snapshot?.mealCount ?? 0) > 0
}

function accountStartKey(createdAt) {
  if (!createdAt) return null
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  return formatDateKeyInTz(d)
}

/** 昨日在账号开通日及之后才纳入「昨日是否打卡」判断 */
function shouldEnforceYesterday(yesterdayKey, profile) {
  const start = accountStartKey(profile?.created_at)
  if (!start) return true
  return yesterdayKey >= start
}

function resolveToday(clientToday) {
  return isValidDateKey(clientToday) ? clientToday : formatDateKeyInTz()
}

/** 昨日或今日任一有运动/饮食记录 */
export async function recentDaysHaveLog(profile, today) {
  const yesterday = yesterdayDateKey(today)
  const todaySnap = await computeDaySnapshot(profile, today)
  if (snapshotHasLogData(todaySnap)) return true

  if (!shouldEnforceYesterday(yesterday, profile)) return false

  const yesterdaySnap = await computeDaySnapshot(profile, yesterday)
  return snapshotHasLogData(yesterdaySnap)
}

/**
 * 同步社区公开状态：昨日与今日均无记录 → 自动未公开；
 * 任一日有记录 → 自动恢复/保持已公开。
 */
export async function syncCommunityVisibility(userId, clientToday) {
  const today = resolveToday(clientToday)
  const profile = await loadProfile(userId)
  if (!profile) return { community_visible: false, changed: false }

  const hasLog = await recentDaysHaveLog(profile, today)

  if (hasLog) {
    if (!profile.community_visible) {
      await query(
        `update profiles set community_visible = true, updated_at = now() where id = $1`,
        [userId],
      )
      return { community_visible: true, changed: true }
    }
    return { community_visible: Boolean(profile.community_visible), changed: false }
  }

  if (!profile.community_visible) {
    return { community_visible: false, changed: false }
  }

  await query(
    `update profiles set community_visible = false, updated_at = now() where id = $1`,
    [userId],
  )
  return { community_visible: false, changed: true }
}

export async function syncCommunityVisibilityAfterLogChange(userId, clientToday) {
  return syncCommunityVisibility(userId, clientToday)
}

/** 社区列表：无近日记录则未公开；当前用户始终保留在列表中 */
export async function applyYesterdayVisibilityRules(profiles, viewerId, today) {
  const members = []
  const seen = new Set()

  for (const profile of profiles) {
    if (seen.has(profile.id)) continue
    seen.add(profile.id)

    const todaySnap = await computeDaySnapshot(profile, today)
    const hasLog = await recentDaysHaveLog(profile, today)

    if (hasLog) {
      if (!profile.community_visible) {
        await query(
          `update profiles set community_visible = true, updated_at = now() where id = $1`,
          [profile.id],
        )
        profile.community_visible = true
      }
    } else if (profile.community_visible) {
      await query(
        `update profiles set community_visible = false, updated_at = now() where id = $1`,
        [profile.id],
      )
      profile.community_visible = false
    }

    if (!hasLog && profile.id !== viewerId) {
      continue
    }

    members.push({ ...profile, todaySnap })
  }

  return members
}
