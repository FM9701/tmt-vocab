export const config = {
  runtime: 'edge',
}

// 火山引擎TTS API
const TTS_API = 'https://openspeech.bytedance.com/api/v1/tts'

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { text } = await request.json()

  if (!text || typeof text !== 'string') {
    return new Response('Text is required', { status: 400 })
  }

  const appId = process.env.VOLC_APP_ID
  const accessKey = process.env.VOLC_ACCESS_KEY
  const secretKey = process.env.VOLC_SECRET_KEY

  if (!appId || !accessKey || !secretKey) {
    console.error('Volc credentials not configured')
    return new Response('TTS not configured', { status: 500 })
  }

  try {
    // 生成token (Base64编码的 accessKey:secretKey)
    const token = btoa(`${accessKey}:${secretKey}`)

    const requestBody = {
      app: {
        appid: appId,
        token: 'access_token',
        cluster: 'volcano_tts'
      },
      user: {
        uid: 'tmt-vocab-user'
      },
      audio: {
        voice_type: 'en_us_amadeus', // 美式英语男声
        encoding: 'mp3',
        speed_ratio: 1.0,
        volume_ratio: 1.0,
        pitch_ratio: 1.0
      },
      request: {
        reqid: crypto.randomUUID(),
        text: text,
        text_type: 'plain',
        operation: 'query'
      }
    }

    const response = await fetch(TTS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${token}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Volc TTS error:', response.status, errorText)
      return new Response('TTS generation failed', { status: 500 })
    }

    const result = await response.json()

    if (result.code !== 3000 || !result.data) {
      console.error('Volc TTS error:', result)
      return new Response('TTS generation failed', { status: 500 })
    }

    // 返回音频数据 (Base64解码)
    const audioData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0))

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
