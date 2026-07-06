import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getMpesaToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')
  const res = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  )
  const data = await res.json()
  return data.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { providerId, amount, mpesaNumber } = req.body
  if (!providerId || !amount || !mpesaNumber) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { data: settings } = await supabaseAdmin
      .from('platform_settings').select('min_withdrawal').eq('id', 1).maybeSingle()
    const minWithdrawal = Number(settings?.min_withdrawal ?? 100)

    if (Number(amount) < minWithdrawal) {
      return res.status(400).json({ error: `Minimum withdrawal is KSh ${minWithdrawal}` })
    }

    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('id, balance').eq('profile_id', providerId).maybeSingle()

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' })
    if (Number(wallet.balance) < Number(amount)) {
      return res.status(400).json({ error: 'Insufficient balance for this withdrawal' })
    }

    // create withdrawal record first, deduct wallet immediately (hold the funds)
    const { data: withdrawal, error: wErr } = await supabaseAdmin
      .from('withdrawals')
      .insert({ provider_id: providerId, amount, mpesa_number: mpesaNumber, status: 'pending' })
      .select().single()

    if (wErr || !withdrawal) return res.status(500).json({ error: 'Could not create withdrawal request' })

    await supabaseAdmin.from('wallets')
      .update({ balance: Number(wallet.balance) - Number(amount), updated_at: new Date().toISOString() })
      .eq('id', wallet.id)

    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: wallet.id, type: 'withdrawal', amount, status: 'pending',
      metadata: { withdrawal_id: withdrawal.id },
    })

    // attempt B2C payout — requires MPESA_INITIATOR_NAME + MPESA_SECURITY_CREDENTIAL,
    // which only exist once your Paybill is live. Sandbox call included but will
    // likely fail gracefully until then — withdrawal stays 'pending' for manual processing.
    try {
      const token = await getMpesaToken()
      const b2cRes = await fetch('https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InitiatorName: process.env.MPESA_INITIATOR_NAME,
          SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
          CommandID: 'BusinessPayment',
          Amount: amount,
          PartyA: process.env.MPESA_SHORTCODE,
          PartyB: mpesaNumber,
          Remarks: 'GRIDNET AI Provider Withdrawal',
          QueueTimeOutURL: `${process.env.MPESA_CALLBACK_BASE_URL}/api/mpesa/b2c-callback`,
          ResultURL: `${process.env.MPESA_CALLBACK_BASE_URL}/api/mpesa/b2c-callback`,
          Occasion: withdrawal.id,
        }),
      })
      const b2cData = await b2cRes.json()
      if (b2cData.ResponseCode !== '0') {
        console.warn('B2C not yet configured or failed:', b2cData)
      }
    } catch (b2cErr) {
      console.warn('B2C call failed, withdrawal left pending for manual processing:', b2cErr)
    }

    return res.status(200).json({
      success: true,
      message: 'Withdrawal requested. Funds held from your balance; payout will be processed.',
      withdrawal,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error processing withdrawal' })
  }
}
