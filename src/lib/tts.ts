// 音频缓存
const audioCache = new Map<string, string>()

// 当前播放的音频
let currentAudio: HTMLAudioElement | null = null

// iOS音频解锁状态
let audioUnlocked = false

// 解锁iOS音频（需要在用户交互时调用）
function unlockAudio(): void {
  if (audioUnlocked) return

  // 创建并播放一个静音音频来解锁
  const audio = new Audio()
  audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAgAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAANcAJQBUAAAP/6ERERAREREf/jGMQSDXwGQB1AAAD/+hEREYRERP/jGMQgEGACUB9IAAD/+hEREREREf/jGMQsAAADSAHAAAD/+hERERERGQ=='
  audio.volume = 0.01
  audio.play().then(() => {
    audioUnlocked = true
    audio.pause()
  }).catch(() => {
    // 忽略错误
  })
}

// 在用户首次交互时解锁音频
if (typeof document !== 'undefined') {
  const unlock = () => {
    unlockAudio()
    document.removeEventListener('touchstart', unlock)
    document.removeEventListener('click', unlock)
  }
  document.addEventListener('touchstart', unlock, { once: true })
  document.addEventListener('click', unlock, { once: true })
}

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
      fallbackSpeak(text)
      return
    }
  }

  // 播放音频
  try {
    currentAudio = new Audio(audioUrl)
    currentAudio.volume = 1.0
    await currentAudio.play()
  } catch (error) {
    console.error('Audio play error:', error)
    fallbackSpeak(text)
  }
}

// 浏览器TTS回退方案
function fallbackSpeak(text: string): void {
  if (typeof speechSynthesis === 'undefined') return

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
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
}
