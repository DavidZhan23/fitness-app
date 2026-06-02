import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import { syncAppIconBadge } from '../lib/appBadge'

const POLL_MS = 45_000
const INBOX_DEFER_MS = 2_000

export function useCommunityInbox() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [interactionCount, setInteractionCount] = useState(0)
  const [followersOnMe, setFollowersOnMe] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      setInteractionCount(0)
      setFollowersOnMe(0)
      await syncAppIconBadge(0)
      return
    }
    try {
      const data = await httpData.getCommunityInboxUnread()
      // 互动入口只展示互动类消息，提醒数字也保持同口径，避免“看不到的 +1”
      setUnreadCount(data.interactionCount)
      setInteractionCount(data.interactionCount)
      setFollowersOnMe(data.followersOnMe)
      await syncAppIconBadge(data.interactionCount)
    } catch {
      /* 网络抖动时保留上次数字 */
    }
  }, [user])

  const markRead = useCallback(async () => {
    if (!user) return
    try {
      await httpData.markCommunityInboxRead()
      setUnreadCount(0)
      setInteractionCount(0)
      setFollowersOnMe(0)
      await syncAppIconBadge(0)
    } catch {
      /* ignore */
    }
  }, [user])

  const markItemRead = useCallback(
    async (inboxId: string) => {
      if (!user) return
      try {
        await httpData.markCommunityInboxItemRead(inboxId)
        await refresh()
      } catch {
        /* ignore */
      }
    },
    [refresh, user],
  )

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      setInteractionCount(0)
      setFollowersOnMe(0)
      void syncAppIconBadge(0)
      return
    }
    const deferId = window.setTimeout(() => void refresh(), INBOX_DEFER_MS)
    const pollId = window.setInterval(() => void refresh(), POLL_MS)
    const onFocus = () => void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(deferId)
      window.clearInterval(pollId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, user])

  return {
    unreadCount,
    interactionCount,
    followersOnMe,
    refresh,
    markRead,
    markItemRead,
  }
}
