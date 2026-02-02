// 使用浏览器内置TTS（Web Speech API）

export async function speak(text: string): Promise<void> {
  if (typeof speechSynthesis === 'undefined') {
    console.warn('Speech synthesis not supported')
    return
  }

  // 停止当前播放
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

// 停止播放
export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
}
