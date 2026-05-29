const GREETING_TITLE_PUNCT = /[，,。、；;：:！!？?]/

export function shouldAllowHeroGreetingWrap(options: {
  customTitle: string
  title: string
}): boolean {
  if (options.customTitle) return true
  const titleLength = Array.from(options.title).length
  if (titleLength >= 10) return true
  return GREETING_TITLE_PUNCT.test(options.title)
}
