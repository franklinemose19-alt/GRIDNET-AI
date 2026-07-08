import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Referral {
  id: string
  status: string
  reward_amount: number | null
  created_at: string
}

export default function Invite() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [rewardAmount, setRewardAmount] = useState(50)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('referrals')
      .select('id, status, reward_amount, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setReferrals(data as Referral[])

    const { data: settings } = await supabase.from('platform_settings').select('referral_reward_amount').eq('id', 1).maybeSingle()
    if (settings) setRewardAmount(Number(settings.referral_reward_amount))

    setLoading(false)
  }

  const inviteLink = profile?.referral_code
    ? `${window.location.origin}/signup?ref=${profile.referral_code}`
    : ''

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalEarned = referrals.reduce((s, r) => s + Number(r.reward_amount || 0), 0)
  const completedCount = referrals.filter((r) => r.status === 'completed').length

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="title">Invite Friends</div>
      <div className="subtitle">Earn KSh {rewardAmount} for every friend who makes their first purchase</div>

      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div className="text-dim">Your Referral Code</div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2, margin: '8px 0' }}>
          {profile?.referral_code || '...'}
        </div>
        <button className="btn btn-primary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </button>
      </div>

      <div className="card">
        <div className="row"><span className="text-dim">Total Earned</span><span style={{ fontWeight: 700 }}>KSh {totalEarned.toFixed(2)}</span></div>
        <div className="row"><span className="text-dim">Friends Joined</span><span>{referrals.length}</span></div>
        <div className="row"><span className="text-dim">Rewards Paid Out</span><span>{completedCount}</span></div>
      </div>

      <div style={{ fontWeight: 600, margin: '20px 0 10px' }}>Your Referrals</div>
      {loading && <div className="text-dim">Loading...</div>}
      {!loading && referrals.length === 0 && <div className="card text-dim">No referrals yet — share your link above to start earning.</div>}
      {referrals.map((r) => (
        <div key={r.id} className="card row">
          <span className="text-dim">{new Date(r.created_at).toLocaleDateString()}</span>
          <span className={`badge ${r.status === 'completed' ? 'badge-health-good' : 'badge-health-mid'}`}>
            {r.status === 'completed' ? `+KSh ${r.reward_amount}` : 'Pending first purchase'}
          </span>
        </div>
      ))}
    </div>
  )
}
