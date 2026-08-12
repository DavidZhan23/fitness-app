import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/ui/responsive'
import { useNutritionDay } from '../hooks/useNutritionDay'
import { httpData } from '../lib/api'
import { backfillMealMacros } from '../lib/dayLogService'
import { scrollCommunityMainToTop } from '../lib/communityListCache'
import {
  MACRO_STATUS_LABELS,
  MACRO_TARGET_TIERS,
  calculateMacroTargets,
  compareMacroToTarget,
  macroEnergyKcal,
  needsMealMacroBackfill,
  summarizeMealMacros,
  type MacroAmounts,
  type MacroField,
  type MacroTargetTier,
} from '../lib/macroTargets'
import {
  micronutrientItemsForDisplay,
} from '../lib/micronutrients'
import { formatDateKeyLabel } from '../lib/streaks'
import type { DayLog, Meal } from '../types'

const MACRO_META: {
  field: MacroField
  label: string
  shortLabel: string
  kcalPerGram: number
}[] = [
  { field: 'protein_g', label: '蛋白质', shortLabel: '蛋白', kcalPerGram: 4 },
  { field: 'fat_g', label: '脂肪', shortLabel: '脂肪', kcalPerGram: 9 },
  { field: 'carbs_g', label: '碳水', shortLabel: '碳水', kcalPerGram: 4 },
]

function grams(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function formatGrams(value: unknown): string {
  const amount = grams(value)
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1)
}

