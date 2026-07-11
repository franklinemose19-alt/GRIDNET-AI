import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

const typeIcons: Record<string, string> = {
  payment: '💰', withdrawal: '🏧', connection_lost: '⚠️', connection_resumed: '✅',
  voucher_expiry: '⏰', ad_expiry: '📢', referral_reward: '🎁', general: '🔔',
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data as Notification[])
    setLoading(false)

    const unreadIds = (data || []).filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    }
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="title">Notifications</div>
      <div className="subtitle">Stay updated on payments, sessions, and rewards</div>

      {loading && <div className="text-dim">Loading...</div>}
      {!loading && notifications.length === 0 && <div className="card text-dim">No notifications yet.</div>}

      {notifications.map((n) => (
        <div key={n.id} className="card" style={{ opacity: n.read ? 0.7 : 1 }}>
          <div className="row" style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>{typeIcons[n.type] || '🔔'} {n.title}</span>
            {!n.read && <span className="badge badge-featured">NEW</span>}
          </div>
          <div className="text-dim" style={{ marginBottom: 6 }}>{n.message}</div>
          <div className="text-dim" style={{ fontSize: 12 }}>{new Date(n.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}
