import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { providerId } = req.body
  if (!providerId) return res.status(400).json({ error: 'Missing providerId' })

  try {
    const { data: hotspots } = await supabaseAdmin
      .from('hotspots').select('id, name, health_score').eq('provider_id', providerId)
    const hotspotIds = (hotspots || []).map((h) => h.id)

    if (hotspotIds.length === 0) {
      return res.status(200).json({ insight: "Register a hotspot and add packages to start seeing AI insights here." })
    }

    const { data: packages } = await supabaseAdmin
      .from('packages').select('id, name, price').in('hotspot_id', hotspotIds)
    const packageIds = (packages || []).map((p) => p.id)

    const { data: purchases } = await supabaseAdmin
      .from('purchases')
      .select('package_id, amount, provider_earning, created_at')
      .in('package_id', packageIds.length ? packageIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!purchases || purchases.length === 0) {
      return res.status(200).json({ insight: "No sales yet — once you get your first few purchases, insights on pricing and peak hours will appear here." })
    }

    // compute peak hour (0-23) from purchase timestamps
    const hourCounts: Record<number, number> = {}
    purchases.forEach((p) => {
      const hour = new Date(p.created_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    // best-selling package
    const pkgCounts: Record<string, number> = {}
    purchases.forEach((p) => { pkgCounts[p.package_id] = (pkgCounts[p.package_id] || 0) + 1 })
    const bestPkgId = Object.entries(pkgCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const bestPkg = (packages || []).find((p) => p.id === bestPkgId)

    const totalRevenue = purchases.reduce((s, p) => s + Number(p.provider_earning), 0)
    const avgHealthScore = (hotspots || []).reduce((s, h) => s + Number(h.health_score), 0) / (hotspots?.length || 1)

    const statsSummary = `
Hotspots: ${hotspots?.map((h) => h.name).join(', ')}
Average health score: ${avgHealthScore.toFixed(1)}/100
Total completed sales: ${purchases.length}
Total earnings: KSh ${totalRevenue.toFixed(2)}
Peak selling hour: ${peakHour}:00
Best-selling package: ${bestPkg?.name || 'unknown'} at KSh ${bestPkg?.price || '?'}
Package price range: ${(packages || []).map((p) => `${p.name} (KSh ${p.price})`).join(', ')}
    `.trim()

    const openaiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a business analyst for a Kenyan Wi-Fi hotspot provider on GRIDNET AI. Based on this data, write a short (3-4 sentence), plain-language, practical insight with one concrete pricing or scheduling suggestion. No headers, no bullet points, just direct advice like you're talking to the business owner.\n\nData:\n${statsSummary}`,
        }],
      }),
    })

    const openaiData = await openaiRes.json()
    const insight = openaiData?.content?.[0]?.text || 'Could not generate insight right now — try again shortly.'

    return res.status(200).json({ insight, stats: { peakHour, bestPackage: bestPkg?.name, totalRevenue, avgHealthScore } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error generating insights' })
  }
}
