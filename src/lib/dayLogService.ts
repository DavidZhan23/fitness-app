import { httpData } from './api'
import { invalidateCommunityListCache } from './communityListCache'
import type { DayLog, Exercise, Meal, Profile } from '../types'

function bumpCommunityListAfterLogChange() {
  invalidateCommunityListCache()
}

export async function getOrCreateDayLog(
  userId: string,
  logDate: string,
  tdeeSnapshot: number,
): Promise<DayLog> {
  return httpData.getOrCreateDayLog(userId, logDate, tdeeSnapshot)
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
  return httpData.fetchDayLogWithItems(userId, logDate, profile)
}

export async function addExercise(
  userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.addExercise(userId, dayLogId, name, kcal)
  bumpCommunityListAfterLogChange()
}

export async function addMeal(
  userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.addMeal(userId, dayLogId, name, kcal)
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

export async function seedDefaultTemplates(userId: string): Promise<void> {
  await httpData.seedDefaultTemplates(userId)
}
