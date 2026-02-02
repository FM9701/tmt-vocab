// Vercel Serverless Function for Volcengine TTS

interface TTSRequest {
  text: string
}

interface VolcengineResponse {
  reqid: string
  code: number
  message: string
  operation: string
  sequence: number
  data: string // base64 encoded audio
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { text } = (await req.json()) as TTSRequest

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Volcengine TTS API
    const accessKey = process.env.VOLCENGINE_ACCESS_KEY
    const appId = process.env.VOLCENGINE_APP_ID || '1639469671'

    if (!accessKey) {
      return new Response(JSON.stringify({ error: 'TTS not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${accessKey}`,
      },
      body: JSON.stringify({
        app: {
          appid: appId,
          token: accessKey,
          cluster: 'volcano_tts',
        },
        user: {
          uid: 'tmt-vocab-user',
        },
        audio: {
          voice_type: 'BV001_streaming', // 自然女声
          encoding: 'mp3',
          speed_ratio: 0.95, // 稍微慢一点便于学习
          pitch_ratio: 1.0,
        },
        request: {
          reqid: `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: text,
          operation: 'query',
        },
      }),
    })

    const result = (await response.json()) as VolcengineResponse

    if (result.code !== 3000) {
      console.error('Volcengine TTS error:', result)
      return new Response(JSON.stringify({ error: result.message || 'TTS failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Convert base64 to binary
    const audioBuffer = Buffer.from(result.data, 'base64')

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  runtime: 'edge',
}
