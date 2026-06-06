/** 饮食拍照指引文案（与 server qwenVision.js MEAL_PHOTO_SHOOTING_GUIDE 保持一致） */

export const MEAL_PHOTO_GUIDE_STORAGE_KEY = 'fitness.mealPhotoGuide.dismissed'

export const MEAL_PHOTO_DISTANCE = {
  single: '30–40 cm',
  multi: '40–60 cm',
} as const

export const MEAL_PHOTO_GUIDE_TIPS = [
  {
    id: 'distance-single',
    title: '单道菜',
    body: `手机镜头距食物约 ${MEAL_PHOTO_DISTANCE.single}（约前臂长度，可想象「一个饭碗的距离」）。`,
  },
  {
    id: 'distance-multi',
    title: '多道菜 / 整桌',
    body: `镜头距食物约 ${MEAL_PHOTO_DISTANCE.multi}，确保每道菜都在画面内。`,
  },
  {
    id: 'angle',
    title: '拍摄角度',
    body: '从斜上方 45°–90° 俯拍，尽量看到碗口、盘面或食物层次。',
  },
  {
    id: 'frame',
    title: '构图',
    body: '主要食物约占画面 60%–80%，不要离太远或只拍局部。',
  },
  {
    id: 'light',
    title: '光线',
    body: '选择明亮位置，避免逆光；太暗时可打开闪光灯。',
  },
  {
    id: 'reference',
    title: '份量参考（可选）',
    body: '旁放筷子、勺子或常见碗盘，有助于 AI 更准确估份量。',
  },
] as const

export const MEAL_PHOTO_CAPTURE_HINT =
  '将食物置于画面中央 · 单菜距镜头约一臂长（30–40 cm）'

export const MEAL_PHOTO_SECTION_HINT =
  '按指引拍摄后，AI 会识别食物并估算千卡；结果可在保存前调整。'
