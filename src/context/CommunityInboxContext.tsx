import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { httpData } from '../lib/api'
import { syncAppIconBadge } from '../lib/appBadge'

const POLL_MS = 45_000

interface CommunityInboxContextValue {
  unreadCount: number
  interactionCount: number
  followersOnMe: number
  refresh: () => Promise<void>
  markRead: () => Promise<boolean>
  markItemRead: (inboxId: string) => Promise<void>
}

const CommunityInboxContext = createContext<CommunityInboxContextValue | null>(
  null,
)

function applyInteractionUnread(
  setInteractionUnread: (n: number) => void,
  count: number,
) {
  const n = Math.max(0, Math.trunc(count))
  setInteractionUnread(n)
  void syncAppIconBadge(n)
}

export function CommunityInboxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [interactionUnread, setInteractionUnread] = useState(0)
  const [followersOnMe, setFollowersOnMe] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      applyInteractionUnread(setInteractionUnread, 0)
      setFollowersOnMe(0)
      return
    }
    try {
      const data = await httpData.getCommunityInboxUnread()
      // 红点与「互动消息」入口同口径：仅互动类未读，不含粉丝关注
      applyInteractionUnread(setInteractionUnread, data.interactionCount)
      setFollowersOnMe(data.followersOnMe)
    } catch {
      /* 网络抖动时保留上次数字，避免红点闪烁 */
    }
  }, [user])

  const markRead = useCallback(async (): Promise<boolean> => {
    if (!user) return false
    try {
      await httpData.markCommunityInboxRead()
      applyInteractionUnread(setInteractionUnread, 0)
      setFollowersOnMe(0)
      return true
    } catch {
      return false
    }
  }, [user])

  const markItemRead = useCallback(
    async (inboxId: string) => {
      if (!user) return
      setInteractionUnread((prev) => {
        const optimistic = Math.max(0, prev - 1)
        void syncAppIconBadge(optimistic)
        return optimistic
      })
      try {
        await httpData.markCommunityInboxItemRead(inboxId)
        await refresh()
      } catch {
        await refresh()
      }
    },
    [refresh, user],
  )

  useEffect(() => {
    if (!user) {
      applyInteractionUnread(setInteractionUnread, 0)
      setFollowersOnMe(0)
      return
    }
    void refresh()
    const pollId = window.setInterval(() => void refresh(), POLL_MS)
    const onFocus = () => void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(pollId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, user])

  /* 切换页面（含离开互动消息页）后立即对齐服务端未读数 */
  useEffect(() => {
    if (user) void refresh()
  }, [pathname, refresh, user])

  const value: CommunityInboxContextValue = {
    unreadCount: interactionUnread,
    interactionCount: interactionUnread,
    followersOnMe,
    refresh,
    markRead,
    markItemRead,
  }

  return (
    <CommunityInboxContext.Provider value={value}>
      {children}
    </CommunityInboxContext.Provider>
  )
}

export function useCommunityInbox(): CommunityInboxContextValue {
  const ctx = useContext(CommunityInboxContext)
  if (!ctx) {
    throw new Error('useCommunityInbox must be used within CommunityInboxProvider')
  }
  return ctx
}
