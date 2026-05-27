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
