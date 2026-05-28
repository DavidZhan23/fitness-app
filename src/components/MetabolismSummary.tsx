import type { ReactNode } from 'react'
import { BMR_FORMULA_NAME, resolveProfileMetabolism } from '../lib/calories'
import type { Profile, Sex } from '../types'

interface MetabolismSummaryProps {
  profile: Profile
  variant?: 'card' | 'embedded'
}

export function MetabolismSummary({
  profile,
  variant = 'card',
}: MetabolismSummaryProps) {
  const { bmr } = resolveProfileMetabolism(profile)
  const sex = profile.sex

  if (variant === 'embedded') {
    return (
      <div className="mt-3 border-t border-slate-600/40 pt-3">
        <div className="overflow-hidden rounded-xl border border-slate-600/40">
          <div className="flex items-start justify-between gap-4 px-3 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                基础代谢 BMR
              </p>
              <p className="bmr-formula-subtitle mt-0.5 text-xs">
                {BMR_FORMULA_NAME}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="bmr-value text-3xl font-bold tabular-nums leading-none">
                {bmr > 0 ? Math.round(bmr) : '—'}
              </p>
              <p className="mt-1 text-[10px] text-muted">kcal / 日</p>
            </div>
          </div>

          <div className="bmr-formula-panel px-3 py-3">
            {sex === 'male' || sex === 'female' ? (
              <FormulaCard sex={sex} expr={formulaExpr(sex)} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <FormulaCard sex="male" expr={formulaExpr('male')} />
                <FormulaCard sex="female" expr={formulaExpr('female')} />
              </div>
            )}
            <p className="bmr-formula-legend mt-2 text-center text-[10px]">
              w 体重(kg) · h 身高(cm) · a 年龄
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            基础代谢 BMR
          </p>
          <p className="bmr-formula-subtitle mt-0.5 text-xs">{BMR_FORMULA_NAME}</p>
        </div>
        <div className="text-right">
          <p className="bmr-value text-3xl font-bold tabular-nums leading-none">
            {bmr > 0 ? Math.round(bmr) : '—'}
          </p>
          <p className="mt-1 text-[10px] text-muted">kcal / 日</p>
        </div>
      </div>

      <div className="bmr-formula-panel px-4 py-3">
        {sex === 'male' || sex === 'female' ? (
          <FormulaCard sex={sex} expr={formulaExpr(sex)} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <FormulaCard sex="male" expr={formulaExpr('male')} />
            <FormulaCard sex="female" expr={formulaExpr('female')} />
          </div>
        )}
        <p className="bmr-formula-legend mt-2 text-center text-[10px]">
          w 体重(kg) · h 身高(cm) · a 年龄
        </p>
      </div>
    </section>
  )
}

function formulaExpr(sex: Sex): ReactNode {
  if (sex === 'male') {
    return (
      <>
        10<Var>w</Var> + 6.25<Var>h</Var> − 5<Var>a</Var>
        <span className="bmr-formula-constant"> + 5</span>
      </>
    )
  }
  return (
    <>
      10<Var>w</Var> + 6.25<Var>h</Var> − 5<Var>a</Var>
      <span className="bmr-formula-constant"> − 161</span>
    </>
  )
}

function FormulaCard({ sex, expr }: { sex: Sex; expr: ReactNode }) {
  const symbol = sex === 'male' ? '♂' : '♀'
  const sexClass =
    sex === 'male' ? 'bmr-formula-sex--male' : 'bmr-formula-sex--female'

  return (
    <div className="bmr-formula-card flex items-center gap-2 px-3 py-2.5">
      <span className={`text-lg ${sexClass}`}>{symbol}</span>
      <p className="bmr-formula-text font-mono text-xs leading-relaxed">{expr}</p>
    </div>
  )
}

function Var({ children }: { children: ReactNode }) {
  return (
    <span className="bmr-formula-var mx-0.5 px-1 py-0.5">{children}</span>
  )
}
