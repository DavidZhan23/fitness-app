export type Sex = 'male' | 'female'

/** 打卡墙展示：classic 同页双热力图；split 运动墙/代谢墙分屏切换 */
export type WallStyle = 'classic' | 'split'

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
  /** 打卡墙样式，默认 classic */
  wall_style?: WallStyle
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
