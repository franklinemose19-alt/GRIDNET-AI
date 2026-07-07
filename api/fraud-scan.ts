import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    let flagsCreated = 0

    // Rule 1: withdrawal requested within 5 minutes of a large deposit (possible wash/fraud pattern)
    const { data: deposits } = await supabaseAdmin
      .from('wallet_transactions')
      .select('wallet_id, amount, created_at')
      .eq('type', 'deposit').eq('status', 'completed')
      .gte('amount', 1000)
      .order('created_at', { ascending: false })
      .limit(100)

    for (const dep of deposits || []) {
      const { data: wallet } = await supabaseAdmin.from('wallets').select('profile_id').eq('id', dep.wallet_id).maybeSingle()
      if (!wallet) continue

      const { data: withdrawals } = await supabaseAdmin
        .from('withdrawals')
        .select('id, created_at, amount')
        .eq('provider_id', wallet.profile_id)
        .gte('created_at', dep.created_at)
        .order('created_at', { ascending: true })
        .limit(1)

      const w = withdrawals?.[0]
      if (w) {
        const minutesApart = (new Date(w.created_at).getTime() - new Date(dep.created_at).getTime()) / 60000
        if (minutesApart >= 0 && minutesApart <= 5) {
          const { data: existing } = await supabaseAdmin
            .from('fraud_flags').select('id').eq('related_id', w.id).eq('flag_type', 'suspicious_withdrawal').maybeSingle()
          if (!existing) {
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

    // Rule 2: same phone number used across multiple profile accounts
    
    // (fallback to plain query since we can't run raw group-by via client easily)
    const { data: allProfiles } = await supabaseAdmin.from('profiles').select('id, phone').not('phone', 'is', null)
    const phoneMap: Record<string, string[]> = {}
    ;(allProfiles || []).forEach((p) => {
      if (!p.phone) return
      phoneMap[p.phone] = phoneMap[p.phone] || []
      phoneMap[p.phone].push(p.id)
    })
    for (const [phone, ids] of Object.entries(phoneMap)) {
      if (ids.length > 1) {
        for (const id of ids) {
          const { data: existing } = await supabaseAdmin
            .from('fraud_flags').select('id').eq('related_profile_id', id).eq('flag_type', 'multi_account').maybeSingle()
          if (!existing) {
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

    // Rule 3: voucher resold and rebought abnormally fast (possible fake churn to inflate stats)
    const { data: recentResales } = await supabaseAdmin
      .from('voucher_resales')
      .select('id, voucher_id, seller_id, buyer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    const voucherResaleCounts: Record<string, number> = {}
    ;(recentResales || []).forEach((r) => {
      voucherResaleCounts[r.voucher_id] = (voucherResaleCounts[r.voucher_id] || 0) + 1
    })
    for (const [voucherId, count] of Object.entries(voucherResaleCounts)) {
      if (count >= 3) {
        const { data: existing } = await supabaseAdmin
          .from('fraud_flags').select('id').eq('related_id', voucherId).eq('flag_type', 'fake_voucher_use').maybeSingle()
        if (!existing) {
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
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error running fraud scan' })
  }
}
