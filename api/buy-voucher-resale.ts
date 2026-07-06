import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { buyerId, voucherId } = req.body
  if (!buyerId || !voucherId) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { data: voucher, error: vErr } = await supabaseAdmin
      .from('vouchers')
      .select('id, current_owner_id, status, resale_price, expires_at')
      .eq('id', voucherId)
      .maybeSingle()

    if (vErr || !voucher) return res.status(404).json({ error: 'Voucher not found' })
    if (voucher.status !== 'listed') return res.status(400).json({ error: 'Voucher is no longer listed' })
    if (voucher.current_owner_id === buyerId) return res.status(400).json({ error: "You can't buy your own voucher" })
    if (new Date(voucher.expires_at) < new Date()) {
      await supabaseAdmin.from('vouchers').update({ status: 'expired' }).eq('id', voucherId)
      return res.status(400).json({ error: 'Voucher has expired' })
    }

    const price = Number(voucher.resale_price)
    const sellerId = voucher.current_owner_id

    const { data: buyerWallet } = await supabaseAdmin
      .from('wallets').select('id, balance').eq('profile_id', buyerId).maybeSingle()
    const { data: sellerWallet } = await supabaseAdmin
      .from('wallets').select('id, balance').eq('profile_id', sellerId).maybeSingle()

    if (!buyerWallet || !sellerWallet) return res.status(404).json({ error: 'Wallet not found' })
    if (Number(buyerWallet.balance) < price) return res.status(400).json({ error: 'Insufficient balance to buy this voucher' })

    const { data: settings } = await supabaseAdmin
      .from('platform_settings').select('resale_commission_rate').eq('id', 1).maybeSingle()
    const commissionRate = Number(settings?.resale_commission_rate ?? 0.10)
    const commission = Math.round(price * commissionRate * 100) / 100
    const sellerEarning = Math.round((price - commission) * 100) / 100

    // debit buyer
    await supabaseAdmin.from('wallets')
      .update({ balance: Number(buyerWallet.balance) - price, updated_at: new Date().toISOString() })
      .eq('id', buyerWallet.id)
    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: buyerWallet.id, type: 'purchase', amount: price, status: 'completed',
      metadata: { voucher_resale: voucherId },
    })

    // credit seller
    await supabaseAdmin.from('wallets')
      .update({ balance: Number(sellerWallet.balance) + sellerEarning, updated_at: new Date().toISOString() })
      .eq('id', sellerWallet.id)
    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: sellerWallet.id, type: 'deposit', amount: sellerEarning, status: 'completed',
      metadata: { voucher_resale_earning: voucherId },
    })

    // transfer ownership
    await supabaseAdmin.from('vouchers')
      .update({ current_owner_id: buyerId, status: 'unused', resale_price: null })
      .eq('id', voucherId)

    // log resale
    await supabaseAdmin.from('voucher_resales').insert({
      voucher_id: voucherId, seller_id: sellerId, buyer_id: buyerId,
      price, platform_commission: commission, seller_earning: sellerEarning,
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error processing resale purchase' })
  }
}
