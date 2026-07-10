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

async function handlePurchasePackage(req: VercelRequest, res: VercelResponse) {
  const { userId, packageId } = req.body
  if (!userId || !packageId) return res.status(400).json({ error: 'Missing fields' })

  const pkgResult = await supabaseAdmin
    .from('packages')
    .select('id, provider_id, hotspot_id, name, price, duration_minutes, active')
    .eq('id', packageId)
    .maybeSingle()

  const pkg = pkgResult.data
  if (pkgResult.error || !pkg || !pkg.active) {
    return res.status(404).json({ error: 'Package not found or inactive' })
  }

  const walletResult = await supabaseAdmin.from('wallets').select('id, balance').eq('profile_id', userId).maybeSingle()
  const wallet = walletResult.data
  if (walletResult.error || !wallet) return res.status(404).json({ error: 'Wallet not found' })
  if (Number(wallet.balance) < Number(pkg.price)) {
    return res.status(400).json({ error: 'Insufficient wallet balance. Top up first.' })
  }

  const settingsResult = await supabaseAdmin
    .from('platform_settings')
    .select('commission_rate, voucher_expiry_days, referral_reward_amount')
    .eq('id', 1)
    .maybeSingle()
  const settings = settingsResult.data

  const commissionRate = Number(settings ? settings.commission_rate : 0.15)
  const commissionAmount = Math.round(pkg.price * commissionRate * 100) / 100
  const providerEarning = Math.round((pkg.price - commissionAmount) * 100) / 100

  await supabaseAdmin
    .from('wallets')
    .update({ balance: Number(wallet.balance) - Number(pkg.price), updated_at: new Date().toISOString() })
    .eq('id', wallet.id)

  await supabaseAdmin.from('wallet_transactions').insert({
    wallet_id: wallet.id, type: 'purchase', amount: pkg.price, status: 'completed',
    metadata: { package_id: packageId },
  })

  const providerWalletResult = await supabaseAdmin.from('wallets').select('id, balance').eq('profile_id', pkg.provider_id).maybeSingle()
  const providerWallet = providerWalletResult.data

  if (providerWallet) {
    await supabaseAdmin
      .from('wallets')
      .update({ balance: Number(providerWallet.balance) + providerEarning, updated_at: new Date().toISOString() })
      .eq('id', providerWallet.id)

    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: providerWallet.id, type: 'commission', amount: providerEarning, status: 'completed',
      metadata: { package_id: packageId, from_purchase: true },
    })
  }

  const purchaseResult = await supabaseAdmin
    .from('purchases')
    .insert({
      user_id: userId, package_id: packageId, hotspot_id: pkg.hotspot_id,
      amount: pkg.price, commission_amount: commissionAmount, provider_earning: providerEarning,
      status: 'completed',
    })
    .select()
    .single()

  const purchase = purchaseResult.data
  if (purchaseResult.error || !purchase) {
    await supabaseAdmin.from('wallets').update({ balance: Number(wallet.balance) }).eq('id', wallet.id)
    return res.status(500).json({ error: 'Could not complete purchase, wallet refunded' })
  }

  let code = generateVoucherCode()
  for (let i = 0; i < 3; i++) {
    const existingResult = await supabaseAdmin.from('vouchers').select('id').eq('code', code).maybeSingle()
    if (!existingResult.data) break
    code = generateVoucherCode()
  }

  const expiryDays = settings ? settings.voucher_expiry_days : 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const voucherResult = await supabaseAdmin
    .from('vouchers')
    .insert({
      code, package_id: packageId, original_purchase_id: purchase.id, current_owner_id: userId,
      status: 'unused', original_price: pkg.price, expires_at: expiresAt,
    })
    .select()
    .single()

  if (voucherResult.error) {
    return res.status(500).json({ error: 'Purchase completed but voucher creation failed. Contact support.' })
  }

  await supabaseAdmin.from('notifications').insert({
    profile_id: userId, type: 'payment', title: 'Purchase successful',
    message: 'You bought ' + pkg.name + ' for KSh ' + pkg.price + '. Voucher code: ' + code,
  })

  const buyerProfileResult = await supabaseAdmin.from('profiles').select('referred_by').eq('id', userId).maybeSingle()
  const buyerProfile = buyerProfileResult.data

  if (buyerProfile && buyerProfile.referred_by) {
    const existingReferralResult = await supabaseAdmin.from('referrals').select('id, status').eq('referred_id', userId).maybeSingle()
    const existingReferral = existingReferralResult.data

    if (existingReferral && existingReferral.status === 'pending') {
      const rewardAmount = Number(settings ? settings.referral_reward_amount : 50)
      const referrerWalletResult = await supabaseAdmin.from('wallets').select('id, balance').eq('profile_id', buyerProfile.referred_by).maybeSingle()
      const referrerWallet = referrerWalletResult.data

      if (referrerWallet) {
        await supabaseAdmin.from('wallets')
          .update({ balance: Number(referrerWallet.balance) + rewardAmount, updated_at: new Date().toISOString() })
          .eq('id', referrerWallet.id)

        await supabaseAdmin.from('wallet_transactions').insert({
          wallet_id: referrerWallet.id, type: 'deposit', amount: rewardAmount, status: 'completed',
          metadata: { referral_reward: true, referred_id: userId },
        })

        await supabaseAdmin.from('referrals').update({ status: 'completed', reward_amount: rewardAmount }).eq('id', existingReferral.id)

        await supabaseAdmin.from('notifications').insert({
          profile_id: buyerProfile.referred_by, type: 'referral_reward', title: 'Referral reward earned!',
          message: 'You earned KSh ' + rewardAmount + ' because a friend you invited made their first purchase.',
        })
      }
    }
  }

  return res.status(200).json({ success: true, purchase, voucher: voucherResult.data })
}

