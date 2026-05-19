import type { CommunityPublicExercise, CommunityPublicMeal } from '../types'

interface ReadOnlyLogListProps {
  exercises: CommunityPublicExercise[]
  meals: CommunityPublicMeal[]
}

export function ReadOnlyLogList({ exercises, meals }: ReadOnlyLogListProps) {
  if (exercises.length === 0 && meals.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-600 py-8 text-center text-sm text-muted">
        这一天还没有记录
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
              <li
                key={ex.id}
                className="rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50"
              >
                <p className="font-medium">{ex.name}</p>
                <p className="text-sm text-muted tabular-nums">
                  {Math.round(Number(ex.kcal))} kcal
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {meals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-amber-400">饮食</h3>
          <ul className="space-y-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50"
              >
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-muted tabular-nums">
                  {Math.round(Number(m.kcal))} kcal
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
