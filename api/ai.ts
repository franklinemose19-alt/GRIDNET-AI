import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data && data.content && data.content[0] ? data.content[0].text : ''
}

async function handleInsights(req: VercelRequest, res: VercelResponse) {
  const { providerId } = req.body
  if (!providerId) return res.status(400).json({ error: 'Missing providerId' })

  const hotspotsResult = await supabaseAdmin.from('hotspots').select('id, name, health_score').eq('provider_id', providerId)
  const hotspots = hotspotsResult.data || []
  const hotspotIds = hotspots.map((h) => h.id)

  if (hotspotIds.length === 0) {
    return res.status(200).json({ insight: 'Register a hotspot and add packages to start seeing AI insights here.' })
  }

  const packagesResult = await supabaseAdmin.from('packages').select('id, name, price').in('hotspot_id', hotspotIds)
  const packages = packagesResult.data || []
  const packageIds = packages.map((p) => p.id)

  const purchasesResult = await supabaseAdmin
    .from('purchases')
    .select('package_id, amount, provider_earning, created_at')
    .in('package_id', packageIds.length ? packageIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(200)

  const purchases = purchasesResult.data || []

  if (purchases.length === 0) {
    return res.status(200).json({ insight: 'No sales yet - once you get your first few purchases, insights on pricing and peak hours will appear here.' })
  }

  const hourCounts: Record<number, number> = {}
  purchases.forEach((p) => {
    const hour = new Date(p.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

  const pkgCounts: Record<string, number> = {}
  purchases.forEach((p) => { pkgCounts[p.package_id] = (pkgCounts[p.package_id] || 0) + 1 })
  const bestPkgEntry = Object.entries(pkgCounts).sort((a, b) => b[1] - a[1])[0]
  const bestPkg = bestPkgEntry ? packages.find((p) => p.id === bestPkgEntry[0]) : null

  const totalRevenue = purchases.reduce((s, p) => s + Number(p.provider_earning), 0)
  const avgHealthScore = hotspots.reduce((s, h) => s + Number(h.health_score), 0) / (hotspots.length || 1)

  const statsSummary = [
    'Hotspots: ' + hotspots.map((h) => h.name).join(', '),
    'Average health score: ' + avgHealthScore.toFixed(1) + '/100',
    'Total completed sales: ' + purchases.length,
    'Total earnings: KSh ' + totalRevenue.toFixed(2),
    'Peak selling hour: ' + (peakHour ? peakHour[0] : '?') + ':00',
    'Best-selling package: ' + (bestPkg ? bestPkg.name : 'unknown') + ' at KSh ' + (bestPkg ? bestPkg.price : '?'),
    'Package price range: ' + packages.map((p) => p.name + ' (KSh ' + p.price + ')').join(', '),
  ].join('\n')

  const prompt = 'You are a business analyst for a Kenyan Wi-Fi hotspot provider on GRIDNET AI. Based on this data, write a short (3-4 sentence), plain-language, practical insight with one concrete pricing or scheduling suggestion. No headers, no bullet points, just direct advice like you are talking to the business owner.\n\nData:\n' + statsSummary

  const insight = await callClaude(prompt, 300)

  return res.status(200).json({
    insight: insight || 'Could not generate insight right now - try again shortly.',
    stats: { peakHour: peakHour ? peakHour[0] : null, bestPackage: bestPkg ? bestPkg.name : null, totalRevenue, avgHealthScore },
  })
}

async function handleSuggestPackages(req: VercelRequest, res: VercelResponse) {
  const { providerId, hotspotId } = req.body
  if (!providerId || !hotspotId) return res.status(400).json({ error: 'Missing fields' })

  const tierResult = await supabaseAdmin.rpc('get_provider_tier', { p_provider_id: providerId })
  const settingsResult = await supabaseAdmin.from('platform_settings').select('*').eq('id', 1).maybeSingle()

  const tierKey = (tierResult.data as string) || 'free'
  const settings = settingsResult.data as any
  const maxSpeed = settings ? settings[tierKey + '_max_speed_mbps'] : null
  const maxData = settings ? settings[tierKey + '_max_data_mb'] : null

  const hotspotResult = await supabaseAdmin.from('hotspots').select('name, address').eq('id', hotspotId).maybeSingle()
  const hotspot = hotspotResult.data

  const constraints = [
    'Provider tier: ' + tierKey,
    'Max allowed package speed: ' + (maxSpeed ? maxSpeed + ' Mbps' : 'unlimited'),
    'Max allowed package data: ' + (maxData ? maxData + ' MB' : 'unlimited'),
    'Hotspot: ' + (hotspot ? hotspot.name : 'unnamed') + ' at ' + (hotspot ? hotspot.address : 'unknown location'),
    'Market: Kenya, pricing in KSh, typical hotspot billing (cafes, estates, campuses)',
  ].join('\n')

  const prompt = 'You are pricing internet packages for a Wi-Fi hotspot provider on GRIDNET AI in Kenya. Given these constraints:\n\n' + constraints + '\n\nSuggest exactly 4 packages (a short pass, a medium pass, a daily pass, and one more useful option) with realistic Kenya-market KSh pricing. Respond with ONLY a raw JSON array, no markdown, no explanation, no code fences. Each item must have exactly these fields: name (string), duration_minutes (integer), price (number, KSh), data_limit_mb (integer or null for unlimited), speed_limit_mbps (number, must not exceed the max allowed above).'

  const rawText = await callClaude(prompt, 600)

  let suggestions
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    suggestions = JSON.parse(cleaned)
  } catch {
    return res.status(500).json({ error: 'AI returned an unexpected format, try again' })
  }

  suggestions = suggestions.map((s: any) => ({
    name: s.name,
    duration_minutes: s.duration_minutes,
    price: s.price,
    data_limit_mb: maxData && (!s.data_limit_mb || s.data_limit_mb > maxData) ? maxData : s.data_limit_mb,
    speed_limit_mbps: maxSpeed && (!s.speed_limit_mbps || s.speed_limit_mbps > maxSpeed) ? maxSpeed : s.speed_limit_mbps,
  }))

  return res.status(200).json({ suggestions })
}

async function handleFraudScan(req: VercelRequest, res: VercelResponse) {
  let flagsCreated = 0

  const depositsResult = await supabaseAdmin
    .from('wallet_transactions')
    .select('wallet_id, amount, created_at')
    .eq('type', 'deposit').eq('status', 'completed')
    .gte('amount', 1000)
    .order('created_at', { ascending: false })
    .limit(100)

  for (const dep of depositsResult.data || []) {
    const walletResult = await supabaseAdmin.from('wallets').select('profile_id').eq('id', dep.wallet_id).maybeSingle()
    const wallet = walletResult.data
    if (!wallet) continue

    const withdrawalsResult = await supabaseAdmin
      .from('withdrawals')
      .select('id, created_at, amount')
      .eq('provider_id', wallet.profile_id)
      .gte('created_at', dep.created_at)
      .order('created_at', { ascending: true })
      .limit(1)

    const w = withdrawalsResult.data && withdrawalsResult.data[0]
    if (w) {
      const minutesApart = (new Date(w.created_at).getTime() - new Date(dep.created_at).getTime()) / 60000
      if (minutesApart >= 0 && minutesApart <= 5) {
        const existingResult = await supabaseAdmin
          .from('fraud_flags').select('id').eq('related_id', w.id).eq('flag_type', 'suspicious_withdrawal').maybeSingle()
        if (!existingResult.data) {
          await supabaseAdmin.from('fraud_flags').insert({
            flag_type: 'suspicious_withdrawal',
            related_profile_id: wallet.profile_id,
            related_table: 'withdrawals',
            related_id: w.id,
            severity: 4,
            details: { deposit_amount: dep.amount, withdrawal_amount: w.amount, minutes_apart: minutesApart },
          })
          flagsCreated++
        }
      }
    }
  }

  const allProfilesResult = await supabaseAdmin.from('profiles').select('id, phone').not('phone', 'is', null)
  const phoneMap: Record<string, string[]> = {}
  ;(allProfilesResult.data || []).forEach((p) => {
    if (!p.phone) return
    phoneMap[p.phone] = phoneMap[p.phone] || []
    phoneMap[p.phone].push(p.id)
  })
  for (const phone in phoneMap) {
    const ids = phoneMap[phone]
    if (ids.length > 1) {
      for (const id of ids) {
        const existingResult = await supabaseAdmin
          .from('fraud_flags').select('id').eq('related_profile_id', id).eq('flag_type', 'multi_account').maybeSingle()
        if (!existingResult.data) {
          await supabaseAdmin.from('fraud_flags').insert({
            flag_type: 'multi_account',
            related_profile_id: id,
            related_table: 'profiles',
            related_id: id,
            severity: 3,
            details: { shared_phone: phone, linked_accounts: ids.length },
          })
          flagsCreated++
        }
      }
    }
  }

  const recentResalesResult = await supabaseAdmin
    .from('voucher_resales')
    .select('id, voucher_id, seller_id, buyer_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const voucherResaleCounts: Record<string, number> = {}
  ;(recentResalesResult.data || []).forEach((r) => {
    voucherResaleCounts[r.voucher_id] = (voucherResaleCounts[r.voucher_id] || 0) + 1
  })
  for (const voucherId in voucherResaleCounts) {
    const count = voucherResaleCounts[voucherId]
    if (count >= 3) {
      const existingResult = await supabaseAdmin
        .from('fraud_flags').select('id').eq('related_id', voucherId).eq('flag_type', 'fake_voucher_use').maybeSingle()
      if (!existingResult.data) {
        await supabaseAdmin.from('fraud_flags').insert({
          flag_type: 'fake_voucher_use',
          related_table: 'vouchers',
          related_id: voucherId,
          severity: 3,
          details: { resale_count: count },
        })
        flagsCreated++
      }
    }
  }

  return res.status(200).json({ success: true, flagsCreated })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = req.body && req.body.action

  try {
    if (action === 'insights') return await handleInsights(req, res)
    if (action === 'suggest-packages') return await handleSuggestPackages(req, res)
    if (action === 'fraud-scan') return await handleFraudScan(req, res)
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error processing AI request' })
  }
}