function MacroDonut({ totals }: { totals: MacroAmounts }) {
  const radius = 68
  const circumference = 2 * Math.PI * radius
  const totalEnergy = macroEnergyKcal(totals)
  let offset = 0

  return (
    <div className="macro-chart-layout">
      <div className="macro-chart-wrap">
        <svg
          className="macro-chart"
          viewBox="0 0 180 180"
          role="img"
          aria-label="今日蛋白质、脂肪与碳水占比"
        >
          <circle className="macro-chart__track" cx="90" cy="90" r={radius} />
          {MACRO_META.map((macro) => {
            const energy = totals[macro.field] * macro.kcalPerGram
            const length = totalEnergy > 0 ? energy / totalEnergy * circumference : 0
            const currentOffset = offset
            offset += length
            return (
              <circle
                key={macro.field}
                className={`macro-chart__segment macro-chart__segment--${macro.field.replace('_g', '')}`}
                cx="90"
                cy="90"
                r={radius}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-currentOffset}
              />
            )
          })}
        </svg>
        <div className="macro-chart__center">
          <strong>
            {formatGrams(totals.protein_g + totals.fat_g + totals.carbs_g)}g
          </strong>
          <span>宏量总克数</span>
        </div>
      </div>

      <div className="macro-legend">
        {MACRO_META.map((macro) => {
          const energy = totals[macro.field] * macro.kcalPerGram
          const percent = totalEnergy > 0 ? Math.round(energy / totalEnergy * 100) : 0
          return (
            <div className="macro-legend__row" key={macro.field}>
              <span
                className={`macro-legend__dot macro-legend__dot--${macro.field.replace('_g', '')}`}
                aria-hidden
              />
              <span>{macro.label}</span>
              <strong>{formatGrams(totals[macro.field])}g · {percent}%</strong>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddedSugarCard({
  actual,
  target,
  backfillPending,
}: {
  actual: number
  target: number
  backfillPending: boolean
}) {
  const withinTarget = actual <= target
  const progress = Math.min(100, actual / 50 * 100)
  const targetMarker = Math.min(100, target / 50 * 100)

  return (
    <section className="surface-card nutrition-card nutrition-added-sugar-card">
      <div className="nutrition-card__heading">
        <div>
          <p className="nutrition-card__eyebrow">单独记录</p>
          <h2>添加糖</h2>
        </div>
        <em
          className="nutrition-added-sugar-card__status"
          data-status={withinTarget ? 'near' : 'high'}
        >
          {withinTarget ? '范围内' : '已超出'}
        </em>
      </div>
      {backfillPending ? (
        <p className="nutrition-backfill-status" role="status">
          正在后台按新口径重新估算旧餐食的添加糖…
        </p>
      ) : null}
      <div className="nutrition-added-sugar-card__amount">
        <strong>{formatGrams(actual)}g</strong>
        <span>本档目标 ≤ {formatGrams(target)}g</span>
      </div>
      <div
        className="added-sugar-progress"
        aria-label={`已记录 ${formatGrams(actual)} 克添加糖`}
      >
        <span className="added-sugar-progress__fill" style={{ width: `${progress}%` }} />
        <i style={{ left: `${targetMarker}%` }} aria-hidden />
      </div>
      <div className="nutrition-added-sugar-card__scale" aria-hidden>
        <span>0g</span>
        <span>推荐 25g</span>
        <span>上限 50g</span>
      </div>
      <p className="nutrition-added-sugar-card__reference">
        健康成人每日添加糖不宜超过 50g，最好控制在 25g 以下。
        这里记作为配料加入的蔗糖、葡萄糖、果糖、糖浆、蜂蜜等；
        完整水果和牛奶中天然存在的糖不记。添加糖在营养学上仍属于碳水，
        本页只是单独追踪，不重复计算热量。
      </p>
      <p className="nutrition-added-sugar-card__label-tip">
        包装上优先抄「添加糖」；若只写「糖」，该数值可能还含乳糖或水果天然糖，需结合配料表判断。
      </p>
    </section>
  )
}

function MicronutrientEntryCard({
  dayLog,
  mealCount,
  dateKey,
}: {
  dayLog: DayLog | null
  mealCount: number
  dateKey: string
}) {
  const summary = dayLog?.micronutrient_summary
  const items = micronutrientItemsForDisplay(summary)
  const lowCount = items.filter((item) => item.status === 'low').length
  const status = dayLog?.micronutrient_status ?? 'idle'
  const statusText =
    mealCount === 0
      ? '当天暂无餐食'
      : status === 'pending'
        ? '更新中…'
        : status === 'error'
          ? summary
            ? `更新失败 · ${lowCount} 项可能不足`
            : '更新失败，可前往重试'
          : summary
            ? lowCount > 0
              ? `${lowCount} 项可能不足`
              : '16 项已估算'
            : '等待生成'

  return (
    <section className="surface-card nutrition-card micronutrient-entry-card">
      <div className="nutrition-card__heading">
        <div>
          <p className="nutrition-card__eyebrow">整日 AI 快照</p>
          <h2>微量元素</h2>
        </div>
        <Link
          to={`/micronutrients?date=${encodeURIComponent(dateKey)}`}
          className="micronutrient-entry-card__link"
        >
          查看详情
        </Link>
      </div>
      <p className="micronutrient-entry-card__summary" data-status={status}>
        <span aria-hidden />
        {statusText}
      </p>
    </section>
  )
}

function MealMacroLine({ meal }: { meal: Meal }) {
  const addedSugar = meal.sugar_scope === 'added' ? meal.sugar_g : null
  const hasAnyMacro = [meal.protein_g, meal.fat_g, meal.carbs_g, addedSugar].some(
    (value) => value != null,
  )
  const pending = [meal.protein_g, meal.fat_g, meal.carbs_g, addedSugar].some(
    (value) => value == null,
  )
  const sourceLabel =
    meal.macros_source === 'ai'
      ? 'AI 补全'
      : meal.macros_source === 'user'
        ? '手动填写'
        : null
  return (
    <li className="nutrition-meal-row">
      <div className="nutrition-meal-row__heading">
        <strong>{meal.name}</strong>
        <span>{Math.round(Number(meal.kcal) || 0)} kcal</span>
      </div>
      <p className="nutrition-meal-row__macros">
        蛋白 {meal.protein_g == null ? '—' : `${formatGrams(meal.protein_g)}g`} ·{' '}
        脂肪 {meal.fat_g == null ? '—' : `${formatGrams(meal.fat_g)}g`} ·{' '}
        碳水 {meal.carbs_g == null ? '—' : `${formatGrams(meal.carbs_g)}g`} ·{' '}
        添加糖 {addedSugar == null ? '—' : `${formatGrams(addedSugar)}g`}
      </p>
      <p className="nutrition-meal-row__source">
        {!hasAnyMacro
          ? '待补全'
          : sourceLabel
            ? `${sourceLabel}${pending ? ' · 部分待补全' : ''}`
            : pending
              ? '部分待补全'
              : '已填写'}
      </p>
    </li>
  )
}

export function NutritionPage() {
  const {
    user,
    profile,
    today,
    dateKey,
    accountStart,
    previous,
    next,
    dayLog,
    meals,
    loading,
    error,
    loadDay,
    refreshDay,
    goToDate,
    mealLogHref,
  } = useNutritionDay('/nutrition')
  const [targetTier, setTargetTier] = useState<MacroTargetTier>('normal')
  const ruleTargets = useMemo(
    () => calculateMacroTargets(profile, targetTier),
    [profile, targetTier],
  )
  const [targets, setTargets] = useState(ruleTargets)
  const [aiAdvice, setAiAdvice] = useState('')
  const [adviceError, setAdviceError] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [backfillPending, setBackfillPending] = useState(false)
  const backfillDatesRef = useRef(new Set<string>())

  const totals = useMemo(() => summarizeMealMacros(meals), [meals])
  const hasChartData = macroEnergyKcal(totals) > 0

  useEffect(() => {
    setTargets(ruleTargets)
    setAiAdvice('')
    setAdviceError('')
    scrollCommunityMainToTop()
  }, [ruleTargets, dateKey])

  useEffect(() => {
    if (
      loading ||
      !user ||
      !profile ||
      backfillDatesRef.current.has(dateKey) ||
      !meals.some(needsMealMacroBackfill)
    ) {
      return
    }

    backfillDatesRef.current.add(dateKey)
    setBackfillPending(true)
    let cancelled = false
    void (async () => {
      try {
        await backfillMealMacros(dateKey)
        if (!cancelled) await refreshDay()
      } catch {
        // Best effort: keep the meal visible and retry on a future page visit.
      } finally {
        if (!cancelled) setBackfillPending(false)
      }
    })()
    return () => {
      cancelled = true
      setBackfillPending(false)
    }
  }, [dateKey, loading, meals, profile, refreshDay, user])

  const requestAdvice = async () => {
    setAdviceLoading(true)
    setAdviceError('')
    try {
      const result = await httpData.getMacroAdvice(totals, ruleTargets)
      setTargets({
        ...result.targets,
        sugar_g: ruleTargets.sugar_g,
        ...(targetTier === 'low-oil-sugar' ? { fat_g: 30 } : {}),
      })
      setAiAdvice(result.advice)
    } catch (err) {
      setAdviceError(err instanceof Error ? err.message : '重新评估失败')
    } finally {
      setAdviceLoading(false)
    }
  }

  return (
    <PageShell className="nutrition-page-shell">
      <header className="nutrition-page-header surface-card">
        <div>
          <p className="nutrition-page-header__eyebrow">每日营养素</p>
          <h1>{formatDateKeyLabel(dateKey)}</h1>
        </div>
        <div className="nutrition-date-nav" aria-label="切换日期">
          <button
            type="button"
            onClick={() => goToDate(previous)}
            disabled={Boolean(accountStart && previous < accountStart)}
          >
            ‹
          </button>
          {dateKey !== today ? (
            <button type="button" onClick={() => goToDate(today)}>今天</button>
          ) : (
            <span>今天</span>
          )}
          <button type="button" onClick={() => goToDate(next)} disabled={dateKey >= today}>
            ›
          </button>
        </div>
      </header>

      {loading ? <p className="py-10 text-center text-muted">加载中…</p> : null}
      {error ? (
        <p className="surface-card p-4 text-danger">
          {error}{' '}
          <button type="button" className="text-brand underline" onClick={() => void loadDay()}>
            重试
          </button>
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="surface-card nutrition-card">
            <div className="nutrition-card__heading">
              <div>
                <p className="nutrition-card__eyebrow">今日构成</p>
                <h2>蛋白 · 脂肪 · 碳水</h2>
              </div>
            </div>
            {hasChartData ? (
              <MacroDonut totals={totals} />
            ) : (
              <div className="nutrition-empty">
                <div className="nutrition-empty__ring" aria-hidden />
                <p>这一天还没有可汇总的营养素</p>
                <span>AI 补全失败的餐食仍会正常保存，可稍后编辑补充。</span>
                <Link to={mealLogHref} className="btn-primary">去记饮食</Link>
              </div>
            )}
          </section>

          <AddedSugarCard
            actual={totals.sugar_g}
            target={targets.sugar_g}
            backfillPending={backfillPending}
          />

          <MicronutrientEntryCard
            dayLog={dayLog}
            mealCount={meals.length}
            dateKey={dateKey}
          />

          <section className="surface-card nutrition-card">
            <div className="nutrition-card__heading">
              <div>
                <p className="nutrition-card__eyebrow">建议对照</p>
                <h2>实际 vs 今日建议</h2>
              </div>
              <button
                type="button"
                className="nutrition-reassess-btn"
                onClick={() => void requestAdvice()}
                disabled={adviceLoading}
              >
                {adviceLoading ? '评估中…' : '重新评估'}
              </button>
            </div>
            <div className="macro-target-tiers" role="group" aria-label="油糖建议档次">
              {MACRO_TARGET_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  aria-pressed={targetTier === tier.id}
                  onClick={() => setTargetTier(tier.id)}
                >
                  {tier.label}
                </button>
              ))}
            </div>
            <div className="macro-target-list">
              {MACRO_META.map(
                (macro) => {
                  const actual = totals[macro.field]
                  const target = targets[macro.field]
                  const status = compareMacroToTarget(actual, target)
                  const progress = target > 0 ? Math.min(100, actual / target * 100) : 0
                  return (
                    <div className="macro-target-row" key={macro.field}>
                      <div className="macro-target-row__label">
                        <span>{macro.label}</span>
                        <strong>{formatGrams(actual)}g / {formatGrams(target)}g</strong>
                        <em data-status={status}>{MACRO_STATUS_LABELS[status]}</em>
                      </div>
                      <div className="macro-progress">
                        <span
                          className={`macro-progress__fill macro-progress__fill--${macro.field.replace('_g', '')}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                },
              )}
            </div>
            <p className="nutrition-rule-note">
              {MACRO_TARGET_TIERS.find((tier) => tier.id === targetTier)?.description}；
              接近为目标上下 10%。
            </p>
            {aiAdvice ? <p className="nutrition-ai-advice">{aiAdvice}</p> : null}
            {adviceError ? <p className="text-sm text-danger">{adviceError}</p> : null}
          </section>

          <section className="surface-card nutrition-card">
            <div className="nutrition-card__heading">
              <div>
                <p className="nutrition-card__eyebrow">餐食明细</p>
                <h2>{meals.length} 餐</h2>
              </div>
              {meals.length > 0 ? (
                <Link to={dateKey === today ? '/' : `/?date=${encodeURIComponent(dateKey)}`} className="text-sm text-brand">
                  去今日页编辑
                </Link>
              ) : null}
            </div>
            {meals.length > 0 ? (
              <ul className="nutrition-meal-list">
                {meals.map((meal) => <MealMacroLine key={meal.id} meal={meal} />)}
              </ul>
            ) : (
              <p className="text-sm text-muted">当天还没有餐食记录。</p>
            )}
          </section>
        </>
      ) : null}
    </PageShell>
  )
}
