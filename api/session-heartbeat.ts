import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { sessionId, userId, remainingSeconds, action, disconnectIncrement } = req.body
  if (!sessionId || !userId) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { data: session, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select('id, user_id, hotspot_id, status, disconnect_count')
      .eq('id', sessionId)
      .maybeSingle()

    if (sErr || !session) return res.status(404).json({ error: 'Session not found' })
    if (session.user_id !== userId) return res.status(403).json({ error: 'Not your session' })
    if (session.status === 'expired') return res.status(200).json({ status: 'expired' })

    if (action === 'expire') {
      await supabaseAdmin
        .from('sessions')
        .update({ status: 'expired', remaining_seconds: 0 })
        .eq('id', sessionId)

      // bump completed_sessions count and recalc health score for the hotspot
      if (session.hotspot_id) {
        const { data: hotspot } = await supabaseAdmin
          .from('hotspots').select('completed_sessions').eq('id', session.hotspot_id).maybeSingle()
        if (hotspot) {
          await supabaseAdmin
            .from('hotspots')
            .update({ completed_sessions: (hotspot.completed_sessions || 0) + 1 })
            .eq('id', session.hotspot_id)
        }
        await supabaseAdmin.rpc('recalculate_health_score', { p_hotspot_id: session.hotspot_id })
      }
      return res.status(200).json({ status: 'expired' })
    }

    // regular sync: persist remaining time + status + disconnect count
    const updates: Record<string, any> = {
      remaining_seconds: Math.max(0, Math.round(remainingSeconds ?? 0)),
      status: action === 'pause' ? 'paused' : 'active',
    }
    if (action === 'pause') updates.paused_at = new Date().toISOString()
    if (disconnectIncrement) {
      updates.disconnect_count = (session.disconnect_count || 0) + 1
    }

    await supabaseAdmin.from('sessions').update(updates).eq('id', sessionId)

    return res.status(200).json({ status: updates.status })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error syncing session' })
  }
}
