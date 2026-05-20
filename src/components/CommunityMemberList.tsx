import { useEffect, useRef, useState } from 'react'
import { CommunityDragHandle } from './CommunityDragHandle'
import { CommunityMemberCard } from './CommunityMemberCard'
import { httpData } from '../lib/api'
import {
  memberIdsForOrder,
  reorderCommunityMembers,
} from '../lib/communityMemberOrder'
import type { CommunityMember, Profile } from '../types'

interface CommunityMemberListProps {
  members: CommunityMember[]
  todayKey: string
  viewerProfile?: Profile | null
  sortable?: boolean
  onMembersChange: (members: CommunityMember[]) => void
  onFollowChange?: (userId: string, following: boolean) => void
  onLikeChange?: (
    userId: string,
    stats: { likeCount: number; viewerLiked: boolean },
  ) => void
}

export function CommunityMemberList({
  members,
  todayKey,
  viewerProfile,
  sortable = false,
  onMembersChange,
  onFollowChange,
  onLikeChange,
}: CommunityMemberListProps) {
  const [localMembers, setLocalMembers] = useState(members)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const membersRef = useRef(localMembers)
  membersRef.current = localMembers

  useEffect(() => {
    if (!draggingId) setLocalMembers(members)
  }, [members, draggingId])

  const othersCount = localMembers.filter((m) => !m.isSelf).length
  const showHandles = sortable && othersCount > 0

  const startDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    memberId: string,
  ) => {
    if (saving) return
    e.preventDefault()
    e.stopPropagation()

    setDraggingId(memberId)
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault()
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const row = el?.closest('[data-member-row]') as HTMLElement | null
      const overId = row?.dataset.memberId
      if (!overId || overId === memberId) return

      const list = membersRef.current
      const over = list.find((m) => m.id === overId)
      if (!over || over.isSelf) return

      const next = reorderCommunityMembers(list, memberId, overId)
      if (next === list) return
      membersRef.current = next
      setLocalMembers(next)
    }

    const endDrag = async () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      document.body.style.userSelect = ''
      setDraggingId(null)

      const final = membersRef.current
      const ids = memberIdsForOrder(final)

      setSaving(true)
      setStatus('')
      try {
        await httpData.saveCommunityMemberOrder(ids)
        onMembersChange(final)
        setStatus('顺序已保存')
        window.setTimeout(() => setStatus(''), 2000)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '保存失败，已恢复')
        membersRef.current = members
        setLocalMembers(members)
      } finally {
        setSaving(false)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  return (
    <>
      {showHandles && saving && (
        <p className="text-xs text-muted">正在保存顺序…</p>
      )}
      {status && (
        <p
          className={`text-xs ${status.includes('失败') ? 'text-red-400' : 'text-violet-300'}`}
        >
          {status}
        </p>
      )}
      <ul className="space-y-3">
        {localMembers.map((m) => {
          const dragging = draggingId === m.id
          return (
            <li
              key={m.id}
              data-member-row
              data-member-id={m.id}
              className={`flex items-stretch ${dragging ? 'relative z-10' : ''}`}
            >
              {showHandles && !m.isSelf && (
                <CommunityDragHandle
                  disabled={saving}
                  onPointerDown={(e) => startDrag(e, m.id)}
                />
              )}
              {showHandles && m.isSelf && (
                <div
                  className="w-9 shrink-0 rounded-l-2xl bg-transparent"
                  aria-hidden
                />
              )}
              <div
                className={`min-w-0 flex-1 ${showHandles ? 'rounded-r-2xl' : ''} ${dragging ? 'shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/40' : ''}`}
              >
                <CommunityMemberCard
                  member={m}
                  todayKey={todayKey}
                  viewerProfile={viewerProfile}
                  onFollowChange={onFollowChange}
                  onLikeChange={onLikeChange}
                  isDragging={dragging}
                  sortLocked={draggingId !== null}
                  roundedLeft={!showHandles}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
