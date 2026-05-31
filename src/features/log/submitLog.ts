import { addExercise, addMeal, getOrCreateDayLog } from '../../lib/dayLogService'
import { formatDateKey } from '../../lib/streaks'

type SubmitKind = 'exercise' | 'meal'

interface SubmitLogInput {
  userId: string
  profileTdee: number | null | undefined
  kind: SubmitKind
  name: string
  kcal: number
}

export class BatchSavePartialError extends Error {
  readonly savedCount: number
  readonly failedIndex: number

  constructor(savedCount: number, failedIndex: number) {
    super(
      `已保存 ${savedCount} 条，第 ${failedIndex} 条保存失败，请检查今日记录后再重试`,
    )
    this.name = 'BatchSavePartialError'
    this.savedCount = savedCount
    this.failedIndex = failedIndex
  }
}

export async function submitLog(input: SubmitLogInput): Promise<void> {
  const today = formatDateKey()
  const dayLog = await getOrCreateDayLog(
    input.userId,
    today,
    input.profileTdee ?? 0,
  )
  if (input.kind === 'exercise') {
    await addExercise(input.userId, dayLog.id, input.name, input.kcal)
    return
  }
  await addMeal(input.userId, dayLog.id, input.name, input.kcal)
}

interface SubmitLogsBatchInput {
  userId: string
  profileTdee: number | null | undefined
  kind: SubmitKind
  items: { name: string; kcal: number }[]
}

export async function submitLogsBatch(input: SubmitLogsBatchInput): Promise<void> {
  if (input.items.length === 0) return

  const today = formatDateKey()
  const dayLog = await getOrCreateDayLog(
    input.userId,
    today,
    input.profileTdee ?? 0,
  )

  const batchId =
    input.kind === 'meal' && input.items.length > 1
      ? crypto.randomUUID()
      : undefined

  let savedCount = 0
  for (const item of input.items) {
    try {
      if (input.kind === 'exercise') {
        await addExercise(input.userId, dayLog.id, item.name, item.kcal)
      } else {
        await addMeal(
          input.userId,
          dayLog.id,
          item.name,
          item.kcal,
          batchId,
        )
      }
      savedCount += 1
    } catch {
      throw new BatchSavePartialError(savedCount, savedCount + 1)
    }
  }
}
