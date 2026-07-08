import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'GRD-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, packageId } = req.body
  if (!userId || !packageId) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('id, provider_id, hotspot_id, name, price, duration_minutes, active')
      .eq('id', packageId)
      .maybeSingle()

    if (pkgError || !pkg || !pkg.active) {
      return res.status(404).json({ error: 'Package not found or inactive' })
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('profile_id', userId)
      .maybeSingle()

    if (walletError || !wallet) return res.status(404).json({ error: 'Wallet not found' })
    if (Number(wallet.balance) < Number(pkg.price)) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Top up first.' })
    }

    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('commission_rate, voucher_expiry_days, referral_reward_amount')
      .eq('id', 1)
      .maybeSingle()

    const commissionRate = Number(settings?.commission_rate ?? 0.15)
    const commissionAmount = Math.round(pkg.price * commissionRate * 100) / 100
    const providerEarning = Math.round((pkg.price - commissionAmount) * 100) / 100

    await supabaseAdmin
      .from('wallets')
      .update({ balance: Number(wallet.balance) - Number(pkg.price), updated_at: new Date().toISOString() })
      .eq('id', wallet.id)

    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'purchase',
      amount: pkg.price,
      status: 'completed',
      metadata: { package_id: packageId },
    })

    const { data: providerWallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('profile_id', pkg.provider_id)
      .maybeSingle()

    if (providerWallet) {
      await supabaseAdmin
        .from('wallets')
        .update({ balance: Number(providerWallet.balance) + providerEarning, updated_at: new Date().toISOString() })
        .eq('id', providerWallet.id)

      await supabaseAdmin.from('wallet_transactions').insert({
        wallet_id: providerWallet.id,
        type: 'commission',
        amount: providerEarning,
        status: 'completed',
        metadata: { package_id: packageId, from_purchase: true },
      })
    }

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: userId,
        package_id: packageId,
        hotspot_id: pkg.hotspot_id,
        amount: pkg.price,
        commission_amount: commissionAmount,
        provider_earning: providerEarning,
        status: 'completed',
      })
      .select()
      .single()

    if (purchaseError || !purchase) {
      await supabaseAdmin.from('wallets').update({ balance: Number(wallet.balance) }).eq('id', wallet.id)
      return res.status(500).json({ error: 'Could not complete purchase, wallet refunded' })
    }

    let code = generateVoucherCode()
    for (let i = 0; i < 3; i++) {
      const { data: existing } = await supabaseAdmin.from('vouchers').select('id').eq('code', code).maybeSingle()
      if (!existing) break
      code = generateVoucherCode()
    }

    const expiryDays = settings?.voucher_expiry_days ?? 7
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('vouchers')
      .insert({
        code,
        package_id: packageId,
        original_purchase_id: purchase.id,
        current_owner_id: userId,
        status: 'unused',
        original_price: pkg.price,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (voucherError) {
      return res.status(500).json({ error: 'Purchase completed but voucher creation failed. Contact support.' })
    }

    // notification for the buyer
    await supabaseAdmin.from('notifications').insert({
      profile_id: userId,
      type: 'payment',
      title: 'Purchase successful',
      message: `You bought ${pkg.name} for KSh ${pkg.price}. Voucher code: ${code}`,
    })

    // first-purchase referral reward check
    const { data: buyerProfile } = await supabaseAdmin
      .from('profiles').select('referred_by').eq('id', userId).maybeSingle()

    if (buyerProfile?.referred_by) {
      const { data: existingReferral } = await supabaseAdmin
        .from('referrals').select('id, status').eq('referred_id', userId).maybeSingle()

      if (existingReferral && existingReferral.status === 'pending') {
        const rewardAmount = Number(settings?.referral_reward_amount ?? 50)

        const { data: referrerWallet } = await supabaseAdmin
          .from('wallets').select('id, balance').eq('profile_id', buyerProfile.referred_by).maybeSingle()

        if (referrerWallet) {
          await supabaseAdmin.from('wallets')
            .update({ balance: Number(referrerWallet.balance) + rewardAmount, updated_at: new Date().toISOString() })
            .eq('id', referrerWallet.id)

          await supabaseAdmin.from('wallet_transactions').insert({
            wallet_id: referrerWallet.id, type: 'deposit', amount: rewardAmount, status: 'completed',
            metadata: { referral_reward: true, referred_id: userId },
          })

          await supabaseAdmin.from('referrals')
            .update({ status: 'completed', reward_amount: rewardAmount })
            .eq('id', existingReferral.id)

          await supabaseAdmin.from('notifications').insert({
            profile_id: buyerProfile.referred_by,
            type: 'referral_reward',
            title: 'Referral reward earned!',
            message: `You earned KSh ${rewardAmount} because a friend you invited made their first purchase.`,
          })
        }
      }
    }

    return res.status(200).json({ success: true, purchase, voucher })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error processing purchase' })
  }
}
