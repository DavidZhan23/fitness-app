import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/ui/responsive'
import { useNutritionDay } from '../hooks/useNutritionDay'
import { scrollCommunityMainToTop } from '../lib/communityListCache'
import {
  MICRONUTRIENT_STATUS_LABELS,
  filterMicronutrientItems,
  mealMicronutrientEstimateLines,
  mealMicronutrientRowStatus,
  micronutrientCatalogItem,
  micronutrientItemsForDisplay,
  type MicronutrientFilter,
} from '../lib/micronutrients'
import {
  formatMicronutrientAmount,
  resolveMicronutrientTargets,
} from '../lib/micronutrientTargets'
import { formatDateKeyLabel } from '../lib/streaks'
import type {
  Meal,
  MicronutrientId,
  MicronutrientItem,
  MicronutrientStatus,
  Profile,
} from '../types'

const SEGMENT_FILTERS: { id: MicronutrientFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'low', label: '可能不足' },
  { id: 'vitamins', label: '维生素' },
  { id: 'minerals', label: '矿物质' },
]

const SUMMARY_STATUSES: { status: MicronutrientStatus; label: string }[] = [
  { status: 'low', label: '可能不足' },
  { status: 'unknown', label: '信息不足' },
  { status: 'adequate', label: '可能充足' },
]

