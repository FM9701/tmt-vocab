// TTS with Volcengine API and browser fallback

let audioContext: AudioContext | null = null
let currentAudio: HTMLAudioElement | null = null

// 初始化音频上下文（iOS需要用户交互后才能播放）
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

// 解锁iOS音频（需要在用户交互时调用）
export function unlockAudio(): void {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  // 播放静音来解锁
  const buffer = ctx.createBuffer(1, 1, 22050)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
}

// 使用火山引擎TTS API
async function speakWithVolcengine(text: string): Promise<boolean> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      console.warn('Volcengine TTS failed:', response.status)
      return false
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    // 停止当前播放
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }

    return new Promise((resolve) => {
      const audio = new Audio(audioUrl)
      currentAudio = audio

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        resolve(true)
      }

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        resolve(false)
      }

      // 尝试解锁音频上下文
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      audio.play().catch(() => {
        resolve(false)
      })
    })
  } catch (error) {
    console.warn('Volcengine TTS error:', error)
    return false
  }
}

// 使用浏览器内置TTS作为后备
function speakWithBrowser(text: string): void {
  if (typeof speechSynthesis === 'undefined') {
    console.warn('Speech synthesis not supported')
    return
  }

  speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  utterance.pitch = 1.0
  utterance.volume = 1.0

  // 尝试选择更好的英语语音
  const voices = speechSynthesis.getVoices()
  const englishVoice = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel'))
  ) || voices.find(v => v.lang.startsWith('en-US'))

  if (englishVoice) {
    utterance.voice = englishVoice
  }

  speechSynthesis.speak(utterance)
}

// 主要的发音函数 - 先尝试火山引擎，失败则用浏览器TTS
export async function speak(text: string): Promise<void> {
  // 先尝试火山引擎
  const success = await speakWithVolcengine(text)

  // 如果失败，使用浏览器TTS
  if (!success) {
    speakWithBrowser(text)
  }
}

// 停止播放
export function stopSpeaking(): void {
  // 停止火山引擎播放
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  // 停止浏览器TTS
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
}
