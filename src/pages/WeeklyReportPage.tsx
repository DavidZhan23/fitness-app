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

function suggestionIcon(type: UserWeeklyReport['nextWeekSuggestions'][number]['type']) {
  return { exercise: '🏃', diet: '🥗', habit: '🌱', recovery: '🌙' }[type]
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
            <h1>小满周报</h1>
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

        <section className="weekly-section">
          <div className="weekly-section__heading">
            <p>01 · OVERVIEW</p>
            <h2>上周总览</h2>
          </div>
          <div className="weekly-overview-grid">
            <div>
              <strong>{report.summary.activeDays}</strong>
              <span>运动天数</span>
            </div>
            <div>
              <strong>{report.exerciseStats.totalWorkouts}</strong>
              <span>运动次数</span>
            </div>
            <div>
              <strong>{numberOrDash(report.summary.totalExerciseCalories)}</strong>
              <span>运动消耗 kcal</span>
            </div>
            <div>
              <strong>{numberOrDash(report.summary.totalCaloriesIn)}</strong>
              <span>摄入 kcal</span>
            </div>
            <div>
              <strong>{numberOrDash(report.summary.totalCalorieDeficit)}</strong>
              <span>热量缺口 kcal</span>
            </div>
            <div>
              <strong>{report.summary.achievementCount}</strong>
              <span>成就卡</span>
            </div>
          </div>
          <p className="weekly-source-note">
            当前记录未包含运动时长、营养素和体重历史，因此这些指标不会被推测。
          </p>
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
          <div className="weekly-nutrition-empty">
            蛋白质 · 碳水 · 脂肪 · 当前记录未包含营养素数据
          </div>
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
                    {day.achievements[0]?.title ||
                      ['休整日', '生活日', '小狸陪伴日'][index % 3]}
                  </strong>
                  <span aria-hidden>
                    {day.achievements[0]?.type === 'exercise_king'
                      ? '👑'
                      : day.achievements[0]?.type === 'fat_loss_pioneer'
                        ? '🔥'
                        : day.achievements[0]?.type === 'food_king'
                          ? '🥘'
                          : '✦'}
                  </span>
                </article>
              ))
            ) : (
              <p className="weekly-empty-line">这周还没有成就卡，继续记录就会亮起来。</p>
            )}
          </div>
        </section>

        <section className="weekly-fox-letter">
          <img src={foxImage} alt="" aria-hidden />
          <div>
            <p>小狸想对你说</p>
            <blockquote>{report.foxComment}</blockquote>
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
                    <p>{item.content}</p>
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
