import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Settings {
  commission_rate: number
  resale_commission_rate: number
  min_withdrawal: number
  pro_tier_price: number
  premium_tier_price: number
  voucher_expiry_days: number
}

interface FraudFlag {
  id: string
  flag_type: string
  severity: number
  status: string
  details: any
  created_at: string
}

interface Withdrawal {
  id: string
  provider_id: string
  amount: number
  mpesa_number: string
  status: string
  created_at: string
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState<'overview' | 'fraud' | 'withdrawals' | 'settings'>('overview')

  const [stats, setStats] = useState({ users: 0, providers: 0, hotspots: 0, commissionRevenue: 0, subscriptionRevenue: 0, resaleRevenue: 0 })
  const [flags, setFlags] = useState<FraudFlag[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanMessage, setScanMessage] = useState('')

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'overview') await loadOverview()
    if (tab === 'fraud') await loadFraud()
    if (tab === 'withdrawals') await loadWithdrawals()
    if (tab === 'settings') await loadSettings()
    setLoading(false)
  }

  async function loadOverview() {
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user')
    const { count: providerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'provider')
    const { count: hotspotCount } = await supabase.from('hotspots').select('*', { count: 'exact', head: true })

    const { data: purchases } = await supabase.from('purchases').select('commission_amount').eq('status', 'completed')
    const commissionRevenue = (purchases || []).reduce((s, p) => s + Number(p.commission_amount), 0)

    const { data: resales } = await supabase.from('voucher_resales').select('platform_commission')
    const resaleRevenue = (resales || []).reduce((s, r) => s + Number(r.platform_commission), 0)

    const { data: subs } = await supabase.from('provider_subscriptions').select('monthly_price')
    const subscriptionRevenue = (subs || []).reduce((s, sub) => s + Number(sub.monthly_price), 0)

    setStats({
      users: userCount || 0, providers: providerCount || 0, hotspots: hotspotCount || 0,
      commissionRevenue, subscriptionRevenue, resaleRevenue,
    })
  }

  async function loadFraud() {
    const { data } = await supabase.from('fraud_flags').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setFlags(data as FraudFlag[])
  }

  async function loadWithdrawals() {
    const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setWithdrawals(data as Withdrawal[])
  }

  async function loadSettings() {
    const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle()
    if (data) setSettings(data as Settings)
  }

  async function runFraudScan() {
    setBusy('scan')
    setScanMessage('')
    try {
      const res = await fetch('/api/fraud-scan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setScanMessage(data.error || 'Scan failed')
      else setScanMessage(`Scan complete: ${data.flagsCreated || 0} new flag(s) created`)
      await loadFraud()
    } catch {
      setScanMessage('Network error running scan')
    }
    setBusy(null)
  }

  async function updateFlagStatus(id: string, status: string) {
    setBusy(id)
    await supabase.from('fraud_flags').update({ status }).eq('id', id)
    await loadFraud()
    setBusy(null)
  }

  async function markWithdrawalPaid(id: string) {
    setBusy(id)
    await supabase.from('withdrawals').update({ status: 'paid' }).eq('id', id)
    await loadWithdrawals()
    setBusy(null)
  }

  async function rejectWithdrawal(id: string, providerId: string, amount: number) {
    setBusy(id)
    const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('profile_id', providerId).maybeSingle()
    if (wallet) {
      await supabase.from('wallets').update({ balance: Number(wallet.balance) + Number(amount) }).eq('id', wallet.id)
    }
    await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', id)
    await loadWithdrawals()
    setBusy(null)
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setBusy('settings')
    await supabase.from('platform_settings').update(settings).eq('id', 1)
    setBusy(null)
  }

  const totalRevenue = stats.commissionRevenue + stats.subscriptionRevenue + stats.resaleRevenue

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="row" style={{ marginBottom: 20 }}>
  <div>
    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', borderRadius: 8, marginBottom: 8 }} onClick={() => window.location.href = '/discover'}>
      ← Back
    </button>
    <div className="title">Admin</div>
  </div>
  <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10 }} onClick={signOut}>Sign out</button>
