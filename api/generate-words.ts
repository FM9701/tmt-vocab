// Vercel Serverless Function for generating TMT vocabulary via DeepSeek API

interface GenerateRequest {
  category?: string
  count?: number
  existingWords?: string[] // word strings to avoid duplicates
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
    const { category, count = 10, existingWords = [] } = (await req.json()) as GenerateRequest

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DeepSeek API not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const categoryMap: Record<string, string> = {
      'earnings': '财报与估值 (earnings calls, financial metrics, valuation)',
      'ai-ml': 'AI/ML技术 (artificial intelligence, machine learning, deep learning)',
      'semiconductor': '半导体供应链 (semiconductor manufacturing, chip design, supply chain)',
      'cloud-saas': '云计算/SaaS (cloud computing, SaaS metrics, enterprise software)',
      'm7': 'M7公司业务 (Magnificent 7 tech companies: Apple, Microsoft, Google, Amazon, Meta, NVIDIA, Tesla)',
      'conference': '电话会议/研报 (earnings calls, analyst reports, investor relations)',
    }

    const categoryHint = category && category !== 'all' && categoryMap[category]
      ? `Focus on the category: ${categoryMap[category]}.`
      : 'Cover a mix of categories: earnings, ai-ml, semiconductor, cloud-saas, m7, conference.'

    const existingList = existingWords.length > 0
      ? `\n\nDo NOT generate any of these words (already in the vocabulary): ${existingWords.join(', ')}`
      : ''

    const prompt = `Generate ${count} TMT (Technology, Media, Telecom) industry English vocabulary words for a learning app targeting Chinese speakers who work in tech/finance.

${categoryHint}${existingList}

Return a JSON array of objects with this exact format:
[
  {
    "word": "the English word or phrase",
    "pronunciation": "/phonetic transcription/",
    "partOfSpeech": "noun/verb/adjective/phrase",
    "definition": "Clear English definition",
    "definitionCn": "简洁的中文释义",
    "example": "A realistic example sentence using the word in a TMT/finance context, referencing real companies like Apple, NVIDIA, Microsoft, etc.",
    "exampleCn": "例句的中文翻译",
    "context": "使用场景和补充说明（中文），包括常见搭配、相关概念等",
    "category": "${category && category !== 'all' ? category : 'one of: earnings, ai-ml, semiconductor, cloud-saas, m7, conference'}",
    "difficulty": "one of: beginner, intermediate, advanced"
  }
]

Requirements:
- Words should be commonly used in earnings calls, analyst reports, tech conferences, and financial discussions
- Examples should reference real companies and realistic scenarios
- Each word should be distinct and useful for someone analyzing TMT stocks
- Return ONLY the JSON array, no other text`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a TMT industry vocabulary expert. You generate high-quality English vocabulary words used in technology, media, and telecom sectors. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = result.choices?.[0]?.message?.content
    if (!content) {
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Parse the JSON from the response (handle markdown code blocks)
    let words
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      words = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse AI response:', content)
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Add unique IDs
    const timestamp = Date.now()
    const wordsWithIds = words.map((w: Record<string, unknown>, i: number) => ({
      ...w,
      id: `gen-${timestamp}-${i}`,
    }))

    return new Response(JSON.stringify({ words: wordsWithIds }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Generate words error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const config = {
  runtime: 'edge',
}
