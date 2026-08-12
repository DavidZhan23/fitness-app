import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/ui/responsive'
import { useNutritionDay } from '../hooks/useNutritionDay'
import { scrollCommunityMainToTop } from '../lib/communityListCache'
import {
  MICRONUTRIENT_STATUS_LABELS,
  filterMicronutrientItems,
  micronutrientCatalogItem,
  micronutrientItemsForDisplay,
  type MicronutrientFilter,
} from '../lib/micronutrients'
import { formatDateKeyLabel } from '../lib/streaks'
import type { MicronutrientItem, MicronutrientStatus } from '../types'

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
}: {
  item: MicronutrientItem | null
  onClose: () => void
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

export function MicronutrientsPage() {
  const {
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
  } = useNutritionDay('/micronutrients')
  const [filter, setFilter] = useState<MicronutrientFilter>('all')
  const [selectedItem, setSelectedItem] = useState<MicronutrientItem | null>(
    null,
  )
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
              {status === 'pending' ? (
                <p
                  className="surface-card micronutrient-status micronutrient-status--pending"
                  role="status"
                >
                  正在根据今日饮食更新微量元素…
                  {summary ? ' 当前先显示上次结果。' : ''}
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
              {status === 'idle' && !summary ? (
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
        </>
      ) : null}

      <footer className="micronutrient-page-disclaimer">
        AI 估算，非检测/非医疗建议。
      </footer>

      <MicronutrientDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </PageShell>
  )
}
