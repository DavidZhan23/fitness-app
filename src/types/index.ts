export type Sex = 'male' | 'female'

export interface Profile {
  id: string
  email: string | null
  /** 用户自定义昵称，展示用 */
  nickname?: string | null
  /** 账号注册时间，用于打卡墙「注册日前不计缺口」 */
  created_at?: string
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  sex: Sex | null
  activity_factor: number
  bmr: number | null
  tdee: number | null
  deficit_threshold: number
  onboarding_complete: boolean
}

export interface DayLog {
  id: string
  user_id: string
  log_date: string
  tdee_snapshot: number
  exercise_kcal: number
  meal_kcal: number
  deficit: number
}

export interface Exercise {
  id: string
  day_log_id: string
  user_id: string
  name: string
  kcal: number
  created_at: string
}

export interface Meal {
  id: string
  day_log_id: string
  user_id: string
  name: string
  kcal: number
  created_at: string
}

export interface ExerciseTemplate {
  id: string
  user_id: string
  name: string
  kcal: number
}

export interface MealTemplate {
  id: string
  user_id: string
  name: string
  kcal: number
}

export interface HeatmapDay {
  date: string
  exerciseCheck: boolean
  deficitCheck: boolean
  deficit: number
  exerciseKcal: number
}
