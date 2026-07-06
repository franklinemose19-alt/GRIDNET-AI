import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const callback = req.body?.Body?.stkCallback
  if (!callback) return res.status(200).json({ received: true })

  const checkoutRequestId = callback.CheckoutRequestID
  const resultCode = callback.ResultCode

  // find the pending transaction by checkout_request_id stored in metadata
  const { data: txns } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id, wallet_id, amount, metadata')
    .eq('status', 'pending')
    .filter('metadata->>checkout_request_id', 'eq', checkoutRequestId)
    .limit(1)

  const txn = txns?.[0]
  if (!txn) return res.status(200).json({ received: true }) // nothing to match, ack anyway

  if (resultCode !== 0) {
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: 'failed' })
      .eq('id', txn.id)
    return res.status(200).json({ received: true })
  }

  // extract mpesa receipt number from callback metadata items
  const items = callback.CallbackMetadata?.Item || []
  const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value

  // mark transaction completed
  await supabaseAdmin
    .from('wallet_transactions')
    .update({ status: 'completed', mpesa_receipt: receipt })
    .eq('id', txn.id)

  // credit the wallet - fetch current balance then update (Hobby plan, no RPC transaction wrapper needed at this volume)
  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('balance')
    .eq('id', txn.wallet_id)
    .maybeSingle()

  if (wallet) {
    await supabaseAdmin
      .from('wallets')
      .update({ balance: Number(wallet.balance) + Number(txn.amount), updated_at: new Date().toISOString() })
      .eq('id', txn.wallet_id)
  }

  return res.status(200).json({ received: true })
}
