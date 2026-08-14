export type Sex = 'male' | 'female'

export type AppStyle =
  | 'default'
  | 'lavender'
  | 'sakura'
  | 'sakura-blush'
  | 'active-mint'
  | 'eva'
  | 'eva-unit02'
  | 'gundam-hangar'
  | 'jojo-stardust-duel'
  | 'batman-v-superman'
  | 'soy-tea'
  | 'wood-zen'

export type HeroCollabPreferences = Partial<Record<AppStyle, boolean>>

/** 打卡墙展示：classic 同页双热力图；split 运动墙/代谢墙分屏切换 */
export type WallStyle = 'classic' | 'split'

/** 基础代谢计入方式：全天立即计入，或随时间逐分钟累计 */
export type MetabolismMode = 'full_day' | 'time_spread'

export interface Profile {
  id: string
  email: string | null
  /** 用户自定义昵称，展示用 */
  nickname?: string | null
  /** 今日页欢迎语（可选；留空时回退为主题默认标题） */
  welcome_message?: string | null
  /** 今日页副标题（可选；留空时回退为主题默认副标题） */
  welcome_subtitle?: string | null
  /** 头像 data URL（JPEG/PNG/WebP base64） */
  avatar_url?: string | null
  /** 账号注册时间，用于打卡墙「注册日前不计缺口」 */
  created_at?: string
  weight_kg: number | null
  height_cm: number | null
  /** 生日 YYYY-MM-DD（展示用；age 由前后端根据生日推算） */
  birthday?: string | null
  age: number | null
  sex: Sex | null
  activity_factor: number
  bmr: number | null
  tdee: number | null
  deficit_threshold: number
  onboarding_complete: boolean
  /** 是否在社区公开今日动态与打卡墙 */
  community_visible?: boolean
  /** 开发者隐藏锁；锁定时本人不能公开，近日记录也不会自动打开 */
  community_visible_locked_by_developer?: boolean
  /** 账号级主题；null 表示老账号尚未迁移本地偏好 */
  app_style?: AppStyle | string | null
  /** 账号级联名主视觉开关，只保存显式设置的主题键 */
  hero_collab?: HeroCollabPreferences | null
  /** 打卡墙样式，默认 classic */
  wall_style?: WallStyle
  /** 基础代谢计入方式，默认 full_day */
  metabolism_mode?: MetabolismMode
}

export interface CommunityMember {
  id: string
  nickname: string
  avatarUrl?: string | null
  isSelf: boolean
  /** 主人打卡墙布局；社区 API 返回 */
  wallStyle?: WallStyle
  today: CommunityDaySnapshot
  isFollowing: boolean
  todayLikeCount: number
  todayDislikeCount: number
  viewerLikedToday: boolean
  viewerDislikedToday: boolean
}

/** 关注我的用户（关注我 Tab） */
export interface CommunityFollower {
  id: string
  nickname: string
  avatarUrl?: string | null
  followedAt: string
  isFollowing: boolean
  canViewProfile: boolean
}

export interface CommunityFollowersResponse {
  total: number
  followers: CommunityFollower[]
}

export type CommunityInboxItemKind =
  | 'like'
  | 'dislike'
  | 'comment_on_card'
  | 'reply'
  | 'comment_like'
  | 'comment_dislike'
  | 'follow'

export interface CommunityInboxItem {
  id: string
  kind: CommunityInboxItemKind
  actorId: string
  actorNickname: string
  actorAvatarUrl?: string | null
  logDate: string
  targetUserId: string
  bodyPreview: string | null
  createdAt: string
  /** follow 消息：我是否已回关对方 */
  viewerFollowsActor?: boolean
  actorCanViewProfile?: boolean
}

export interface CommunityInboxSummary {
  count: number
  interactionCount: number
  followersOnMe: number
  likesOnMyCard: number
  dislikesOnMyCard: number
  commentsOnMyCard: number
  repliesToMe: number
  items: CommunityInboxItem[]
}

export interface CommunityInboxListResponse {
  mode: 'unread' | 'history'
  total: number
  hasMore: boolean
  items: CommunityInboxItem[]
}

export interface DayCommentReactionStats {
  likeCount: number
  dislikeCount: number
  viewerLiked: boolean
  viewerDisliked: boolean
}

export interface DayComment {
  id: string
  authorId: string
  authorNickname: string
  authorAvatarUrl?: string | null
  body: string
  createdAt: string
  isOwn: boolean
  likeCount: number
  viewerLiked: boolean
  dislikeCount: number
  viewerDisliked: boolean
  /** 回复时挂在的顶层评论 id */
  parentCommentId?: string | null
  replyToUserId?: string | null
  replyToNickname?: string | null
}

export interface CommunityUserDetail {
  member: Pick<
    CommunityMember,
    'id' | 'nickname' | 'isSelf' | 'avatarUrl' | 'wallStyle'
  >
  date: string
  snapshot: CommunityDaySnapshot
  exercises: CommunityPublicExercise[]
  meals: CommunityPublicMeal[]
  isFollowing: boolean
  likeCount: number
  dislikeCount: number
  viewerLiked: boolean
  viewerDisliked: boolean
  comments: DayComment[]
}

