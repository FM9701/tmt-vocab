// 音频缓存
const audioCache = new Map<string, string>()

// 当前播放的音频
let currentAudio: HTMLAudioElement | null = null

export async function speak(text: string): Promise<void> {
  // 停止当前播放
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  // 检查缓存
  let audioUrl = audioCache.get(text)

  if (!audioUrl) {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('TTS request failed')
      }

      const blob = await response.blob()
      audioUrl = URL.createObjectURL(blob)
      audioCache.set(text, audioUrl)
    } catch (error) {
      console.error('TTS error, falling back to browser TTS:', error)
      // 回退到浏览器TTS
      fallbackSpeak(text)
      return
    }
  }

  // 播放音频
  currentAudio = new Audio(audioUrl)
  currentAudio.play().catch(error => {
    console.error('Audio play error:', error)
    fallbackSpeak(text)
  })
}

// 浏览器TTS回退方案
function fallbackSpeak(text: string): void {
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  speechSynthesis.speak(utterance)
}

// 停止播放
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  speechSynthesis.cancel()
}