function MicronutrientDetailSheet({
  item,
  onClose,
  onOpenReference,
}: {
  item: MicronutrientItem | null
  onClose: () => void
  onOpenReference: (id: MicronutrientId) => void
}) {
  const [educationOpen, setEducationOpen] = useState<'role' | 'foods' | null>(
    null,
  )
  const catalogItem = item ? micronutrientCatalogItem(item.id) : null

  useEffect(() => {
    setEducationOpen(null)
  }, [item?.id])

  useEffect(() => {
    if (!item) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [item, onClose])

  if (!item || !catalogItem) return null

  return createPortal(
    <div
      className="micronutrient-detail-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="micronutrient-detail-title"
    >
      <button
        type="button"
        className="micronutrient-detail-sheet__backdrop"
        aria-label="关闭微量元素详情"
        onClick={onClose}
      />
      <article className="micronutrient-detail-sheet__panel">
        <header className="micronutrient-detail-sheet__header">
          <div>
            <p>{catalogItem.group}</p>
            <h2 id="micronutrient-detail-title">{catalogItem.label}</h2>
          </div>
          <button
            type="button"
            className="micronutrient-detail-sheet__close"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="micronutrient-detail-sheet__body">
          <div className="micronutrient-detail-sheet__today" data-status={item.status}>
            <span aria-hidden />
            <strong>今日：{MICRONUTRIENT_STATUS_LABELS[item.status]}</strong>
          </div>
          {item.note ? (
            <p className="micronutrient-detail-sheet__note">{item.note}</p>
          ) : null}

          {item.estimated_pct != null || item.dri_amount != null ? (
            <section className="micronutrient-estimate">
              <div className="micronutrient-estimate__head">
                <strong>今日估算 vs 参考值</strong>
                <button
                  type="button"
                  className="micronutrient-estimate__ref"
                  onClick={() => onOpenReference(item.id)}
                >
                  参考
                </button>
              </div>
              <div
                className="micronutrient-estimate__bar"
                role="meter"
                aria-label="估算占参考值比例"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(0, Math.round(item.estimated_pct ?? 0))}
              >
                <i
                  style={{
                    width: `${Math.max(0, Math.min(item.estimated_pct ?? 0, 100))}%`,
                  }}
                />
              </div>
              <p>
                约达参考值 {item.estimated_pct == null ? '—' : `${Math.round(item.estimated_pct)}%`}
                {item.dri_amount
                  ? `（参考 ${formatMicronutrientAmount(item.dri_amount, item.unit ?? 'mg')}）`
                  : ''}
                。估算，非检测。
              </p>
            </section>
          ) : null}

          {item.status === 'low' && item.food_suggestions?.length ? (
            <section className="micronutrient-detail-sheet__ai-advice">
              <h3>结合今日饮食的建议</h3>
              <ul>
                {item.food_suggestions.slice(0, 3).map((food) => (
                  <li key={food}>{food}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div
            className="micronutrient-detail-sheet__education-tabs"
            role="group"
            aria-label={`${catalogItem.label}科普内容`}
          >
            <button
              type="button"
              aria-expanded={educationOpen === 'role'}
              onClick={() =>
                setEducationOpen((current) =>
                  current === 'role' ? null : 'role',
                )
              }
            >
              人体作用
            </button>
            <button
              type="button"
              aria-expanded={educationOpen === 'foods'}
              onClick={() =>
                setEducationOpen((current) =>
                  current === 'foods' ? null : 'foods',
                )
              }
            >
              常见食物
            </button>
          </div>

          {educationOpen ? (
            <section
              className="micronutrient-detail-sheet__education"
              aria-live="polite"
            >
              <h3>{educationOpen === 'role' ? '人体作用' : '常见食物'}</h3>
              <p>
                {educationOpen === 'role' ? catalogItem.role : catalogItem.foods}
              </p>
            </section>
          ) : (
            <p className="micronutrient-detail-sheet__education-hint">
              选择一项，查看简短的家庭营养科普。
            </p>
          )}
        </div>
      </article>
    </div>,
    document.body,
  )
}

function MicronutrientReferenceSheet({
  open,
  highlightId,
  profile,
  onClose,
}: {
  open: boolean
  highlightId: MicronutrientId | null
  profile: Profile | null | undefined
  onClose: () => void
}) {
  const targets = useMemo(() => resolveMicronutrientTargets(profile), [profile])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !highlightId) return
    document
      .getElementById(`dri-row-${highlightId}`)
      ?.scrollIntoView({ block: 'center' })
  }, [highlightId, open])

  if (!open) return null

  return createPortal(
    <div
      className="micronutrient-detail-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="micronutrient-dri-title"
    >
      <button
        type="button"
        className="micronutrient-detail-sheet__backdrop"
        aria-label="关闭参考摄入量"
        onClick={onClose}
      />
      <article className="micronutrient-detail-sheet__panel">
        <header className="micronutrient-detail-sheet__header">
          <div>
            <p>{targets.label}</p>
            <h2 id="micronutrient-dri-title">参考摄入量</h2>
          </div>
          <button
            type="button"
            className="micronutrient-detail-sheet__close"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="micronutrient-detail-sheet__body">
          <p className="micronutrient-dri-disclaimer">
            按性别与年龄档给出的膳食参考值，供对照今日估算，不是医嘱或检测标准。
          </p>
          <ul className="micronutrient-dri-list">
            {targets.items.map((target) => {
              const catalogItem = micronutrientCatalogItem(
                target.id as MicronutrientId,
              )
              const highlighted = highlightId === target.id
              return (
                <li
                  key={target.id}
                  id={`dri-row-${target.id}`}
                  data-highlight={highlighted ? 'true' : undefined}
                >
                  <span>{catalogItem?.label ?? target.id}</span>
                  <strong>
                    {formatMicronutrientAmount(target.amount, target.unit)}
                  </strong>
                </li>
              )
            })}
          </ul>
        </div>
      </article>
    </div>,
    document.body,
  )
}

const ROW_STATUS_LABELS = {
  ready: '已估算',
  pending: '估算中',
  error: '失败',
} as const

function MicronutrientFoodRow({
  meal,
  dayStatus,
  expanded,
  onToggle,
}: {
  meal: Meal
  dayStatus: string | null | undefined
  expanded: boolean
  onToggle: () => void
}) {
  const rowStatus = mealMicronutrientRowStatus(meal, dayStatus)
  const estimates = mealMicronutrientEstimateLines(meal)
  return (
    <li
      className="micronutrient-food-row"
      data-status={rowStatus}
      data-expanded={expanded ? 'true' : 'false'}
    >
      <button
        type="button"
        className="micronutrient-food-row__toggle"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="micronutrient-food-row__heading">
          <strong>{meal.name}</strong>
          <span className="micronutrient-food-row__meta">
            <em>{ROW_STATUS_LABELS[rowStatus]}</em>
            <span className="micronutrient-food-row__expand-label">
              {expanded ? '收起' : '展开'}
            </span>
          </span>
        </span>
      </button>
      {expanded ? (
        <>
          {rowStatus === 'ready' && estimates.length > 0 ? (
            <ul className="micronutrient-food-row__amounts">
              {estimates.map((estimate) => (
                <li key={estimate.id}>
                  <span>{estimate.label}</span>
                  <strong>{estimate.amountText}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          {rowStatus === 'ready' && estimates.length === 0 ? (
            <p className="micronutrient-food-row__note">
              这道菜没有估出有效的微量元素数量。
            </p>
          ) : null}
          {rowStatus === 'pending' ? (
            <p className="micronutrient-food-row__note">
              算完后会显示这道菜的微量元素估算量。
            </p>
          ) : null}
          {rowStatus === 'error' ? (
            <p className="micronutrient-food-row__note">
              这道菜还没有算出微量元素，可点上方重试。
            </p>
          ) : null}
        </>
      ) : null}
    </li>
  )
}

export function MicronutrientsPage() {
  const {
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
    goToDate,
    mealLogHref,
    micronutrientRetrying,
    micronutrientRetryError,
    retryMicronutrients,
    nutritionEstimating,
  } = useNutritionDay('/micronutrients')
  const [filter, setFilter] = useState<MicronutrientFilter>('all')
  const [selectedItem, setSelectedItem] = useState<MicronutrientItem | null>(
    null,
  )
  const [driOpen, setDriOpen] = useState(false)
  const [driHighlightId, setDriHighlightId] = useState<MicronutrientId | null>(
    null,
  )
  const [expandedMealIds, setExpandedMealIds] = useState<string[]>([])
  const summary = dayLog?.micronutrient_summary
  const items = useMemo(() => micronutrientItemsForDisplay(summary), [summary])
  const filteredItems = useMemo(
    () => filterMicronutrientItems(items, filter),
    [filter, items],
  )
  const counts = useMemo(
    () =>
      Object.fromEntries(
        SUMMARY_STATUSES.map(({ status }) => [
          status,
          items.filter((item) => item.status === status).length,
        ]),
      ) as Record<MicronutrientStatus, number>,
    [items],
  )
  const status = dayLog?.micronutrient_status ?? 'idle'

  useEffect(() => {
    setFilter('all')
    setSelectedItem(null)
    setDriOpen(false)
    setDriHighlightId(null)
    setExpandedMealIds([])
    scrollCommunityMainToTop()
  }, [dateKey])

  return (
    <PageShell className="micronutrients-page-shell">
      <header className="surface-card micronutrients-page-header">
        <div>
          <Link
            to={
              dateKey === today
                ? '/nutrition'
                : `/nutrition?date=${encodeURIComponent(dateKey)}`
            }
            className="micronutrients-page-header__back"
          >
            ← 营养
          </Link>
          <p>每日营养素</p>
          <h1>微量元素</h1>
          <button
            type="button"
            className="micronutrients-page-header__dri"
            onClick={() => {
              setDriHighlightId(null)
              setDriOpen(true)
            }}
          >
            参考摄入量
          </button>
          <span>{formatDateKeyLabel(dateKey)}</span>
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
          <button
            type="button"
            onClick={() => goToDate(next)}
            disabled={dateKey >= today}
          >
            ›
          </button>
        </div>
      </header>

      {loading ? <p className="py-10 text-center text-muted">加载中…</p> : null}
      {error ? (
        <p className="surface-card p-4 text-danger">
          {error}{' '}
          <button
            type="button"
            className="text-brand underline"
            onClick={() => void loadDay()}
          >
            重试
          </button>
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          {meals.length === 0 ? (
            <section className="surface-card micronutrient-empty">
              <p>这一天还没有餐食，暂不调用 AI。</p>
              <Link to={mealLogHref} className="btn-primary">去记饮食</Link>
            </section>
          ) : (
            <>
              {nutritionEstimating ? (
                <p
                  className="surface-card micronutrient-status micronutrient-status--pending"
                  role="status"
                >
                  正在根据今日饮食更新微量元素…
                  {summary ? ' 当前先显示上次结果，新食物算完后会自动刷新。' : ''}
                </p>
              ) : null}
              {status === 'error' ? (
                <div
                  className="surface-card micronutrient-status micronutrient-status--error"
                  role="alert"
                >
                  <p>
                    {dayLog?.micronutrient_error || '微量元素更新失败，请稍后重试'}
                    {summary ? '；保留的结果可能已过期。' : ''}
                  </p>
                  <button
                    type="button"
                    className="nutrition-reassess-btn"
                    disabled={micronutrientRetrying}
                    onClick={() => void retryMicronutrients()}
                  >
                    {micronutrientRetrying ? '重试中…' : '重试'}
                  </button>
                </div>
              ) : null}
              {status === 'idle' && !summary && !nutritionEstimating ? (
                <div className="surface-card micronutrient-status">
                  <p>微量元素快照尚未生成。</p>
                  <button
                    type="button"
                    className="nutrition-reassess-btn"
                    disabled={micronutrientRetrying}
                    onClick={() => void retryMicronutrients()}
                  >
                    {micronutrientRetrying ? '生成中…' : '立即生成'}
                  </button>
                </div>
              ) : null}
              {micronutrientRetryError ? (
                <p className="surface-card p-4 text-sm text-danger">
                  {micronutrientRetryError}
                </p>
              ) : null}
            </>
          )}

          {summary ? (
            <>
              <section className="micronutrient-summary-chips" aria-label="微量元素状态摘要">
                {SUMMARY_STATUSES.map(({ status: summaryStatus, label }) => (
                  <button
                    key={summaryStatus}
                    type="button"
                    data-status={summaryStatus}
                    aria-pressed={filter === summaryStatus}
                    onClick={() =>
                      setFilter((current) =>
                        current === summaryStatus ? 'all' : summaryStatus,
                      )
                    }
                  >
                    <strong>{counts[summaryStatus]}</strong>
                    <span>{label}</span>
                  </button>
                ))}
              </section>

              {summary.advice ? (
                <p className="surface-card micronutrient-page-advice">
                  {summary.advice}
                </p>
              ) : null}

              <section className="surface-card micronutrient-browser">
                <div className="micronutrient-filter-tabs" role="group" aria-label="筛选微量元素">
                  {SEGMENT_FILTERS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={filter === option.id}
                      onClick={() => setFilter(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {filteredItems.length > 0 ? (
                  <div className="micronutrient-compact-grid">
                    {filteredItems.map((item) => {
                      const catalogItem = micronutrientCatalogItem(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-status={item.status}
                          aria-label={`${catalogItem?.label ?? item.id}，${MICRONUTRIENT_STATUS_LABELS[item.status]}`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <strong>{catalogItem?.shortLabel ?? item.id}</strong>
                          <span>
                            <i aria-hidden />
                            {MICRONUTRIENT_STATUS_LABELS[item.status]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="micronutrient-filter-empty">当前筛选没有项目。</p>
                )}
              </section>
            </>
          ) : null}

          {meals.length > 0 ? (
            <section className="surface-card micronutrient-food-list">
              <div className="nutrition-card__heading">
                <div>
                  <p className="nutrition-card__eyebrow">按餐核对</p>
                  <h2>今日食物</h2>
                </div>
              </div>
              <ul>
                {meals.map((meal) => (
                  <MicronutrientFoodRow
                    key={meal.id}
                    meal={meal}
                    dayStatus={status}
                    expanded={expandedMealIds.includes(meal.id)}
                    onToggle={() =>
                      setExpandedMealIds((current) =>
                        current.includes(meal.id)
                          ? current.filter((id) => id !== meal.id)
                          : [...current, meal.id],
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <footer className="micronutrient-page-disclaimer">
        AI 估算，非检测/非医疗建议。
      </footer>

      <MicronutrientDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onOpenReference={(id) => {
          setDriHighlightId(id)
          setDriOpen(true)
        }}
      />
      <MicronutrientReferenceSheet
        open={driOpen}
        highlightId={driHighlightId}
        profile={profile}
        onClose={() => {
          setDriOpen(false)
          setDriHighlightId(null)
        }}
      />
    </PageShell>
  )
}
