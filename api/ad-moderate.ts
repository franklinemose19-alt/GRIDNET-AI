import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { businessName, description, imageUrls, contactPhone, contactWhatsapp } = req.body
  if (!businessName || !description) return res.status(400).json({ error: 'Missing fields' })

  try {
    const content: any[] = []

    const urls = Array.isArray(imageUrls) ? imageUrls.slice(0, 3) : []
    for (const url of urls) {
      content.push({ type: 'image', source: { type: 'url', url } })
    }

    const promptText = [
      'You are the safety moderator for a local advertising marketplace in Kenya called GRIDNET AI.',
      'Review this advert submission and assess risk level.',
      '',
      'Business name: ' + businessName,
      'Description: ' + description,
      'Contact phone: ' + (contactPhone || 'none'),
      'Contact WhatsApp: ' + (contactWhatsapp || 'none'),
      '',
      'Check images (if provided) for: nudity, sexual content, graphic violence, illegal products, dangerous items, fake/manipulated images.',
      'Check text for: scam language, fraud attempts, fake promotions, misleading claims, hate speech, spam, restricted/illegal products.',
      '',
      'Respond with ONLY a raw JSON object, no markdown, no code fences, exactly this shape:',
      '{"risk_level": "low" | "medium" | "high", "reason": "short plain-language explanation, 1-2 sentences"}',
      '',
      'low = clearly safe, approve automatically.',
      'medium = unclear or borderline, needs a human to check before publishing.',
      'high = clear violation, must be rejected automatically.',
    ].join('\n')

    content.push({ type: 'text', text: promptText })

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content }],
      }),
    })

    const aiData = await aiRes.json()
    const rawText = aiData && aiData.content && aiData.content[0] ? aiData.content[0].text : ''

    let result
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      // fail safe: if AI response can't be parsed, treat as medium risk for manual review rather than blocking or auto-approving
      result = { risk_level: 'medium', reason: 'Automated review inconclusive, sent for manual check.' }
    }

    if (!['low', 'medium', 'high'].includes(result.risk_level)) {
      result = { risk_level: 'medium', reason: 'Automated review inconclusive, sent for manual check.' }
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error running moderation' })
  }
}
