import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
  let code = 'GRD-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, packageId } = req.body
  if (!userId || !packageId) return res.status(400).json({ error: 'Missing fields' })

  try {
    // fetch package + provider info
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('id, provider_id, hotspot_id, name, price, duration_minutes, active')
      .eq('id', packageId)
      .maybeSingle()

    if (pkgError || !pkg || !pkg.active) {
      return res.status(404).json({ error: 'Package not found or inactive' })
    }

    // fetch buyer wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('profile_id', userId)
      .maybeSingle()

    if (walletError || !wallet) return res.status(404).json({ error: 'Wallet not found' })
    if (Number(wallet.balance) < Number(pkg.price)) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Top up first.' })
    }

    // fetch commission rate
    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('commission_rate')
      .eq('id', 1)
      .maybeSingle()

    const commissionRate = Number(settings?.commission_rate ?? 0.15)
    const commissionAmount = Math.round(pkg.price * commissionRate * 100) / 100
    const providerEarning = Math.round((pkg.price - commissionAmount) * 100) / 100

    // deduct wallet
    await supabaseAdmin
      .from('wallets')
      .update({ balance: Number(wallet.balance) - Number(pkg.price), updated_at: new Date().toISOString() })
      .eq('id', wallet.id)

    // log wallet transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'purchase',
      amount: pkg.price,
      status: 'completed',
      metadata: { package_id: packageId },
    })
// credit provider's wallet with their earning share
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
    // create purchase record
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
      // refund wallet since purchase record failed
      await supabaseAdmin
        .from('wallets')
        .update({ balance: Number(wallet.balance) })
        .eq('id', wallet.id)
      return res.status(500).json({ error: 'Could not complete purchase, wallet refunded' })
    }

    // generate voucher (unused - user can redeem now or list for resale)
    let code = generateVoucherCode()
    // simple retry loop in case of rare collision
    for (let i = 0; i < 3; i++) {
      const { data: existing } = await supabaseAdmin.from('vouchers').select('id').eq('code', code).maybeSingle()
      if (!existing) break
      code = generateVoucherCode()
    }

    const { data: settingsExpiry } = await supabaseAdmin
      .from('platform_settings')
      .select('voucher_expiry_days')
      .eq('id', 1)
      .maybeSingle()

    const expiryDays = settingsExpiry?.voucher_expiry_days ?? 7
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

    return res.status(200).json({ success: true, purchase, voucher })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error processing purchase' })
  }
}
