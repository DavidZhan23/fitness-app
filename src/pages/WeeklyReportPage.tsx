import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import foxImage from '../assets/daji-fox-companion-cutout.webp'
import { WeeklyReportSharePanel } from '../components/WeeklyReportSharePanel'
import {
  WeeklyReportErrorBoundary,
  WeeklyReportScaffold,
} from '../components/WeeklyReportScaffold'
import { PageShell } from '../components/ui/responsive'
import { httpData } from '../lib/api'
import { formatWeeklyDateLabel, normalizeUserWeeklyReport } from '../lib/userWeeklyReport'
import type { UserWeeklyReport, WeeklyDeficitLevel, WeeklyDeficitStatus } from '../types'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const DEFICIT_COPY: Record<WeeklyDeficitLevel, string> = {
  unknown: '有效饮食或身体资料不足，缺口暂不下结论。',
  too_low: '这一周更接近维持节奏，先把记录稳定下来就很好。',
  mild: '温和缺口，适合继续观察身体反馈。',
  good: '缺口处在相对稳健的区间，记得同时照顾恢复。',
  aggressive: '缺口偏大，下周请优先保证进食、睡眠和恢复。',
}
const STATUS_LABEL: Record<WeeklyDeficitStatus, string> = {
  surplus: '盈余',
  mild: '温和',
  good: '稳健',
  aggressive: '偏高',
  unknown: '待补充',
}

function numberOrDash(value: number | null | undefined) {
  return value == null ? '—' : Math.round(value).toLocaleString('zh-CN')
}

function deltaCopy(value: number | null, suffix = '') {
  if (value == null) return null
  if (value === 0) return '与上周持平'
  return `比上周${value > 0 ? '+' : ''}${Math.round(value).toLocaleString('zh-CN')}${suffix}`
}

function suggestionIcon(type: UserWeeklyReport['nextWeekSuggestions'][number]['type']) {
  return { exercise: '🏃', diet: '🥗', habit: '🌱', recovery: '🌙' }[type]
}

function suggestionHowTo(item: UserWeeklyReport['nextWeekSuggestions'][number]) {
  let text = item.content.trim()
  if (item.why && text.startsWith(`${item.why}。`)) {
    text = text.slice(item.why.length + 1)
  }
  const metricSuffix = item.successMetric
    ? `。做到标准：${item.successMetric}。`
    : ''
  if (metricSuffix && text.endsWith(metricSuffix)) {
    text = text.slice(0, -metricSuffix.length)
  }
  return text || item.content
}

type WeeklyReportPageContentProps = {
  communityMode?: boolean
}

