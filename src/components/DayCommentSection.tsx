import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'
import type { DayComment } from '../types'

interface DayCommentSectionProps {
  userId: string
  date: string
  comments: DayComment[]
  onCommentsChange?: (comments: DayComment[]) => void
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function DayCommentSection({
  userId,
  date,
  comments: initialComments,
  onCommentsChange,
}: DayCommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setComments(initialComments)
    setBody('')
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
      const comment = await httpData.postCommunityComment(userId, date, trimmed)
      const next = [...comments, comment]
      updateComments(next)
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  const remove = async (commentId: string) => {
    try {
      await httpData.deleteCommunityComment(commentId)
      updateComments(comments.filter((c) => c.id !== commentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-slate-200">
        评论 {comments.length > 0 && `(${comments.length})`}
      </h2>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-600 py-6 text-center text-sm text-muted">
          还没有评论，写一句鼓励吧
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    <span className="font-medium text-violet-200/90">
                      {c.authorNickname}
                    </span>
                    <span className="mx-1.5">·</span>
                    {formatTime(c.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-100 leading-relaxed">
                    {c.body}
                  </p>
                </div>
                {c.isOwn && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="shrink-0 text-xs text-muted hover:text-red-400"
                  >
                    删除
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          maxLength={280}
          placeholder="写一句鼓励…"
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
          {sending ? '…' : '发送'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  )
}
