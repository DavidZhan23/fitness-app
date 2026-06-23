import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from './ui/responsive'

type WeeklyReportScaffoldProps = {
  title?: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  className?: string
  children: ReactNode
}

export function WeeklyReportScaffold({
  title = '我的周报',
  subtitle,
  backTo = '/settings',
  backLabel = '返回设置',
  className,
  children,
}: WeeklyReportScaffoldProps) {
  return (
    <div className="page-standalone weekly-report-bg">
      <PageShell variant="standalone" className={className}>
        <header className="weekly-page-heading">
          <Link to={backTo} aria-label={backLabel}>
            ←
          </Link>
          <div>
            {subtitle && <p>{subtitle}</p>}
            <h1>{title}</h1>
          </div>
        </header>
        {children}
      </PageShell>
    </div>
  )
}

type WeeklyReportErrorBoundaryProps = {
  children: ReactNode
}

type WeeklyReportErrorBoundaryState = {
  error: Error | null
}

function weeklyReportErrorMessage(error: Error): string {
  if (/DateTimeFormat|Invalid time value/i.test(error.message)) {
    return '周报日期数据异常，请返回后重试。'
  }
  return error.message || '页面渲染出错，请返回后重试。'
}

export class WeeklyReportErrorBoundary extends Component<
  WeeklyReportErrorBoundaryProps,
  WeeklyReportErrorBoundaryState
> {
  state: WeeklyReportErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <WeeklyReportScaffold title="周报加载失败">
          <div className="weekly-state-card weekly-state-card--error">
            <h2>小狸没能打开这份周报</h2>
            <p>{weeklyReportErrorMessage(this.state.error)}</p>
            <Link to="/settings">返回设置</Link>
          </div>
        </WeeklyReportScaffold>
      )
    }

    return this.props.children
  }
}
