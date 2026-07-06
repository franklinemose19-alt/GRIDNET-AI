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

function timestampNow() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { walletId, amount, phone } = req.body

  if (!walletId || !amount || !phone || amount < 10) {
    return res.status(400).json({ error: 'Missing or invalid fields' })
  }

  try {
    const token = await getMpesaToken()
    const timestamp = timestampNow()
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    // create a pending transaction record first, so we can match the callback to it
    const { data: txn, error: txnError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        type: 'deposit',
        amount,
        status: 'pending',
        metadata: { phone },
      })
      .select()
      .single()

    if (txnError || !txn) {
      return res.status(500).json({ error: 'Could not create transaction record' })
    }

    const stkRes = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phone,
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: `${process.env.MPESA_CALLBACK_BASE_URL}/api/mpesa/stk-callback`,
          AccountReference: `GRIDNET-${txn.id.slice(0, 8)}`,
          TransactionDesc: 'GRIDNET AI Wallet Deposit',
        }),
      }
    )

    const stkData = await stkRes.json()

    if (stkData.ResponseCode !== '0') {
      await supabaseAdmin
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', txn.id)
      return res.status(400).json({ error: stkData.errorMessage || 'STK push failed' })
    }

    // store the CheckoutRequestID so the callback can find this transaction
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ metadata: { phone, checkout_request_id: stkData.CheckoutRequestID } })
      .eq('id', txn.id)

    return res.status(200).json({ success: true, checkoutRequestId: stkData.CheckoutRequestID })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error initiating payment' })
  }
}
