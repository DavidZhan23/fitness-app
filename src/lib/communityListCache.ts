import type { CommunityFilter } from '../components/CommunitySegment'
import type { CommunityMember } from '../types'

const STORAGE_KEY = 'fitness-community-list-cache'
const TTL_MS = 15 * 60 * 1000

export interface CommunityListCache {
  filter: CommunityFilter
  members: CommunityMember[]
  followingCount: number
  scrollY: number
  savedAt: number
}

/** 内存备份，避免 sessionStorage 读写时序问题 */
let memoryCache: CommunityListCache | null = null

export function saveCommunityListCache(
  data: Omit<CommunityListCache, 'savedAt'>,
) {
  const payload: CommunityListCache = { ...data, savedAt: Date.now() }
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
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadCommunityListCache(): CommunityListCache | null {
  const candidates: (CommunityListCache | null)[] = [memoryCache]
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) candidates.push(JSON.parse(raw) as CommunityListCache)
  } catch {
    /* ignore */
  }

  for (const parsed of candidates) {
    if (!parsed) continue
    if (Date.now() - parsed.savedAt > TTL_MS) continue
    memoryCache = parsed
    return parsed
  }

  memoryCache = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
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
