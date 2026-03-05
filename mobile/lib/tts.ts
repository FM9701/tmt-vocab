import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

const TTS_API = 'https://tmt.vocab.app/api/tts'

let audioModeConfigured = false

// Persistent player instance
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

function getPlayer(): ReturnType<typeof createAudioPlayer> {
  if (!player) {
    player = createAudioPlayer({ uri: '' })
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.playing) {
        if (currentState !== 'playing') setState('playing')
      }
      if (status.didJustFinish) {
        setState('idle')
      }
      // If loaded but not playing and we're in loading state, it means ready
      if (status.isLoaded && !status.playing && currentState === 'loading') {
        // Player loaded, start playing
        player?.play()
      }
    })
  }
  return player
}

export async function speak(text: string) {
  try {
    await ensureAudioMode()
    await stopSpeaking()

    setState('loading')

    const uri = `${TTS_API}?text=${encodeURIComponent(text)}`
    const p = getPlayer()
    p.replace({ uri })
    p.play()
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
    } catch {}
  }
  if (currentState === 'playing' || currentState === 'loading') {
    setState('idle')
  }
}