export interface CommunityDaySnapshot {
  date: string
  deficit: number
  exerciseKcal: number
  mealKcal: number
  exerciseCount: number
  mealCount: number
  dailyBmr: number
  metabolismMode?: MetabolismMode
  threshold: number
  accountStartKey: string | null
  /** 他人查看时当日已手动隐藏 */
  hidden?: boolean
  /** 当日是否在社区展示（自己卡片开关用） */
  dayCommunityVisible?: boolean
}

export type LogItemViewerReaction = 'up' | 'down' | null

export interface CommunityLogItemSocial {
  thumbsUp: number
  thumbsDown: number
  viewerReaction: LogItemViewerReaction
}

export interface CommunityPublicExercise extends CommunityLogItemSocial {
  id: string
  name: string
  kcal: number
  created_at: string
}

export interface CommunityPublicMeal extends CommunityLogItemSocial {
  id: string
  name: string
  kcal: number
  created_at: string
}

export interface DayLog {
  id: string
  user_id: string
  log_date: string
  tdee_snapshot: number
  exercise_kcal: number
  meal_kcal: number
  deficit: number
  community_visible?: boolean
  micronutrient_status?: 'idle' | 'pending' | 'ready' | 'error' | null
  micronutrient_fingerprint?: string | null
  micronutrient_summary?: MicronutrientSummary | null
  micronutrient_updated_at?: string | null
  micronutrient_error?: string | null
}

export type MicronutrientId =
  | 'vit_a'
  | 'vit_c'
  | 'vit_d'
  | 'vit_e'
  | 'vit_k'
  | 'vit_b1'
  | 'vit_b2'
  | 'vit_b6'
  | 'vit_b9'
  | 'vit_b12'
  | 'calcium'
  | 'iron'
  | 'zinc'
  | 'magnesium'
  | 'potassium'
  | 'iodine'

export type MicronutrientStatus = 'adequate' | 'low' | 'unknown'

export interface MicronutrientItem {
  id: MicronutrientId
  status: MicronutrientStatus
  note?: string
  food_suggestions?: string[]
}

export interface MicronutrientSummary {
  version: 1
  items: MicronutrientItem[]
  advice?: string
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
  batch_id?: string | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  sugar_g: number | null
  sugar_scope: 'added' | null
  macros_source: 'user' | 'ai' | null
}

export interface MealMacrosInput {
  protein_g?: number | null
  fat_g?: number | null
  carbs_g?: number | null
  sugar_g?: number | null
  macros_source?: 'user' | 'ai' | null
}

export interface LogTemplate {
  id: string
  kind: 'meal' | 'exercise'
  name: string
  unit: string
  kcalPerUnit: number
  defaultQuantity: number
  /** Legacy cache; do not use for log-page kcal calculation */
  kcal?: number
}

export interface ExerciseTemplate {
  id: string
  user_id: string
  name: string
  unit: string
  kcal_per_unit: number
  default_quantity: number
  kcal: number
}

export interface MealTemplate {
  id: string
  user_id: string
  name: string
  unit: string
  kcal_per_unit: number
  default_quantity: number
  kcal: number
}

export interface HeatmapDay {
  date: string
  exerciseCheck: boolean
  deficitCheck: boolean
  deficit: number
  exerciseKcal: number
}

/** 开发者后台：社区名片可见性管理 */
export interface DeveloperCommunityMember {
  id: string
  email: string
  nickname: string
  communityVisible: boolean
  communityVisibleLockedByDeveloper: boolean
  onboardingComplete: boolean
  createdAt: string
}

/** 周报列表项（不含 report_md） */
export interface WeeklyReportSummary {
  week_id: string
  week_start_date: string
  week_end_date: string
  status: string
  generated_by: string
  report_path: string | null
  created_at: string
  updated_at: string
}

/** 周报详情 */
export interface WeeklyReportDetail extends WeeklyReportSummary {
  metrics_json: Record<string, unknown>
  analysis_md: string | null
  recommendations_md: string | null
  report_md: string
}

export type WeeklyDeficitStatus =
  | 'surplus'
  | 'mild'
  | 'good'
  | 'aggressive'
  | 'unknown'

export type WeeklyDeficitLevel =
  | 'too_low'
  | 'mild'
  | 'good'
  | 'aggressive'
  | 'unknown'

export type WeeklyAchievementType =
  | 'exercise_king'
  | 'fat_loss_pioneer'
  | 'food_king'

export type WeeklySuggestionType = 'exercise' | 'diet' | 'habit' | 'recovery'

export interface WeeklyReportEvidence {
  id: string
  dimension: 'coverage' | 'calorie' | 'exercise' | 'diet'
  text: string
  value: number | null
}