</div>

      <div className="row" style={{ gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['overview', 'fraud', 'withdrawals', 'settings'] as const).map((t) => (
          <button key={t} className={tab === t ? 'btn btn-primary' : 'btn btn-secondary'} style={{ width: 'auto', padding: '8px 14px', textTransform: 'capitalize' }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-dim">Loading...</div>}

      {tab === 'overview' && !loading && (
        <>
          <div className="card"><div className="row"><span className="text-dim">Total Revenue</span><span style={{ fontWeight: 700, fontSize: 20 }}>KSh {totalRevenue.toFixed(2)}</span></div></div>
          <div className="card">
            <div className="row"><span className="text-dim">Commission Revenue</span><span>KSh {stats.commissionRevenue.toFixed(2)}</span></div>
            <div className="row"><span className="text-dim">Subscription Revenue</span><span>KSh {stats.subscriptionRevenue.toFixed(2)}</span></div>
            <div className="row"><span className="text-dim">Resale Commission</span><span>KSh {stats.resaleRevenue.toFixed(2)}</span></div>
          </div>
          <div className="card">
            <div className="row"><span className="text-dim">Users</span><span>{stats.users}</span></div>
            <div className="row"><span className="text-dim">Providers</span><span>{stats.providers}</span></div>
            <div className="row"><span className="text-dim">Hotspots</span><span>{stats.hotspots}</span></div>
          </div>
        </>
      )}

      {tab === 'fraud' && !loading && (
        <>
          <button className="btn btn-primary" style={{ marginBottom: 12 }} disabled={busy === 'scan'} onClick={runFraudScan}>
            {busy === 'scan' ? 'Scanning...' : 'Run Fraud Scan'}
          </button>
          {scanMessage && <div className="card text-dim">{scanMessage}</div>}

          {flags.length === 0 && <div className="card text-dim">No fraud flags — nothing suspicious detected yet.</div>}
          {flags.map((f) => (
            <div key={f.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{f.flag_type.replace(/_/g, ' ')}</span>
                <span className={`badge ${f.severity >= 4 ? 'badge-health-low' : 'badge-health-mid'}`}>Severity {f.severity}</span>
              </div>
              <div className="text-dim" style={{ marginBottom: 10 }}>{new Date(f.created_at).toLocaleString()} · {f.status}</div>
              {f.status === 'open' && (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-secondary" disabled={busy === f.id} onClick={() => updateFlagStatus(f.id, 'reviewing')}>Review</button>
                  <button className="btn btn-primary" disabled={busy === f.id} onClick={() => updateFlagStatus(f.id, 'resolved')}>Resolve</button>
                  <button className="btn btn-secondary" disabled={busy === f.id} onClick={() => updateFlagStatus(f.id, 'dismissed')}>Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'withdrawals' && !loading && (
        <>
          {withdrawals.length === 0 && <div className="card text-dim">No withdrawal requests yet.</div>}
          {withdrawals.map((w) => (
            <div key={w.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>KSh {w.amount}</span>
                <span className={`badge ${w.status === 'paid' ? 'badge-health-good' : w.status === 'rejected' ? 'badge-health-low' : 'badge-health-mid'}`}>{w.status.toUpperCase()}</span>
              </div>
              <div className="text-dim" style={{ marginBottom: 10 }}>{w.mpesa_number} · {new Date(w.created_at).toLocaleString()}</div>
              {w.status === 'pending' && (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary" disabled={busy === w.id} onClick={() => markWithdrawalPaid(w.id)}>Mark Paid</button>
                  <button className="btn btn-secondary" disabled={busy === w.id} onClick={() => rejectWithdrawal(w.id, w.provider_id, w.amount)}>Reject & Refund</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'settings' && !loading && settings && (
        <form onSubmit={saveSettings} className="card">
          <div className="text-dim" style={{ marginBottom: 6 }}>Commission Rate (0–1, e.g. 0.15 = 15%)</div>
          <input name="commissionRate" type="number" step="0.01" value={settings.commission_rate} onChange={(e) => setSettings({ ...settings, commission_rate: Number(e.target.value) })} />

          <div className="text-dim" style={{ marginBottom: 6 }}>Resale Commission Rate</div>
          <input name="resaleRate" type="number" step="0.01" value={settings.resale_commission_rate} onChange={(e) => setSettings({ ...settings, resale_commission_rate: Number(e.target.value) })} />

          <div className="text-dim" style={{ marginBottom: 6 }}>Minimum Withdrawal (KSh)</div>
          <input name="minWithdrawal" type="number" value={settings.min_withdrawal} onChange={(e) => setSettings({ ...settings, min_withdrawal: Number(e.target.value) })} />

          <div className="text-dim" style={{ marginBottom: 6 }}>Pro Tier Price (KSh/month)</div>
          <input name="proPrice" type="number" value={settings.pro_tier_price} onChange={(e) => setSettings({ ...settings, pro_tier_price: Number(e.target.value) })} />

          <div className="text-dim" style={{ marginBottom: 6 }}>Premium Tier Price (KSh/month)</div>
          <input name="premiumPrice" type="number" value={settings.premium_tier_price} onChange={(e) => setSettings({ ...settings, premium_tier_price: Number(e.target.value) })} />

          <div className="text-dim" style={{ marginBottom: 6 }}>Voucher Expiry (days)</div>
          <input name="voucherExpiry" type="number" value={settings.voucher_expiry_days} onChange={(e) => setSettings({ ...settings, voucher_expiry_days: Number(e.target.value) })} />

          <button className="btn btn-primary" type="submit" disabled={busy === 'settings'}>
            {busy === 'settings' ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  )
}
