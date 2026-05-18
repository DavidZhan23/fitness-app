import type { ReactNode } from 'react'
import { BMR_FORMULA_NAME, resolveProfileMetabolism } from '../lib/calories'
import type { Profile } from '../types'

interface MetabolismSummaryProps {
  profile: Profile
}

export function MetabolismSummary({ profile }: MetabolismSummaryProps) {
  const { bmr } = resolveProfileMetabolism(profile)

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-card ring-1 ring-slate-600/40">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            基础代谢 BMR
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{BMR_FORMULA_NAME}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums leading-none text-brand">
            {bmr > 0 ? Math.round(bmr) : '—'}
          </p>
          <p className="mt-1 text-[10px] text-muted">kcal / 日</p>
        </div>
      </div>

      <div className="border-t border-slate-600/40 bg-slate-900/40 px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <FormulaCard
            symbol="♂"
            accent="text-sky-400"
            expr={
              <>
                10<Var>w</Var> + 6.25<Var>h</Var> − 5<Var>a</Var>
                <span className="text-brand"> + 5</span>
              </>
            }
          />
          <FormulaCard
            symbol="♀"
            accent="text-pink-400"
            expr={
              <>
                10<Var>w</Var> + 6.25<Var>h</Var> − 5<Var>a</Var>
                <span className="text-brand"> − 161</span>
              </>
            }
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">
          w 体重(kg) · h 身高(cm) · a 年龄
        </p>
      </div>
    </section>
  )
}

function FormulaCard({
  symbol,
  accent,
  expr,
}: {
  symbol: string
  accent: string
  expr: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-2.5 ring-1 ring-slate-700/50">
      <span className={`text-lg ${accent}`}>{symbol}</span>
      <p className="font-mono text-xs leading-relaxed text-slate-200">{expr}</p>
    </div>
  )
}

function Var({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 rounded bg-slate-700/80 px-1 py-0.5 text-brand">
      {children}
    </span>
  )
}