export interface WeeklyReportWowDelta {
  activeDays: number | null
  dietLoggedDays: number | null
  totalExerciseCalories: number | null
  totalCaloriesIn: number | null
  totalCalorieDeficit: number | null
  achievementCount: number | null
}

export interface UserWeeklyReport {
  id: string
  userId: string
  weekStartDate: string
  weekEndDate: string
  weekNumber: number
  year: number
  generatedAt: string
  viewedAt?: string | null
  isViewed: boolean
  sharedToCommunityAt?: string | null
  isSharedToCommunity?: boolean
  headline: string
  narrativeSource: 'ai' | 'rules'
  wowDelta: WeeklyReportWowDelta
  insights: {
    coverage: {
      dietLoggedDays: number
      activeDays: number
      trackedDeficitDays: number
      macroLoggedDays: number
      weekendDietMissing: boolean
    }
    calorie: {
      level: WeeklyDeficitLevel
      averageDailyDeficit: number | null
      trackedDays: number
    }
    exercise: {
      activeDays: number
      totalWorkouts: number
      favoriteName: string | null
      favoriteCount: number
      concentration: number
    }
    diet: {
      loggedDays: number
      macroStatus: 'sufficient' | 'insufficient'
      proteinStatus: 'low' | 'steady' | 'insufficient'
      averageProtein: number | null
      macroTargets: {
        protein_g: number
        fat_g: number
        carbs_g: number
        sugar_g: number
      } | null
    }
    persona: 'recovery' | 'coverage' | 'movement' | 'protein' | 'steady'
    headline: string
    evidence: WeeklyReportEvidence[]
    wowDelta: WeeklyReportWowDelta
  }
  summary: {
    dataStatus: 'complete' | 'insufficient'
    activeDays: number
    dietLoggedDays: number
    totalExerciseMinutes: number | null
    totalExerciseCalories: number
    totalCaloriesIn: number
    totalCalorieDeficit: number | null
    averageDailyDeficit: number | null
    weightChangeKg: number | null
    achievementCount: number
    overallTitle: string
  }
  exerciseStats: {
    totalWorkouts: number
    totalMinutes: number | null
    totalCalories: number
    favoriteExerciseName?: string
    favoriteExerciseCount?: number
    favoriteExerciseMinutes: number | null
    longestWorkoutMinutes: number | null
    bestExerciseDay?: string
    exerciseTypeDistribution: Array<{
      name: string
      minutes: number | null
      calories: number
      count: number
    }>
    dailyExercise: Array<{
      date: string
      minutes: number | null
      calories: number
      workoutCount: number
    }>
  }
  dietStats: {
    loggedDays: number
    totalCalories: number
    averageCalories: number | null
    macroStatus: 'sufficient' | 'insufficient'
    macroLoggedDays: number
    macroTargets: {
      protein_g: number
      fat_g: number
      carbs_g: number
      sugar_g: number
    } | null
    totalProtein: number | null
    averageProtein: number | null
    totalCarbs: number | null
    averageCarbs: number | null
    totalFat: number | null
    averageFat: number | null
    favoriteFood?: string
    favoriteFoodCount?: number
    highestCalorieFood?: string
    highestCalorieFoodCalories: number | null
    bestProteinFood: string | null
    snackCount: number | null
    drinkCount: number | null
    foodRanking: Array<{ name: string; count: number; calories: number }>
    dailyDiet: Array<{
      date: string
      calories: number
      protein: number | null
      carbs: number | null
      fat: number | null
      sugar: number | null
      hasCompleteMacros: boolean
      foodCount: number
    }>
  }
  calorieStats: {
    totalCaloriesIn: number
    totalExerciseCalories: number
    estimatedTdeeTotal: number | null
    baseMetabolismTotal: number | null
    totalDeficit: number | null
    averageDailyDeficit: number | null
    deficitLevel: WeeklyDeficitLevel
    trackedDeficitDays: number
    dailyCalories: Array<{
      date: string
      caloriesIn: number
      exerciseCalories: number
      estimatedTdee: number | null
      baseMetabolism: number | null
      deficit: number | null
      status: WeeklyDeficitStatus
    }>
  }
  achievementStats: {
    totalCards: number
    exerciseKingCount: number
    fatLossPioneerCount: number
    foodKingCount: number
    bestAchievementDay?: string
    dailyAchievements: Array<{
      date: string
      achievements: Array<{
        type: WeeklyAchievementType
        title: string
        description: string
        cardImageUrl?: string
      }>
    }>
  }
  foxComment: string
  nextWeekSuggestions: Array<{
    type: WeeklySuggestionType
    title: string
    why: string
    content: string
    successMetric: string
    evidenceIds: string[]
  }>
  shareImageUrl?: string
}

export interface CommunitySharedWeeklyReportSummary {
  id: string
  weekStartDate: string
  weekEndDate: string
  weekNumber: number
  year: number
  overallTitle: string
  activeDays: number
  totalCalorieDeficit: number | null
  achievementCount: number
  sharedToCommunityAt: string
}
