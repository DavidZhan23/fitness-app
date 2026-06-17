import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeveloperDevNav } from '../components/DeveloperDevNav'
import { httpData } from '../lib/api'
import type { DeveloperCommunityMember } from '../types'

type FilterMode = 'all' | 'visible' | 'hidden'

function matchesQuery(member: DeveloperCommunityMember, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    member.nickname.toLowerCase().includes(q) ||
    member.email.toLowerCase().includes(q)
  )
}

export function DeveloperCommunityPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<DeveloperCommunityMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [query, setQuery] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await httpData.listDeveloperCommunityMembers()
      setMembers(data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    return members.filter((member) => {
      if (!matchesQuery(member, query)) return false
      if (filter === 'visible') return member.communityVisible
      if (filter === 'hidden') return !member.communityVisible
      return true
    })
  }, [members, filter, query])

  const stats = useMemo(() => {
    const visible = members.filter((m) => m.communityVisible).length
    return {
      total: members.length,
      visible,
      hidden: members.length - visible,
    }
  }, [members])

  const toggleVisibility = async (member: DeveloperCommunityMember) => {
    if (busyIds.has(member.id)) return
    const next = !member.communityVisible
    setBusyIds((prev) => new Set(prev).add(member.id))
    setError('')
    try {
      await httpData.setDeveloperCommunityVisibility(member.id, next)
      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, communityVisible: next } : row,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setBusyIds((prev) => {
        const copy = new Set(prev)
        copy.delete(member.id)
        return copy
      })
    }
  }

  return (
    <div className="page-standalone">
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-8 pt-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-muted hover:text-slate-200"
            aria-label="返回设置"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">开发者后台</h1>
        </header>

        <DeveloperDevNav />

        <section className="surface-card developer-community-panel p-4">
          <h2 className="text-sm font-semibold text-primary">社区名片可见性</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            关闭后，该用户的社区名片对他人不可见（本人仍可在社区看到自己）。
            长期不用 App 的账号可在此隐藏。
          </p>
          <p className="developer-community-panel__stats mt-3 text-xs text-muted tabular-nums">
            共 {stats.total} 人 · 可见 {stats.visible} · 已隐藏 {stats.hidden}
          </p>

          <div className="developer-community-panel__toolbar mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索昵称或邮箱"
              className="input min-w-0 flex-1"
              aria-label="搜索用户"
            />
            <div className="developer-community-panel__filters flex gap-1">
              {(
                [
                  ['all', '全部'],
                  ['visible', '可见'],
                  ['hidden', '已隐藏'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`developer-community-panel__filter${filter === mode ? ' developer-community-panel__filter--active' : ''}`}
                  onClick={() => setFilter(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading && <p className="text-sm text-muted">加载中…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-muted">没有匹配的用户。</p>
        )}

        <ul className="developer-community-list space-y-2">
          {filtered.map((member) => {
            const busy = busyIds.has(member.id)
            return (
              <li key={member.id}>
                <div className="developer-community-row surface-card px-4 py-3">
                  <div className="developer-community-row__main min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      {member.nickname}
                    </p>
                    <p className="truncate text-xs text-muted">{member.email}</p>
                    {!member.onboardingComplete ? (
                      <p className="mt-1 text-[10px] text-amber-400">
                        未完成资料（本就不会出现在社区）
                      </p>
                    ) : null}
                  </div>
                  <label className="developer-community-row__toggle shrink-0">
                    <input
                      type="checkbox"
                      checked={member.communityVisible}
                      disabled={busy}
                      onChange={() => void toggleVisibility(member)}
                    />
                    <span className="developer-community-row__toggle-label text-xs">
                      {busy
                        ? '保存中…'
                        : member.communityVisible
                          ? '社区可见'
                          : '已隐藏'}
                    </span>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
