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
 * 同步社区公开状态：有近日记录时自动开启 community_visible；
 * 开发者隐藏锁优先，任何自动同步都不得重新公开。
 */
export async function syncCommunityVisibility(userId, clientToday) {
  const today = resolveToday(clientToday)
  const profile = await loadProfile(userId)
  if (!profile) return { community_visible: false, changed: false }
  if (profile.community_visible_locked_by_developer) {
    return { community_visible: false, changed: false }
  }

  const hasLog = await recentDaysHaveLog(profile, today)

  if (hasLog) {
    if (!profile.community_visible) {
      const { rows } = await query(
        `update profiles
         set community_visible = true, updated_at = now()
         where id = $1
           and community_visible = false
           and community_visible_locked_by_developer = false
         returning community_visible`,
        [userId],
      )
      if (rows[0]) return { community_visible: true, changed: true }

      // 开发者可能在 snapshot 计算期间刚好加锁；重新读取后按最新状态返回。
      const latest = await loadProfile(userId)
      return {
        community_visible: Boolean(
          latest?.community_visible &&
            !latest?.community_visible_locked_by_developer,
        ),
        changed: false,
      }
    }
    return { community_visible: Boolean(profile.community_visible), changed: false }
  }

  return { community_visible: Boolean(profile.community_visible), changed: false }
}

export async function syncCommunityVisibilityAfterLogChange(userId, clientToday) {
  return syncCommunityVisibility(userId, clientToday)
}

/** 社区列表：为每位候选 profile 附加 today snapshot（只读，不改 community_visible） */
export async function applyYesterdayVisibilityRules(profiles, viewerId, today) {
  const members = []
  const seen = new Set()

  for (const profile of profiles) {
    if (seen.has(profile.id)) continue
    seen.add(profile.id)

    const todaySnap = await computeDaySnapshot(profile, today, new Date(), viewerId)
    members.push({ ...profile, todaySnap })
  }

  return members
}
