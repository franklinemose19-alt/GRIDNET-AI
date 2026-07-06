import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, voucherId } = req.body
  if (!userId || !voucherId) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { data: voucher, error: vErr } = await supabaseAdmin
      .from('vouchers')
      .select('id, code, package_id, current_owner_id, status, expires_at')
      .eq('id', voucherId)
      .maybeSingle()

    if (vErr || !voucher) return res.status(404).json({ error: 'Voucher not found' })
    if (voucher.current_owner_id !== userId) return res.status(403).json({ error: 'This voucher is not yours' })
    if (voucher.status === 'redeemed') return res.status(400).json({ error: 'Voucher already redeemed' })
    if (voucher.status === 'expired' || new Date(voucher.expires_at) < new Date()) {
      await supabaseAdmin.from('vouchers').update({ status: 'expired' }).eq('id', voucherId)
      return res.status(400).json({ error: 'Voucher has expired' })
    }
    if (voucher.status === 'listed') {
      return res.status(400).json({ error: 'Unlist this voucher before redeeming it' })
    }

    const { data: pkg } = await supabaseAdmin
      .from('packages')
      .select('id, hotspot_id, duration_minutes')
      .eq('id', voucher.package_id)
      .maybeSingle()

    if (!pkg) return res.status(404).json({ error: 'Package not found for this voucher' })

    const { data: session, error: sErr } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: userId,
        hotspot_id: pkg.hotspot_id,
        package_id: pkg.id,
        status: 'active',
        remaining_seconds: pkg.duration_minutes * 60,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sErr || !session) return res.status(500).json({ error: 'Could not start session' })

    await supabaseAdmin
      .from('vouchers')
      .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
      .eq('id', voucherId)

    return res.status(200).json({ success: true, sessionId: session.id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error redeeming voucher' })
  }
}