async function handleRedeemVoucher(req: VercelRequest, res: VercelResponse) {
  const { userId, voucherId } = req.body
  if (!userId || !voucherId) return res.status(400).json({ error: 'Missing fields' })

  const voucherResult = await supabaseAdmin
    .from('vouchers')
    .select('id, code, package_id, current_owner_id, status, expires_at')
    .eq('id', voucherId)
    .maybeSingle()

  const voucher = voucherResult.data
  if (voucherResult.error || !voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.current_owner_id !== userId) return res.status(403).json({ error: 'This voucher is not yours' })
  if (voucher.status === 'redeemed') return res.status(400).json({ error: 'Voucher already redeemed' })
  if (voucher.status === 'expired' || new Date(voucher.expires_at) < new Date()) {
    await supabaseAdmin.from('vouchers').update({ status: 'expired' }).eq('id', voucherId)
    return res.status(400).json({ error: 'Voucher has expired' })
  }
  if (voucher.status === 'listed') {
    return res.status(400).json({ error: 'Unlist this voucher before redeeming it' })
  }

  const pkgResult = await supabaseAdmin.from('packages').select('id, hotspot_id, duration_minutes').eq('id', voucher.package_id).maybeSingle()
  const pkg = pkgResult.data
  if (!pkg) return res.status(404).json({ error: 'Package not found for this voucher' })

  const sessionResult = await supabaseAdmin
    .from('sessions')
    .insert({
      user_id: userId, hotspot_id: pkg.hotspot_id, package_id: pkg.id, status: 'active',
      remaining_seconds: pkg.duration_minutes * 60, started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (sessionResult.error || !sessionResult.data) return res.status(500).json({ error: 'Could not start session' })

  await supabaseAdmin.from('vouchers').update({ status: 'redeemed', redeemed_at: new Date().toISOString() }).eq('id', voucherId)

  return res.status(200).json({ success: true, sessionId: sessionResult.data.id })
}

async function handleBuyVoucherResale(req: VercelRequest, res: VercelResponse) {
  const { buyerId, voucherId } = req.body
  if (!buyerId || !voucherId) return res.status(400).json({ error: 'Missing fields' })

  const voucherResult = await supabaseAdmin
    .from('vouchers')
    .select('id, current_owner_id, status, resale_price, expires_at')
    .eq('id', voucherId)
    .maybeSingle()

  const voucher = voucherResult.data
  if (voucherResult.error || !voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.status !== 'listed') return res.status(400).json({ error: 'Voucher is no longer listed' })
  if (voucher.current_owner_id === buyerId) return res.status(400).json({ error: "You can't buy your own voucher" })
  if (new Date(voucher.expires_at) < new Date()) {
    await supabaseAdmin.from('vouchers').update({ status: 'expired' }).eq('id', voucherId)
    return res.status(400).json({ error: 'Voucher has expired' })
  }

  const price = Number(voucher.resale_price)
  const sellerId = voucher.current_owner_id

  const buyerWalletResult = await supabaseAdmin.from('wallets').select('id, balance').eq('profile_id', buyerId).maybeSingle()
  const sellerWalletResult = await supabaseAdmin.from('wallets').select('id, balance').eq('profile_id', sellerId).maybeSingle()
  const buyerWallet = buyerWalletResult.data
  const sellerWallet = sellerWalletResult.data

  if (!buyerWallet || !sellerWallet) return res.status(404).json({ error: 'Wallet not found' })
  if (Number(buyerWallet.balance) < price) return res.status(400).json({ error: 'Insufficient balance to buy this voucher' })

  const settingsResult = await supabaseAdmin.from('platform_settings').select('resale_commission_rate').eq('id', 1).maybeSingle()
  const commissionRate = Number(settingsResult.data ? settingsResult.data.resale_commission_rate : 0.10)
  const commission = Math.round(price * commissionRate * 100) / 100
  const sellerEarning = Math.round((price - commission) * 100) / 100

  await supabaseAdmin.from('wallets')
    .update({ balance: Number(buyerWallet.balance) - price, updated_at: new Date().toISOString() })
    .eq('id', buyerWallet.id)
  await supabaseAdmin.from('wallet_transactions').insert({
    wallet_id: buyerWallet.id, type: 'purchase', amount: price, status: 'completed',
    metadata: { voucher_resale: voucherId },
  })

  await supabaseAdmin.from('wallets')
    .update({ balance: Number(sellerWallet.balance) + sellerEarning, updated_at: new Date().toISOString() })
    .eq('id', sellerWallet.id)
  await supabaseAdmin.from('wallet_transactions').insert({
    wallet_id: sellerWallet.id, type: 'deposit', amount: sellerEarning, status: 'completed',
    metadata: { voucher_resale_earning: voucherId },
  })

  await supabaseAdmin.from('vouchers').update({ current_owner_id: buyerId, status: 'unused', resale_price: null }).eq('id', voucherId)

  await supabaseAdmin.from('voucher_resales').insert({
    voucher_id: voucherId, seller_id: sellerId, buyer_id: buyerId,
    price, platform_commission: commission, seller_earning: sellerEarning,
  })

  return res.status(200).json({ success: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = req.body && req.body.action

  try {
    if (action === 'purchase-package') return await handlePurchasePackage(req, res)
    if (action === 'redeem-voucher') return await handleRedeemVoucher(req, res)
    if (action === 'buy-voucher-resale') return await handleBuyVoucherResale(req, res)
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error processing wallet action' })
  }
}