function WeeklyReportPageContent({ communityMode = false }: WeeklyReportPageContentProps) {
  const { reportId = '', userId = '' } = useParams()
  const [report, setReport] = useState<UserWeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!reportId || (communityMode && !userId)) {
      setError('周报链接无效')
      setLoading(false)
      return
    }

    let active = true
    const loader = communityMode
      ? httpData.getCommunityUserWeeklyReport(userId, reportId)
      : httpData.getUserWeeklyReport(reportId)

    loader
      .then(async (data) => {
        if (!active) return
        const normalized = normalizeUserWeeklyReport(data)
        if (!normalized) {
          setError('这份周报暂时找不到了')
          return
        }
        setReport(normalized)
        if (!communityMode && !normalized.isViewed) {
          const viewed = await httpData
            .markUserWeeklyReportViewed(reportId)
            .catch(() => null)
          if (active && viewed) {
            setReport(normalizeUserWeeklyReport(viewed))
          }
        }
      })
      .catch((err) =>
        active && setError(err instanceof Error ? err.message : '周报加载失败'),
      )
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [communityMode, reportId, userId])

  const chartMax = useMemo(
    () =>
      Math.max(
        1,
        ...(report?.calorieStats.dailyCalories.map((day) =>
          Math.abs(day.deficit ?? 0),
        ) ?? []),
      ),
    [report],
  )

  const backTo = communityMode ? `/community/${userId}` : '/settings'
  const backLabel = communityMode ? '返回社区主页' : '返回设置'

  if (loading) {
    return (
      <WeeklyReportScaffold title="小满周报">
        <div className="weekly-state-card">小狸正在打开周报…</div>
      </WeeklyReportScaffold>
    )
  }

  if (error || !report) {
    return (
      <WeeklyReportScaffold title="小满周报">
        <div className="weekly-state-card weekly-state-card--error">
          <p>{error || '这份周报暂时找不到了'}</p>
          <Link to={communityMode ? backTo : '/weekly-reports'}>
            {communityMode ? '返回社区主页' : '返回周报列表'}
          </Link>
        </div>
      </WeeklyReportScaffold>
    )
  }

  const sourceNotes: string[] = []
  if (report.calorieStats.trackedDeficitDays < report.dietStats.loggedDays) {
    sourceNotes.push(
      `有 ${report.dietStats.loggedDays - report.calorieStats.trackedDeficitDays} 个饮食日因身体资料不完整，未计算缺口`,
    )
  }
  if (report.dietStats.macroStatus === 'insufficient') {
    sourceNotes.push(
      `宏量完整覆盖 ${report.dietStats.macroLoggedDays}/7 天，少于 4 天，暂不判断蛋白质高低`,
    )
  }

  return (
    <div className="page-standalone weekly-report-bg">
      <PageShell variant="standalone" className="weekly-report-page">
        <div className="weekly-report-capture" data-weekly-report-capture>
        <nav className="weekly-report-nav">
          <Link to={backTo} aria-label={backLabel}>
            ←
          </Link>
          {!communityMode && <Link to="/weekly-reports">历史周报</Link>}
        </nav>

        <header className="weekly-cover">
          <div className="weekly-cover__glow" aria-hidden />
          <div className="weekly-cover__copy">
            <p className="weekly-cover__eyebrow">
              XIAOMAN WEEKLY · 第 {report.weekNumber} 周
            </p>
            <p className="weekly-cover__brand">小满周报</p>
            <h1>{report.headline}</h1>
            <p className="weekly-cover__subtitle">
              {communityMode ? '来自社区分享的周报' : '这是你和小狸一起努力的一周'}
            </p>
            <p className="weekly-cover__date">
              {formatWeeklyDateLabel(report.weekStartDate)} —{' '}
              {formatWeeklyDateLabel(report.weekEndDate)}
            </p>
            <span className="weekly-cover__badge">✦ {report.summary.overallTitle}</span>
          </div>
          <img src={foxImage} alt="小狸捧着你的周报" className="weekly-cover__fox" />
        </header>

        <section className="weekly-fox-letter weekly-fox-letter--lead">
          <img src={foxImage} alt="" aria-hidden />
          <div>
            <p>小狸的具体点评</p>
            <blockquote>{report.foxComment}</blockquote>
          </div>
        </section>

        <section className="weekly-section">
          <div className="weekly-section__heading">
            <p>01 · OVERVIEW</p>
            <h2>上周总览</h2>
          </div>
          <div className="weekly-overview-grid">
            <div>
              <strong>{report.summary.activeDays}</strong>
              <span>运动天数</span>
              {deltaCopy(report.wowDelta.activeDays, ' 天') && (
                <small>{deltaCopy(report.wowDelta.activeDays, ' 天')}</small>
              )}
            </div>
            <div>
              <strong>{report.exerciseStats.totalWorkouts}</strong>
              <span>运动次数</span>
            </div>
            <div>
              <strong>{numberOrDash(report.summary.totalExerciseCalories)}</strong>
              <span>运动消耗 kcal</span>
              {deltaCopy(report.wowDelta.totalExerciseCalories, ' kcal') && (
                <small>{deltaCopy(report.wowDelta.totalExerciseCalories, ' kcal')}</small>
              )}
            </div>
            <div>
              <strong>{numberOrDash(report.summary.totalCaloriesIn)}</strong>
              <span>摄入 kcal</span>
              {deltaCopy(report.wowDelta.totalCaloriesIn, ' kcal') && (
                <small>{deltaCopy(report.wowDelta.totalCaloriesIn, ' kcal')}</small>
              )}
            </div>
            <div>
              <strong>{numberOrDash(report.summary.totalCalorieDeficit)}</strong>
              <span>热量缺口 kcal</span>
              {deltaCopy(report.wowDelta.totalCalorieDeficit, ' kcal') && (
                <small>{deltaCopy(report.wowDelta.totalCalorieDeficit, ' kcal')}</small>
              )}
            </div>
            <div>
              <strong>{report.summary.achievementCount}</strong>
              <span>成就卡</span>
              {deltaCopy(report.wowDelta.achievementCount, ' 张') && (
                <small>{deltaCopy(report.wowDelta.achievementCount, ' 张')}</small>
              )}
            </div>
          </div>
          {sourceNotes.map((note) => (
            <p className="weekly-source-note" key={note}>{note}。</p>
          ))}
        </section>

        <section className="weekly-section">
          <div className="weekly-section__heading">
            <p>02 · CALORIE RHYTHM</p>
            <h2>热量与减脂表现</h2>
          </div>
          <div className="weekly-deficit-summary">
            <div>
              <span>一周总缺口</span>
              <strong>
                {numberOrDash(report.calorieStats.totalDeficit)} <small>kcal</small>
              </strong>
            </div>
            <div>
              <span>有效日均缺口</span>
              <strong>
                {numberOrDash(report.calorieStats.averageDailyDeficit)}{' '}
                <small>kcal</small>
              </strong>
            </div>
          </div>
          <div className="weekly-chart" aria-label="七天热量缺口图">
            {report.calorieStats.dailyCalories.length > 0 ? (
              report.calorieStats.dailyCalories.map((day, index) => {
                const height =
                  day.deficit == null
                    ? 8
                    : Math.max(12, Math.round((Math.abs(day.deficit) / chartMax) * 92))
                const exercised = Boolean(
                  report.exerciseStats.dailyExercise.find((item) => item.date === day.date)?.workoutCount,
                )
                const ate = Boolean(
                  report.dietStats.dailyDiet.find((item) => item.date === day.date)?.foodCount,
                )
                return (
                  <div className="weekly-chart__day" key={day.date}>
                    <span className="weekly-chart__value">
                      {day.deficit == null ? '—' : Math.round(day.deficit)}
                    </span>
                    <i
                      className={`weekly-chart__bar weekly-chart__bar--${day.status}`}
                      style={{ height }}
                    />
                    <strong>周{WEEKDAYS[index] ?? index + 1}</strong>
                    <small>{STATUS_LABEL[day.status] ?? STATUS_LABEL.unknown}</small>
                    <span className="weekly-chart__markers" aria-label={`${exercised ? '有运动' : '无运动'}，${ate ? '有饮食' : '无饮食'}`}>
                      <i className={exercised ? 'is-on' : ''}>动</i>
                      <i className={ate ? 'is-on' : ''}>食</i>
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="weekly-empty-line">这周还没有可统计的热量缺口。</p>
            )}
          </div>
          <p
            className={`weekly-level-copy weekly-level-copy--${report.calorieStats.deficitLevel}`}
          >
            {DEFICIT_COPY[report.calorieStats.deficitLevel]}
          </p>
        </section>

        <section className="weekly-section weekly-split-section">
          <div className="weekly-section__heading">
            <p>03 · MOVEMENT</p>
            <h2>运动表现</h2>
          </div>
          <div className="weekly-highlight-card weekly-highlight-card--green">
            <span>最喜欢的运动</span>
            <strong>{report.exerciseStats.favoriteExerciseName || '还没有记录'}</strong>
            <p>
              {report.exerciseStats.favoriteExerciseCount
                ? `出现 ${report.exerciseStats.favoriteExerciseCount} 次`
                : '下周和小狸一起动一动'}
            </p>
          </div>
          <div className="weekly-ranking">
            {report.exerciseStats.exerciseTypeDistribution.length > 0 ? (
              report.exerciseStats.exerciseTypeDistribution.map((item, index) => (
                <div key={`${item.name}-${index}`}>
                  <span>
                    {index + 1}. {item.name}
                  </span>
                  <i>
                    <b
                      style={{
                        width: `${Math.max(12, (item.calories / Math.max(1, report.exerciseStats.totalCalories)) * 100)}%`,
                      }}
                    />
                  </i>
                  <strong>
                    {item.count} 次 · {item.calories} kcal
                  </strong>
                </div>
              ))
            ) : (
              <p className="weekly-empty-line">没有运动记录，也可以从一次轻松散步开始。</p>
            )}
          </div>
          <p className="weekly-best-day">
            最佳运动日：
            {report.exerciseStats.bestExerciseDay
              ? formatWeeklyDateLabel(report.exerciseStats.bestExerciseDay)
              : '等待你来点亮'}
          </p>
        </section>

        <section className="weekly-section">
          <div className="weekly-section__heading">
            <p>04 · FOOD</p>
            <h2>饮食表现</h2>
          </div>
          <div className="weekly-food-grid">
            <div>
              <span>记录天数</span>
              <strong>{report.dietStats.loggedDays} / 7</strong>
            </div>
            <div>
              <span>日均摄入</span>
              <strong>{numberOrDash(report.dietStats.averageCalories)} kcal</strong>
            </div>
            <div>
              <span>最常吃</span>
              <strong>{report.dietStats.favoriteFood || '暂无'}</strong>
            </div>
            <div>
              <span>单项最高</span>
              <strong>{report.dietStats.highestCalorieFood || '暂无'}</strong>
              <small>
                {report.dietStats.highestCalorieFoodCalories
                  ? `${report.dietStats.highestCalorieFoodCalories} kcal`
                  : ''}
              </small>
            </div>
          </div>
          {report.dietStats.macroStatus === 'sufficient' ? (
            <div className="weekly-macro-grid">
              <div>
                <span>覆盖日日均蛋白质</span>
                <strong>{numberOrDash(report.dietStats.averageProtein)} g</strong>
                <small>规则目标 {numberOrDash(report.dietStats.macroTargets?.protein_g)} g</small>
              </div>
              <div>
                <span>覆盖日日均脂肪</span>
                <strong>{numberOrDash(report.dietStats.averageFat)} g</strong>
                <small>规则目标 {numberOrDash(report.dietStats.macroTargets?.fat_g)} g</small>
              </div>
              <div>
                <span>覆盖日日均碳水</span>
                <strong>{numberOrDash(report.dietStats.averageCarbs)} g</strong>
                <small>规则目标 {numberOrDash(report.dietStats.macroTargets?.carbs_g)} g</small>
              </div>
            </div>
          ) : (
            <div className="weekly-nutrition-empty">
              宏量完整覆盖 {report.dietStats.macroLoggedDays} / 7 天；满 4 天后再展示 P / F / C 周结论
            </div>
          )}
        </section>

        <section className="weekly-section">
          <div className="weekly-section__heading">
            <p>05 · ACHIEVEMENTS</p>
            <h2>成就卡回顾</h2>
          </div>
          <div className="weekly-achievement-counts">
            <span>
              👑 运动大王 <strong>{report.achievementStats.exerciseKingCount}</strong>
            </span>
            <span>
              🔥 减脂先锋 <strong>{report.achievementStats.fatLossPioneerCount}</strong>
            </span>
            <span>
              🥘 美食大王 <strong>{report.achievementStats.foodKingCount}</strong>
            </span>
          </div>
          <div className="weekly-achievement-wall">
            {report.achievementStats.dailyAchievements.length > 0 ? (
              report.achievementStats.dailyAchievements.map((day, index) => (
                <article
                  key={day.date}
                  className={day.achievements.length ? 'is-earned' : ''}
                >
                  <small>周{WEEKDAYS[index] ?? index + 1}</small>
                  <strong>
                    {day.achievements[0]?.title || '未点亮'}
                  </strong>
                  <span aria-hidden>
                    {day.achievements[0]?.type === 'exercise_king'
                      ? '👑'
                      : day.achievements[0]?.type === 'fat_loss_pioneer'
                        ? '🔥'
                        : day.achievements[0]?.type === 'food_king'
                          ? '🥘'
                          : '○'}
                  </span>
                </article>
              ))
            ) : (
              <p className="weekly-empty-line">这周还没有成就卡，继续记录就会亮起来。</p>
            )}
          </div>
        </section>

        <section className="weekly-section">
          <div className="weekly-section__heading">
            <p>06 · NEXT WEEK</p>
            <h2>下周的小目标</h2>
          </div>
          <div className="weekly-suggestions">
            {report.nextWeekSuggestions.length > 0 ? (
              report.nextWeekSuggestions.slice(0, 3).map((item) => (
                <article key={`${item.type}-${item.title}`}>
                  <span aria-hidden>{suggestionIcon(item.type)}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <dl>
                      <div>
                        <dt>为什么</dt>
                        <dd>{item.why || item.content}</dd>
                      </div>
                      <div>
                        <dt>怎么做</dt>
                        <dd>{suggestionHowTo(item)}</dd>
                      </div>
                      <div>
                        <dt>怎样算做到</dt>
                        <dd>{item.successMetric || '按建议完成一次即可。'}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))
            ) : (
              <p className="weekly-empty-line">下周先从稳定记录开始，小狸会再给你建议。</p>
            )}
          </div>
        </section>
        </div>

        {communityMode ? (
          <footer className="weekly-actions">
            <div>
              <Link to={backTo}>返回社区主页</Link>
            </div>
          </footer>
        ) : (
          <WeeklyReportSharePanel report={report} onReportChange={setReport} />
        )}
      </PageShell>
    </div>
  )
}

export function WeeklyReportPage() {
  return (
    <WeeklyReportErrorBoundary>
      <WeeklyReportPageContent />
    </WeeklyReportErrorBoundary>
  )
}

export function CommunityWeeklyReportPage() {
  return (
    <WeeklyReportErrorBoundary>
      <WeeklyReportPageContent communityMode />
    </WeeklyReportErrorBoundary>
  )
}
