import cron from 'node-cron'
import { query } from './db.js'
import { generateWeeklyReport, getIsoWeekKey } from './weeklyReport.js'

const TZ = process.env.DISPLAY_TIMEZONE || 'Asia/Shanghai'

/**
 * 注册所有定时任务。在 index.js 的 start() 内、DB ready 后调用一次。
 */
export function startSchedulers() {
  if (process.env.WEEKLY_REPORT_DISABLED === '1') {
    console.log('[scheduler] WEEKLY_REPORT_DISABLED=1, skipping weekly report cron')
    return
  }

  // 每周一 02:00（Asia/Shanghai）
  cron.schedule(
    '0 2 * * 1',
    async () => {
      const now = new Date()
      // 周一凌晨跑的是"上一周"的报告（今天周一，报告范围是刚结束的上一周）
      const lastMonday = new Date(now)
      lastMonday.setDate(now.getDate() - 7)
      const weekId = getIsoWeekKey(lastMonday)

      console.log(`[scheduler] weekly report cron triggered for ${weekId}`)
      try {
        await generateWeeklyReport(weekId, query, { generatedBy: 'cron' })
      } catch (err) {
        console.error('[scheduler] weekly report generation failed:', err.message)
      }
    },
    { timezone: TZ },
  )

  console.log(`[scheduler] weekly report cron registered (every Mon 02:00 ${TZ})`)
}
