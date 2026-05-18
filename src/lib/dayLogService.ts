import { httpData } from './api'
import { isSelfHosted } from './config'
import { supabase } from './supabase'
import type { DayLog, Exercise, Meal, Profile } from '../types'

export async function getOrCreateDayLog(
  userId: string,
  logDate: string,
  tdeeSnapshot: number,
): Promise<DayLog> {
  if (isSelfHosted) {
    return httpData.getOrCreateDayLog(userId, logDate, tdeeSnapshot)
  }

  const { data: existing } = await supabase
    .from('day_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle()

  if (existing) return existing as DayLog

  const { data, error } = await supabase
    .from('day_logs')
    .insert({
      user_id: userId,
      log_date: logDate,
      tdee_snapshot: tdeeSnapshot,
      exercise_kcal: 0,
      meal_kcal: 0,
      deficit: tdeeSnapshot,
    })
    .select()
    .single()

  if (error) throw error
  return data as DayLog
}

export async function fetchDayLogWithItems(
  userId: string,
  logDate: string,
  profile: Profile,
): Promise<{
  dayLog: DayLog
  exercises: Exercise[]
  meals: Meal[]
}> {
  if (isSelfHosted) {
    return httpData.fetchDayLogWithItems(userId, logDate, profile)
  }

  const tdee = profile.tdee ?? 0
  const dayLog = await getOrCreateDayLog(userId, logDate, tdee)

  const [exRes, mealRes] = await Promise.all([
    supabase
      .from('exercises')
      .select('*')
      .eq('day_log_id', dayLog.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meals')
      .select('*')
      .eq('day_log_id', dayLog.id)
      .order('created_at', { ascending: false }),
  ])

  if (exRes.error) throw exRes.error
  if (mealRes.error) throw mealRes.error

  return {
    dayLog,
    exercises: (exRes.data ?? []) as Exercise[],
    meals: (mealRes.data ?? []) as Meal[],
  }
}

export async function addExercise(
  userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  if (isSelfHosted) {
    await httpData.addExercise(userId, dayLogId, name, kcal)
    return
  }
  const { error } = await supabase.from('exercises').insert({
    user_id: userId,
    day_log_id: dayLogId,
    name,
    kcal,
  })
  if (error) throw error
}

export async function addMeal(
  userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  if (isSelfHosted) {
    await httpData.addMeal(userId, dayLogId, name, kcal)
    return
  }
  const { error } = await supabase.from('meals').insert({
    user_id: userId,
    day_log_id: dayLogId,
    name,
    kcal,
  })
  if (error) throw error
}

export async function deleteExercise(id: string): Promise<void> {
  if (isSelfHosted) {
    await httpData.deleteExercise(id)
    return
  }
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw error
}

export async function deleteMeal(id: string): Promise<void> {
  if (isSelfHosted) {
    await httpData.deleteMeal(id)
    return
  }
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
}

export async function seedDefaultTemplates(userId: string): Promise<void> {
  if (isSelfHosted) {
    await httpData.seedDefaultTemplates(userId)
    return
  }

  const { DEFAULT_EXERCISE_TEMPLATES, DEFAULT_MEAL_TEMPLATES } = await import(
    './defaultTemplates'
  )

  const { count: exCount } = await supabase
    .from('exercise_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((exCount ?? 0) === 0) {
    await supabase.from('exercise_templates').insert(
      DEFAULT_EXERCISE_TEMPLATES.map((t) => ({ ...t, user_id: userId })),
    )
  }

  const { count: mealCount } = await supabase
    .from('meal_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((mealCount ?? 0) === 0) {
    await supabase.from('meal_templates').insert(
      DEFAULT_MEAL_TEMPLATES.map((t) => ({ ...t, user_id: userId })),
    )
  }
}
