import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { providerId, tier } = req.body
  if (!providerId || !['pro', 'premium'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' })
  }

  try {
    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('pro_tier_price, premium_tier_price')
      .eq('id', 1)
      .maybeSingle()

    const price = tier === 'pro' ? Number(settings?.pro_tier_price ?? 500) : Number(settings?.premium_tier_price ?? 1200)

    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('id, balance').eq('profile_id', providerId).maybeSingle()

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' })
    if (Number(wallet.balance) < price) {
      return res.status(400).json({ error: `Insufficient balance. Top up your wallet with KSh ${price} to subscribe.` })
    }

    await supabaseAdmin.from('wallets')
      .update({ balance: Number(wallet.balance) - price, updated_at: new Date().toISOString() })
      .eq('id', wallet.id)

    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: wallet.id, type: 'purchase', amount: price, status: 'completed',
      metadata: { subscription_tier: tier },
    })

    // cancel any existing active subscription, then create the new one
    await supabaseAdmin.from('provider_subscriptions')
      .update({ status: 'cancelled' })
      .eq('provider_id', providerId).eq('status', 'active')

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: sub, error: subErr } = await supabaseAdmin
      .from('provider_subscriptions')
      .insert({
        provider_id: providerId,
        tier,
        status: 'active',
        monthly_price: price,
        current_period_end: periodEnd,
      })
      .select()
      .single()

    if (subErr) return res.status(500).json({ error: 'Subscription payment taken but record failed. Contact support.' })

    return res.status(200).json({ success: true, subscription: sub })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error creating subscription' })
  }
}
