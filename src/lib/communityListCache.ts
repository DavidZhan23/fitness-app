import type { CommunityFilter } from '../components/CommunitySegment'
import type { CommunityDaySnapshot, CommunityMember } from '../types'

const STORAGE_KEY = 'fitness-community-list-cache'
const PREVIEW_KEY = 'fitness-community-user-preview'
const TTL_MS = 15 * 60 * 1000

type FilterSlice = {
  members: CommunityMember[]
  savedAt: number
}

/** v2：按筛选分别缓存，切换 tab 可即时展示 */
export interface CommunityListCache {
  version: 2
  activeFilter: CommunityFilter
  members: CommunityMember[]
  followingCount: number
  scrollY: number
  savedAt: number
  byFilter: Partial<Record<CommunityFilter, FilterSlice>>
}

export interface CommunityUserPreview {
  userId: string
  nickname: string
  isSelf: boolean
  isFollowing: boolean
  todayLikeCount: number
  viewerLikedToday: boolean
  today: CommunityDaySnapshot
  savedAt: number
}

/** 内存备份，避免 sessionStorage 读写时序问题 */
let memoryCache: CommunityListCache | null = null
let memoryPreview: CommunityUserPreview | null = null

type LegacyCommunityListCache = {
  filter: CommunityFilter
  members: CommunityMember[]
  followingCount: number
  scrollY: number
  savedAt: number
}

function isExpired(savedAt: number) {
  return Date.now() - savedAt > TTL_MS
}

function normalizeListCache(raw: unknown): CommunityListCache | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = raw as Partial<CommunityListCache & LegacyCommunityListCache>
  if (parsed.version === 2 && parsed.activeFilter && parsed.byFilter) {
    if (isExpired(parsed.savedAt ?? 0)) return null
    return parsed as CommunityListCache
  }
  if (parsed.filter && Array.isArray(parsed.members) && parsed.savedAt) {
    if (isExpired(parsed.savedAt)) return null
    return {
      version: 2,
      activeFilter: parsed.filter,
      members: parsed.members,
      followingCount: parsed.followingCount ?? 0,
      scrollY: parsed.scrollY ?? 0,
      savedAt: parsed.savedAt,
      byFilter: {
        [parsed.filter]: {
          members: parsed.members,
          savedAt: parsed.savedAt,
        },
      },
    }
  }
  return null
}

function readRawListCache(): CommunityListCache | null {
  const candidates: unknown[] = [memoryCache]
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) candidates.push(JSON.parse(raw))
  } catch {
    /* ignore */
  }

  for (const candidate of candidates) {
    const normalized = normalizeListCache(candidate)
    if (normalized) {
      memoryCache = normalized
      return normalized
    }
  }

  memoryCache = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return null
}

export function saveCommunityListCache(
  data: Omit<CommunityListCache, 'savedAt' | 'version' | 'byFilter'> & {
    byFilter?: Partial<Record<CommunityFilter, FilterSlice>>
  },
) {
  const existing = readRawListCache()
  const now = Date.now()
  const byFilter: Partial<Record<CommunityFilter, FilterSlice>> = {
    ...(existing?.byFilter ?? {}),
    ...(data.byFilter ?? {}),
    [data.activeFilter]: {
      members: data.members,
      savedAt: now,
    },
  }
  const payload: CommunityListCache = {
    version: 2,
    activeFilter: data.activeFilter,
    members: data.members,
    followingCount: data.followingCount,
    scrollY: data.scrollY,
    savedAt: now,
    byFilter,
  }
  memoryCache = payload
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* 存储满等 */
  }
}

/** 今日打卡变更后调用，避免列表仍展示旧的缺口/成就快照 */
export function invalidateCommunityListCache() {
  memoryCache = null
  memoryPreview = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(PREVIEW_KEY)
  } catch {
    /* ignore */
  }
}

export function loadCommunityListCache(): CommunityListCache | null {
  return readRawListCache()
}

export function loadCommunityFilterCache(
  filter: CommunityFilter,
): CommunityMember[] | null {
  const cache = readRawListCache()
  if (!cache) return null
  const slice = cache.byFilter[filter]
  if (!slice || isExpired(slice.savedAt)) return null
  return slice.members
}

function patchMemberFollowStatus(
  members: CommunityMember[],
  userId: string,
  isFollowing: boolean,
  filter: CommunityFilter,
  sourceMember?: CommunityMember,
): CommunityMember[] {
  const hasMember = members.some((m) => m.id === userId)
  if (!hasMember) {
    if (filter === 'following' && isFollowing && sourceMember) {
      return [sourceMember, ...members]
    }
    return members
  }
  const patched = members.map((m) =>
    m.id === userId ? { ...m, isFollowing } : m,
  )
  if (filter === 'following' && !isFollowing) {
    return patched.filter((m) => m.id !== userId)
  }
  return patched
}

function patchMemberLikeStats(
  members: CommunityMember[],
  userId: string,
  stats: { likeCount: number; viewerLiked: boolean },
): CommunityMember[] {
  const hasMember = members.some((m) => m.id === userId)
  if (!hasMember) return members
  return members.map((m) =>
    m.id === userId
      ? {
          ...m,
          todayLikeCount: stats.likeCount,
          viewerLikedToday: stats.viewerLiked,
        }
      : m,
  )
}

