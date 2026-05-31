import { TodayRecordRow } from './TodayRecordRow'
import type { MealDisplayGroup } from '../lib/todayMealGroups'
import type { Meal } from '../types'

type RecordKey = { kind: 'meal'; id: string }

function recordKeyOf(key: RecordKey): string {
  return `${key.kind}:${key.id}`
}

interface TodayMealGroupRowProps {
  group: MealDisplayGroup
  selectMode: boolean
  selectedKeys: Set<string>
  editing: { kind: 'meal'; id: string } | null
  onToggleSelect: (key: RecordKey) => void
  onStartEdit: (key: RecordKey) => void
  onCancelEdit: () => void
  onDelete: (meal: Meal) => void
  onUpdateMeal: (id: string, name: string, kcal: number) => Promise<void>
}

function renderMealRow(meal: Meal, props: TodayMealGroupRowProps) {
  const key = recordKeyOf({ kind: 'meal', id: meal.id })
  return (
    <TodayRecordRow
      key={meal.id}
      name={meal.name}
      kcal={meal.kcal}
      showActions
      selectable={props.selectMode}
      selected={props.selectedKeys.has(key)}
      onToggleSelect={() => props.onToggleSelect({ kind: 'meal', id: meal.id })}
      isEditing={
        props.editing?.kind === 'meal' && props.editing.id === meal.id
      }
      onStartEdit={() => props.onStartEdit({ kind: 'meal', id: meal.id })}
      onCancelEdit={props.onCancelEdit}
      onDelete={() => props.onDelete(meal)}
      onSave={(name, kcal) => props.onUpdateMeal(meal.id, name, kcal)}
    />
  )
}

export function TodayMealGroupRow(props: TodayMealGroupRowProps) {
  const { group } = props

  if (!group.isMultiItem) {
    return renderMealRow(group.meals[0], props)
  }

  return (
    <li className="today-records-section__meal-group">
      <p className="today-records-section__meal-group-title">
        本次饮食 · {group.meals.length} 项 · {Math.round(group.totalKcal)} kcal
      </p>
      <ul className="today-records-section__meal-group-items">
        {group.meals.map((meal) => renderMealRow(meal, props))}
      </ul>
    </li>
  )
}
