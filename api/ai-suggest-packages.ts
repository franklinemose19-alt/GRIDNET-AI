import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { providerId, hotspotId } = req.body
  if (!providerId || !hotspotId) return res.status(400).json({ error: 'Missing fields' })

  try {
    // fetch this provider's tier caps so suggestions never exceed what they're allowed to sell
    const { data: tier } = await supabaseAdmin.rpc('get_provider_tier', { p_provider_id: providerId })
    const { data: settings } = await supabaseAdmin.from('platform_settings').select('*').eq('id', 1).maybeSingle()

    const tierKey = (tier as string) || 'free'
    const maxSpeed = settings?.[`${tierKey}_max_speed_mbps`] ?? null
    const maxData = settings?.[`${tierKey}_max_data_mb`] ?? null

    const { data: hotspot } = await supabaseAdmin.from('hotspots').select('name, address').eq('id', hotspotId).maybeSingle()

    const constraints = `
Provider tier: ${tierKey}
Max allowed package speed: ${maxSpeed ? maxSpeed + ' Mbps' : 'unlimited'}
Max allowed package data: ${maxData ? maxData + ' MB' : 'unlimited'}
Hotspot: ${hotspot?.name || 'unnamed'} at ${hotspot?.address || 'unknown location'}
Market: Kenya, pricing in KSh, typical hotspot billing (cafés, estates, campuses)
    `.trim()

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are pricing internet packages for a Wi-Fi hotspot provider on GRIDNET AI in Kenya. Given these constraints:\n\n${constraints}\n\nSuggest exactly 4 packages (a short pass, a medium pass, a daily pass, and one more useful option) with realistic Kenya-market KSh pricing. Respond with ONLY a raw JSON array, no markdown, no explanation, no code fences. Each item must have exactly these fields: name (string), duration_minutes (integer), price (number, KSh), data_limit_mb (integer or null for unlimited), speed_limit_mbps (number, must not exceed the max allowed above).`,
        }],
      }),
    })

    const aiData = await aiRes.json()
    const rawText = aiData?.content?.[0]?.text || '[]'

    let suggestions
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      suggestions = JSON.parse(cleaned)
    } catch {
      return res.status(500).json({ error: 'AI returned an unexpected format, try again' })
    }

    // safety clamp - never trust the model to respect caps perfectly
    suggestions = suggestions.map((s: any) => ({
      name: s.name,
      duration_minutes: s.duration_minutes,
      price: s.price,
      data_limit_mb: maxData && (!s.data_limit_mb || s.data_limit_mb > maxData) ? maxData : s.data_limit_mb,
      speed_limit_mbps: maxSpeed && (!s.speed_limit_mbps || s.speed_limit_mbps > maxSpeed) ? maxSpeed : s.speed_limit_mbps,
    }))

    return res.status(200).json({ suggestions })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error generating package suggestions' })
  }
}
