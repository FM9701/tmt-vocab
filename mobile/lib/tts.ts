import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

const TTS_API = 'https://tmt.vocab.app/api/tts'

let audioModeConfigured = false
let player: ReturnType<typeof createAudioPlayer> | null = null

// TTS state listeners
type TTSState = 'idle' | 'loading' | 'playing' | 'error'
type TTSListener = (state: TTSState) => void
const listeners = new Set<TTSListener>()
let currentState: TTSState = 'idle'

function setState(state: TTSState) {
  currentState = state
  listeners.forEach((fn) => fn(state))
}

export function getTTSState(): TTSState {
  return currentState
}

export function subscribeTTS(fn: TTSListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function ensureAudioMode() {
  if (!audioModeConfigured) {
    await setAudioModeAsync({
      playsInSilentMode: true,
    })
    audioModeConfigured = true
  }
}

export async function speak(text: string) {
  try {
    await ensureAudioMode()

    // Stop any currently playing audio
    await stopSpeaking()

    setState('loading')

    const uri = `${TTS_API}?text=${encodeURIComponent(text)}`

    // Clean up old player
    if (player) {
      player.remove()
      player = null
    }

    player = createAudioPlayer(uri)

    // Listen for status changes
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.playing) {
        if (currentState !== 'playing') setState('playing')
      } else if (status.didJustFinish) {
        setState('idle')
        if (player) {
          player.remove()
          player = null
        }
      }
    })

    player.play()
  } catch (error) {
    console.error('TTS error:', error)
    setState('error')
    setTimeout(() => {
      if (currentState === 'error') setState('idle')
    }, 2000)
  }
}

export async function stopSpeaking() {
  if (player) {
    try {
      player.pause()
      player.remove()
    } catch {}
    player = null
  }
  if (currentState === 'playing' || currentState === 'loading') {
    setState('idle')
  }
}
