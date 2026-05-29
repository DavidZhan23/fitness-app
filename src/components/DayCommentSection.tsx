import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { RecordDeleteButton } from './RecordActionIcons'
import { LikeHeartButton } from './LikeHeartButton'
import { UserAvatar } from './UserAvatar'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import type { DayComment } from '../types'

interface DayCommentSectionProps {
  userId: string
  date: string
  comments: DayComment[]
  onCommentsChange?: (comments: DayComment[]) => void
}

interface CommentThread {
  root: DayComment
  replies: DayComment[]
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function compareByTimeAsc(a: DayComment, b: DayComment) {
  const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  if (delta !== 0) return delta
  return a.id.localeCompare(b.id)
}

function buildThreads(comments: DayComment[]): CommentThread[] {
  const roots = comments.filter((c) => !c.parentCommentId).sort(compareByTimeAsc)
  const repliesByRoot = new Map<string, DayComment[]>()
  for (const c of comments) {
    if (!c.parentCommentId) continue
    const list = repliesByRoot.get(c.parentCommentId) ?? []
    list.push(c)
    repliesByRoot.set(c.parentCommentId, list)
  }
  return roots.map((root) => ({
    root,
    replies: (repliesByRoot.get(root.id) ?? []).sort(compareByTimeAsc),
  }))
}

function countAll(comments: DayComment[]) {
  return comments.length
}

export function DayCommentSection({
  userId,
  date,
  comments: initialComments,
  onCommentsChange,
}: DayCommentSectionProps) {
  const { profile } = useAuth()
  const isAppleTouch = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    return (
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
  }, [])
  const [comments, setComments] = useState(initialComments)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<{
    commentId: string
    nickname: string
  } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<DayComment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null)
  const commentRefs = useRef(new Map<string, HTMLLIElement>())
  const inputRef = useRef<HTMLInputElement>(null)
  const composeRef = useRef<HTMLDivElement>(null)

  const threads = useMemo(() => buildThreads(comments), [comments])
  const enableDock = Boolean(replyTo && !isAppleTouch)

  useEffect(() => {
    setComments(initialComments)
    setBody('')
    setReplyTo(null)
    setError('')
  }, [initialComments, userId, date])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv || !enableDock) return

    const syncKeyboardOffset = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty(
        '--comment-compose-kb',
        `${kb}px`,
      )
    }

    syncKeyboardOffset()
    vv.addEventListener('resize', syncKeyboardOffset)
    vv.addEventListener('scroll', syncKeyboardOffset)
    return () => {
      vv.removeEventListener('resize', syncKeyboardOffset)
      vv.removeEventListener('scroll', syncKeyboardOffset)
      document.documentElement.style.removeProperty('--comment-compose-kb')
    }
  }, [enableDock])

  const updateComments = (next: DayComment[]) => {
    setComments(next)
    onCommentsChange?.(next)
  }

  const send = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError('')
    try {
      const comment = await httpData.postCommunityComment(
        userId,
        date,
        trimmed,
        replyTo?.commentId ?? null,
      )
      const next = [...comments, comment]
      updateComments(next)
      setBody('')
      setReplyTo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    const commentId = pendingDelete.id
    setDeleting(true)
    setError('')
    try {
      await httpData.deleteCommunityComment(commentId)
      const next = comments.filter(
        (c) => c.id !== commentId && c.parentCommentId !== commentId,
      )
      updateComments(next)
      if (replyTo?.commentId === commentId) setReplyTo(null)
      setPendingDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const deleteMessage = (c: DayComment) => {
    const preview =
      c.body.length > 48 ? `${c.body.slice(0, 48)}…` : c.body
    const hasReplies = comments.some((x) => x.parentCommentId === c.id)
    let msg = `「${preview}」删除后无法恢复`
    if (hasReplies) msg += '，其下的回复也会一并删除'
    return `${msg}，确定要继续吗？`
  }

  const startReply = (comment: DayComment) => {
    setReplyTo({
      commentId: comment.id,
      nickname: comment.authorNickname,
    })
    requestAnimationFrame(() => {
      const input = inputRef.current
      const compose = composeRef.current
      if (!input) return
      if (isAppleTouch) {
        compose?.scrollIntoView({ block: 'nearest' })
        window.setTimeout(() => {
          input.focus()
        }, 60)
        return
      }
      commentRefs.current
        .get(comment.id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      try {
        input.focus({ preventScroll: true })
      } catch {
        input.focus()
      }
    })
  }

  const toggleCommentLike = async (comment: DayComment) => {
    if (likingCommentId) return
    setLikingCommentId(comment.id)
    setError('')
    try {
      const stats = comment.viewerLiked
        ? await httpData.unlikeCommunityComment(comment.id)
        : await httpData.likeCommunityComment(comment.id)
      const next = comments.map((x) =>
        x.id === comment.id
          ? { ...x, likeCount: stats.likeCount, viewerLiked: stats.viewerLiked }
          : x,
      )
      updateComments(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : '点赞失败')
    } finally {
      setLikingCommentId(null)
    }
  }

  const renderComment = (c: DayComment, isReply: boolean) => (
    <li
      key={c.id}
      ref={(el) => {
        if (el) commentRefs.current.set(c.id, el)
        else commentRefs.current.delete(c.id)
      }}
      className={`community-comment-row ${isReply ? 'community-comment-row--reply' : ''}`}
    >
      <UserAvatar
        size="sm"
        nickname={c.authorNickname}
        avatarUrl={c.authorAvatarUrl}
        className="community-comment-row__avatar"
      />
      <div className="community-comment-row__main min-w-0 flex-1">
        <div className="community-comment-row__head flex items-start gap-2">
          <p className="min-w-0 flex-1 text-xs leading-snug">
            <span className="community-comment-author font-medium">
              {c.authorNickname}
            </span>
            {c.replyToNickname && (
              <>
                <span className="text-muted"> 回复 </span>
                <span className="community-comment-reply-to">
                  @{c.replyToNickname}
                </span>
              </>
            )}
            <span className="text-muted"> · {formatTime(c.createdAt)}</span>
          </p>
          <LikeHeartButton
            active={c.viewerLiked}
            count={c.likeCount}
            disabled={likingCommentId === c.id}
            size="sm"
            layout="column"
            className="community-comment-row__like shrink-0"
            onClick={() => void toggleCommentLike(c)}
          />
        </div>
        <p className="community-comment-row__body mt-1 text-sm leading-relaxed text-primary">
          {c.body}
        </p>
        <div className="community-comment-actions mt-1.5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => startReply(c)}
            className="community-comment-action text-xs"
          >
            回复
          </button>
          {c.isOwn && (
            <RecordDeleteButton onClick={() => setPendingDelete(c)} />
          )}
        </div>
      </div>
    </li>
  )

  const compose = (
    <div
      ref={composeRef}
      id="day-comment-compose"
      className={`community-comment-compose scroll-mt-4 flex items-center gap-2${
        enableDock ? ' community-comment-compose--dock' : ''
      }`}
    >
      <UserAvatar
        size="sm"
        profile={profile}
        isSelf
        className="shrink-0"
      />
      <input
        ref={inputRef}
        type="text"
        value={body}
        maxLength={280}
        placeholder={
          replyTo ? `回复 @${replyTo.nickname}…` : '写一句鼓励…'
        }
        disabled={sending}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setReplyTo(null)
            return
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void send()
          }
        }}
        className="input min-h-0 flex-1 rounded-full py-2.5 text-sm"
      />
      <button
        type="button"
        disabled={sending || !body.trim()}
        onClick={() => void send()}
        className="btn-primary shrink-0 rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-40 active:scale-95"
      >
        {sending ? '…' : replyTo ? '回复' : '发送'}
      </button>
    </div>
  )

  return (
    <section
      className={`community-comment-section space-y-3${
        enableDock ? ' community-comment-section--replying' : ''
      }`}
    >
      <ConfirmDialog
        open={pendingDelete != null}
        title="永久删除这条评论？"
        message={pendingDelete ? deleteMessage(pendingDelete) : ''}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
      <h2 className="text-sm font-medium text-primary">
        评论 {countAll(comments) > 0 && `(${countAll(comments)})`}
      </h2>

      {threads.length === 0 ? (
        <p
          className="rounded-xl border border-dashed py-6 text-center text-sm text-muted"
          style={{ borderColor: 'var(--surface-card-border)' }}
        >
          还没有评论，写一句鼓励吧
        </p>
      ) : (
        <ul className="community-comment-list divide-y divide-[var(--surface-card-border)]">
          {threads.map(({ root, replies }) => (
            <li key={root.id} className="community-comment-thread py-3 first:pt-0">
              <ul className="space-y-3">
                {renderComment(root, false)}
                {replies.map((r) => renderComment(r, true))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {compose}
      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  )
}
