import { httpData } from './api'
import type { DayLog, Exercise, Meal, Profile } from '../types'

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
}

export async function addMeal(
  userId: string,
  dayLogId: string,
  name: string,
  kcal: number,
): Promise<void> {
  await httpData.addMeal(userId, dayLogId, name, kcal)
}

export async function deleteExercise(id: string): Promise<void> {
  await httpData.deleteExercise(id)
}

export async function deleteMeal(id: string): Promise<void> {
  await httpData.deleteMeal(id)
}

export async function seedDefaultTemplates(userId: string): Promise<void> {
  await httpData.seedDefaultTemplates(userId)
}
