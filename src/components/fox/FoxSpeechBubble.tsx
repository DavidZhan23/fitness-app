import type { FoxBubbleStyle } from './foxTypes'

interface FoxSpeechBubbleProps {
  text: string
  style: FoxBubbleStyle
  onDismiss: () => void
}

export function FoxSpeechBubble({ text, style, onDismiss }: FoxSpeechBubbleProps) {
  return (
    <button
      type="button"
      className={`fox-speech-bubble fox-speech-bubble--${style}`}
      onClick={onDismiss}
      aria-label={`${text}，点击关闭`}
    >
      {text}
    </button>
  )
}