/** 关注/取消关注后同步各 tab 缓存中的 isFollowing，避免切换「全部」仍显示已关注 */
export function syncFollowStatusInCommunityListCache(
  userId: string,
  isFollowing: boolean,
  opts: {
    activeFilter: CommunityFilter
    activeMembers: CommunityMember[]
    followingCount: number
    scrollY: number
  },
) {
  const cache = readRawListCache()
  const now = Date.now()
  const sourceMember = opts.activeMembers.find((m) => m.id === userId)
  const byFilter: Partial<Record<CommunityFilter, FilterSlice>> = {
    ...(cache?.byFilter ?? {}),
    [opts.activeFilter]: {
      members: opts.activeMembers,
      savedAt: now,
    },
  }

  for (const filter of ['all', 'following'] as CommunityFilter[]) {
    if (filter === opts.activeFilter) continue
    const slice = byFilter[filter]
    if (!slice) continue
    byFilter[filter] = {
      members: patchMemberFollowStatus(
        slice.members,
        userId,
        isFollowing,
        filter,
        sourceMember,
      ),
      savedAt: now,
    }
  }

  saveCommunityListCache({
    activeFilter: opts.activeFilter,
    members: opts.activeMembers,
    followingCount: opts.followingCount,
    scrollY: opts.scrollY,
    byFilter,
  })
}

/** 自己的今日公开状态变更后，同步各 tab 缓存，避免切换「全部/关注」顶栏开关不一致 */
export function patchSelfDayCommunityVisible(
  members: CommunityMember[],
  visible: boolean,
): CommunityMember[] {
  return members.map((m) =>
    m.isSelf
      ? {
          ...m,
          today: {
            ...m.today,
            dayCommunityVisible: visible,
            hidden: false,
          },
        }
      : m,
  )
}

export function syncSelfDayVisibleInCommunityListCache(
  visible: boolean,
  opts: {
    activeFilter: CommunityFilter
    activeMembers: CommunityMember[]
    followingCount: number
    scrollY: number
  },
) {
  const cache = readRawListCache()
  const now = Date.now()
  const byFilter: Partial<Record<CommunityFilter, FilterSlice>> = {
    ...(cache?.byFilter ?? {}),
    [opts.activeFilter]: {
      members: opts.activeMembers,
      savedAt: now,
    },
  }

  for (const filter of ['all', 'following'] as CommunityFilter[]) {
    if (filter === opts.activeFilter) continue
    const slice = byFilter[filter]
    if (!slice) continue
    byFilter[filter] = {
      members: patchSelfDayCommunityVisible(slice.members, visible),
      savedAt: now,
    }
  }

  saveCommunityListCache({
    activeFilter: opts.activeFilter,
    members: opts.activeMembers,
    followingCount: opts.followingCount,
    scrollY: opts.scrollY,
    byFilter,
  })
}

/** 点赞/取消点赞后同步各 tab 缓存中的今日点赞状态，避免切换列表出现旧数据 */
export function syncLikeStatsInCommunityListCache(
  userId: string,
  stats: { likeCount: number; viewerLiked: boolean },
  opts: {
    activeFilter: CommunityFilter
    activeMembers: CommunityMember[]
    followingCount: number
    scrollY: number
  },
) {
  const cache = readRawListCache()
  const now = Date.now()
  const byFilter: Partial<Record<CommunityFilter, FilterSlice>> = {
    ...(cache?.byFilter ?? {}),
    [opts.activeFilter]: {
      members: opts.activeMembers,
      savedAt: now,
    },
  }

  for (const filter of ['all', 'following'] as CommunityFilter[]) {
    if (filter === opts.activeFilter) continue
    const slice = byFilter[filter]
    if (!slice) continue
    byFilter[filter] = {
      members: patchMemberLikeStats(slice.members, userId, stats),
      savedAt: now,
    }
  }

  saveCommunityListCache({
    activeFilter: opts.activeFilter,
    members: opts.activeMembers,
    followingCount: opts.followingCount,
    scrollY: opts.scrollY,
    byFilter,
  })
}

export function saveCommunityUserPreview(member: CommunityMember) {
  const payload: CommunityUserPreview = {
    userId: member.id,
    nickname: member.nickname,
    isSelf: member.isSelf,
    isFollowing: member.isFollowing,
    todayLikeCount: member.todayLikeCount,
    viewerLikedToday: member.viewerLikedToday,
    today: member.today,
    savedAt: Date.now(),
  }
  memoryPreview = payload
  try {
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function loadCommunityUserPreview(
  userId: string,
): CommunityUserPreview | null {
  const candidates: (CommunityUserPreview | null)[] = [memoryPreview]
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    if (raw) candidates.push(JSON.parse(raw) as CommunityUserPreview)
  } catch {
    /* ignore */
  }

  for (const parsed of candidates) {
    if (!parsed || parsed.userId !== userId) continue
    if (isExpired(parsed.savedAt)) continue
    memoryPreview = parsed
    return parsed
  }
  return null
}

export function restoreCommunityMainScroll(scrollY: number) {
  if (scrollY <= 0) return
  const el = document.querySelector('.app-main')
  if (!el) return

  let attempts = 0
  const apply = () => {
    el.scrollTop = scrollY
    attempts += 1
    if (attempts < 8 && Math.abs(el.scrollTop - scrollY) > 2) {
      requestAnimationFrame(apply)
    }
  }
  requestAnimationFrame(apply)
}

export function getCommunityMainElement() {
  return document.querySelector('.app-main')
}
