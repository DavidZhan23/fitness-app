import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
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

  const threads = useMemo(() => buildThreads(comments), [comments])

  useEffect(() => {
    setComments(initialComments)
    setBody('')
    setReplyTo(null)
    setError('')
  }, [initialComments, userId, date])

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
      className={`rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50 ${
        isReply ? 'ml-4 border-l-2 border-violet-500/25 pl-3' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            <span className="font-medium text-violet-200/90">
              {c.authorNickname}
            </span>
            {c.replyToNickname && (
              <span className="text-slate-400">
                {' '}
                回复{' '}
                <span className="text-violet-200/80">@{c.replyToNickname}</span>
              </span>
            )}
            <span className="mx-1.5">·</span>
            {formatTime(c.createdAt)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{c.body}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!c.isOwn && (
            <button
              type="button"
              disabled={likingCommentId === c.id}
              onClick={() => void toggleCommentLike(c)}
              className={`text-xs ${
                c.viewerLiked
                  ? 'text-amber-300 hover:text-amber-200'
                  : 'text-muted hover:text-slate-200'
              } disabled:opacity-40`}
            >
              👍 {c.likeCount}
            </button>
          )}
          <button
            type="button"
            onClick={() => startReply(c)}
            className="text-xs text-violet-300/90 hover:text-violet-200"
          >
            回复
          </button>
          {c.isOwn && (
            <button
              type="button"
              onClick={() => setPendingDelete(c)}
              className="text-xs text-muted hover:text-red-400"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </li>
  )

  return (
    <section className="space-y-3">
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
      <h2 className="text-sm font-medium text-slate-200">
        评论 {countAll(comments) > 0 && `(${countAll(comments)})`}
      </h2>

      {threads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-600 py-6 text-center text-sm text-muted">
          还没有评论，写一句鼓励吧
        </p>
      ) : (
        <ul className="space-y-3">
          {threads.map(({ root, replies }) => (
            <li key={root.id} className="space-y-2">
              <ul className="space-y-2">
                {renderComment(root, false)}
                {replies.map((r) => renderComment(r, true))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {replyTo && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-violet-950/40 px-3 py-2 text-xs text-violet-200/90 ring-1 ring-violet-500/25">
          <span>
            正在回复 <span className="font-medium">@{replyTo.nickname}</span>
          </span>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="shrink-0 text-muted hover:text-slate-200"
          >
            取消
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          maxLength={280}
          placeholder={
            replyTo ? `回复 @${replyTo.nickname}…` : '写一句鼓励…'
          }
          disabled={sending}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          className="input min-h-0 flex-1 py-2.5 text-sm"
        />
        <button
          type="button"
          disabled={sending || !body.trim()}
          onClick={send}
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-40 active:scale-95"
        >
          {sending ? '…' : replyTo ? '回复' : '发送'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  )
}
