import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import { syncAppIconBadge } from '../lib/appBadge'

const POLL_MS = 45_000
const INBOX_DEFER_MS = 2_000

export function useCommunityInbox() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      await syncAppIconBadge(0)
      return
    }
    try {
      const { count } = await httpData.getCommunityInboxUnread()
      setUnreadCount(count)
      await syncAppIconBadge(count)
    } catch {
      /* 网络抖动时保留上次数字 */
    }
  }, [user])

  const markRead = useCallback(async () => {
    if (!user) return
    try {
      await httpData.markCommunityInboxRead()
      setUnreadCount(0)
      await syncAppIconBadge(0)
    } catch {
      /* ignore */
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
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

  return { unreadCount, refresh, markRead }
}
