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

/** 仅当「昨日」在账号开通日及之后才执行未打卡隐藏 */
function shouldEnforceYesterday(yesterdayKey, profile) {
  const start = accountStartKey(profile?.created_at)
  if (!start) return true
  return yesterdayKey >= start
}

function resolveToday(clientToday) {
  return isValidDateKey(clientToday) ? clientToday : formatDateKeyInTz()
}

/**
 * 次日规则：若昨日既无运动也无饮食，则将 community_visible 设为 false。
 * 当日无记录不影响公开状态。
 */
export async function hideCommunityIfYesterdayEmpty(userId, clientToday) {
  const today = resolveToday(clientToday)
  const yesterday = yesterdayDateKey(today)
  const profile = await loadProfile(userId)
  if (!profile) return { community_visible: false, changed: false }

  if (!shouldEnforceYesterday(yesterday, profile)) {
    return { community_visible: Boolean(profile.community_visible), changed: false }
  }

  const snap = await computeDaySnapshot(profile, yesterday)
  if (snapshotHasLogData(snap)) {
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
  return hideCommunityIfYesterdayEmpty(userId, clientToday)
}

/** 社区列表：对每位成员检查昨日是否空档，并构建今日快照 */
export async function applyYesterdayVisibilityRules(profiles, viewerId, today) {
  const yesterday = yesterdayDateKey(today)
  const members = []

  for (const profile of profiles) {
    if (!shouldEnforceYesterday(yesterday, profile)) {
      const todaySnap = await computeDaySnapshot(profile, today)
      members.push({ ...profile, todaySnap })
      continue
    }

    const yesterdaySnap = await computeDaySnapshot(profile, yesterday)
    if (!snapshotHasLogData(yesterdaySnap)) {
      if (profile.community_visible) {
        await query(
          `update profiles set community_visible = false, updated_at = now() where id = $1`,
          [profile.id],
        )
        profile.community_visible = false
      }
      continue
    }

    const todaySnap = await computeDaySnapshot(profile, today)
    members.push({ ...profile, todaySnap })
  }

  return members
}
