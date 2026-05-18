import type { Exercise, Meal } from '../types'

interface LogListProps {
  exercises: Exercise[]
  meals: Meal[]
  onDeleteExercise: (id: string) => void
  onDeleteMeal: (id: string) => void
}

export function LogList({
  exercises,
  meals,
  onDeleteExercise,
  onDeleteMeal,
}: LogListProps) {
  if (exercises.length === 0 && meals.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-600 py-8 text-center text-sm text-muted">
        还没有记录，点击下方按钮开始
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {exercises.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-brand">运动</h3>
          <ul className="space-y-2">
            {exercises.map((ex) => (
              <LogItem
                key={ex.id}
                name={ex.name}
                kcal={ex.kcal}
                onDelete={() => onDeleteExercise(ex.id)}
              />
            ))}
          </ul>
        </section>
      )}
      {meals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-amber-400">饮食</h3>
          <ul className="space-y-2">
            {meals.map((m) => (
              <LogItem
                key={m.id}
                name={m.name}
                kcal={m.kcal}
                onDelete={() => onDeleteMeal(m.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function LogItem({
  name,
  kcal,
  onDelete,
}: {
  name: string
  kcal: number
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted tabular-nums">{Math.round(kcal)} kcal</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
        aria-label="删除"
      >
        删除
      </button>
    </li>
  )
}
