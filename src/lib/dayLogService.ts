import { httpData } from './api'
import { invalidateCommunityListCache } from './communityListCache'
import type { DayLog, Exercise, Meal, Profile } from '../types'

function bumpCommunityListAfterLogChange() {
  invalidateCommunityListCache()
}

export async function getOrCreateDayLog(
  _userId: string,
  logDate: string,
  tdeeSnapshot: number,
): Promise<DayLog> {
  return httpData.getOrCreateDayLog(logDate, tdeeSnapshot)
}

export async function fetchDayLogWithItems(
  _userId: string,
  logDate: string,
  profile: Profile,
): Promise<{
  dayLog: DayLog
  exercises: Exercise[]
  meals: Meal[]
}> {
  return httpData.fetchDayLogWithItems(logDate, profile)
}

export async function addExercise(
  _userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.addExercise(dayLogId, name, kcal)
  bumpCommunityListAfterLogChange()
}

export async function addMeal(
  _userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.addMeal(dayLogId, name, kcal)
  bumpCommunityListAfterLogChange()
}

export async function updateExercise(
  id: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.updateExercise(id, name, kcal)
  bumpCommunityListAfterLogChange()
}

export async function updateMeal(
  id: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.updateMeal(id, name, kcal)
  bumpCommunityListAfterLogChange()
}

export async function deleteExercise(id: string): Promise<void> {
  await httpData.deleteExercise(id)
  bumpCommunityListAfterLogChange()
}

export async function deleteMeal(id: string): Promise<void> {
  await httpData.deleteMeal(id)
  bumpCommunityListAfterLogChange()
}

export async function seedDefaultTemplates(_userId: string): Promise<void> {
  await httpData.seedDefaultTemplates()
}
