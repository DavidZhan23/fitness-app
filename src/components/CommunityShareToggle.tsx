import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface CommunityShareToggleProps {
  /** 紧凑样式，用于社区页顶栏 */
  compact?: boolean
}

export function CommunityShareToggle({ compact = false }: CommunityShareToggleProps) {
  const { profile, updateProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const visible = Boolean(profile?.community_visible)

  const toggle = async () => {
    if (!profile || saving) return
    setSaving(true)
    try {
      await updateProfile({ community_visible: !visible })
    } finally {
      setSaving(false)
    }
  }

  if (compact) {
    const label = saving ? '…' : visible ? '已公开' : '未公开'
    return (
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={visible ? '社区已公开，点击关闭' : '社区未公开，点击开启'}
        disabled={saving}
        onClick={toggle}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-medium whitespace-nowrap transition ${
          visible
            ? 'bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/40'
            : 'bg-slate-800 text-muted ring-1 ring-slate-600'
        } disabled:opacity-50`}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${visible ? 'bg-violet-400' : 'bg-slate-500'}`}
        />
        <span className="shrink-0">{label}</span>
      </button>
    )
  }

  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-950/50 via-slate-800/80 to-slate-900/90 p-4 ring-1 ring-violet-500/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-100">社区公开</h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            开启后，其他用户可在社区看到你的<strong className="font-normal text-slate-300">今日缺口、运动与饮食记录</strong>、<strong className="font-normal text-slate-300">打卡墙</strong>，并可对你的每日打卡<strong className="font-normal text-slate-300">点赞与留言</strong>。体重等私密资料不会展示。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          disabled={saving}
          onClick={toggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
            visible ? 'bg-violet-500' : 'bg-slate-600'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              visible ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </section>
  )
}
