import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Hotspot { id: string; name: string; address: string; health_score: number; is_featured: boolean }
interface Package { id: string; hotspot_id: string; name: string; duration_minutes: number; price: number; active: boolean }
interface Subscription { tier: string; status: string; current_period_end: string }
interface Suggestion { name: string; duration_minutes: number; price: number; data_limit_mb: number | null; speed_limit_mbps: number | null }

const TIER_DATA_CAPS: Record<string, number | null> = {
  free: 1024,
  pro: 10240,
  premium: null,
  enterprise: null,
}

export default function ProviderDashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [wallet, setWallet] = useState<{ id: string; balance: number } | null>(null)
  const [earnings, setEarnings] = useState({ total: 0, count: 0 })

  const [showAddHotspot, setShowAddHotspot] = useState(false)
  const [hsName, setHsName] = useState('')
  const [hsAddress, setHsAddress] = useState('')

  const [addingPkgFor, setAddingPkgFor] = useState<string | null>(null)
  const [pkgName, setPkgName] = useState('')
  const [pkgDuration, setPkgDuration] = useState('')
  const [pkgPrice, setPkgPrice] = useState('')
  const [pkgDataLimit, setPkgDataLimit] = useState('')
  const [pkgUnlimited, setPkgUnlimited] = useState(false)

  const [suggestingFor, setSuggestingFor] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [addingSuggestion, setAddingSuggestion] = useState<number | null>(null)

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')

  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const currentTier = (subscription?.tier || 'free') as keyof typeof TIER_DATA_CAPS
  const dataCap = TIER_DATA_CAPS[currentTier]

  useEffect(() => { load() }, [])

  async function load() {
    if (!user) return
    setLoading(true)

    const { data: hs } = await supabase.from('hotspots').select('id, name, address, health_score, is_featured').eq('provider_id', user.id)
    if (hs) setHotspots(hs as Hotspot[])

    const hotspotIds = (hs || []).map((h) => h.id)
    if (hotspotIds.length > 0) {
      const { data: pkgs } = await supabase.from('packages').select('id, hotspot_id, name, duration_minutes, price, active').in('hotspot_id', hotspotIds)
      if (pkgs) setPackages(pkgs as Package[])
    }

    const { data: sub } = await supabase.from('provider_subscriptions')
      .select('tier, status, current_period_end').eq('provider_id', user.id).eq('status', 'active').maybeSingle()
    setSubscription(sub as Subscription | null)

    const { data: w } = await supabase.from('wallets').select('id, balance').eq('profile_id', user.id).maybeSingle()
    if (w) setWallet(w as any)

    const { data: purchases } = await supabase.from('purchases')
      .select('provider_earning, package_id, packages!inner(provider_id)')
      .eq('packages.provider_id', user.id).eq('status', 'completed')
    if (purchases) {
      const total = purchases.reduce((sum: number, p: any) => sum + Number(p.provider_earning), 0)
      setEarnings({ total, count: purchases.length })
    }

    setLoading(false)
  }

  async function handleAddHotspot(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error: insertErr } = await supabase.from('hotspots').insert({
          provider_id: user.id, name: hsName, address: hsAddress,
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        })
        if (insertErr) setError(insertErr.message)
        else { setHsName(''); setHsAddress(''); setShowAddHotspot(false); await load() }
        setBusy(false)
      },
      () => { setError('Enable location to register a hotspot at your current position.'); setBusy(false) }
    )
  }

  function openAddPackage(hotspotId: string) {
    setAddingPkgFor(hotspotId)
    setPkgName('')
    setPkgDuration('')
    setPkgPrice('')
    setPkgUnlimited(false)
    setPkgDataLimit(dataCap ? String(Math.min(dataCap, 500)) : '')
  }

  async function handleAddPackage(e: React.FormEvent, hotspotId: string) {
    e.preventDefault()
    if (!user) return

    if (!pkgUnlimited && dataCap && Number(pkgDataLimit) > dataCap) {
      setError('Your ' + currentTier + ' tier allows a max package data limit of ' + dataCap + ' MB. Lower the value or upgrade your plan.')
      return
    }
    if (pkgUnlimited && dataCap !== null) {
      setError('Your ' + currentTier + ' tier does not allow unlimited data packages. Set a value up to ' + dataCap + ' MB, or upgrade to Premium/Enterprise.')
      return
    }

    setBusy(true)
    setError('')

    const { error: insertErr } = await supabase.from('packages').insert({
      provider_id: user.id, hotspot_id: hotspotId, name: pkgName,
      duration_minutes: Number(pkgDuration), price: Number(pkgPrice),
      data_limit_mb: pkgUnlimited ? null : Number(pkgDataLimit),
    })
    if (insertErr) setError(insertErr.message)
    else { setAddingPkgFor(null); await load() }
    setBusy(false)
  }

  async function handleGetSuggestions(hotspotId: string) {
    if (!user) return
    setSuggestingFor(hotspotId)
    setLoadingSuggestions(true)
    setSuggestions([])
    setError('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-packages', providerId: user.id, hotspotId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else setSuggestions(data.suggestions || [])
    } catch {
      setError('Network error getting suggestions')
    }
    setLoadingSuggestions(false)
  }

  async function handleAddSuggestion(hotspotId: string, s: Suggestion, index: number) {
    if (!user) return
    setAddingSuggestion(index)
    setError('')

    const { error: insertErr } = await supabase.from('packages').insert({
      provider_id: user.id, hotspot_id: hotspotId, name: s.name,
      duration_minutes: s.duration_minutes, price: s.price,
      data_limit_mb: s.data_limit_mb, speed_limit_mbps: s.speed_limit_mbps,
    })
    if (insertErr) setError(insertErr.message)
    else {
      setSuggestions((prev) => prev.filter((_, i) => i !== index))
      await load()
    }
    setAddingSuggestion(null)
  }

  async function handleSubscribe(tier: 'pro' | 'premium' | 'enterprise') {
    if (!user) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/create-subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: user.id, tier }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else await load()
    setBusy(false)
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/request-withdrawal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: user.id, amount: Number(withdrawAmount),
        mpesaNumber: withdrawPhone.startsWith('254') ? withdrawPhone : `254${withdrawPhone.replace(/^0/, '')}`,
      }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else { setWithdrawAmount(''); setWithdrawPhone(''); await load() }
    setBusy(false)
  }

  async function loadInsight() {
    if (!user) return
    setLoadingInsight(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insights', providerId: user.id }),
      })
      const data = await res.json()
      setInsight(data.insight || 'Could not generate insight right now.')
    } catch {
      setInsight('Network error fetching insight.')
    }
    setLoadingInsight(false)
  }

  if (loading) return <div className="page center-screen">Loading dashboard...</div>

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 12 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <div className="title">Provider Dashboard</div>
          <div className="subtitle" style={{ marginBottom: 0 }}>{profile?.business_name || profile?.full_name}</div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10 }} onClick={signOut}>Sign out</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="card">
        <div className="row"><span className="text-dim">Wallet Balance</span><span style={{ fontWeight: 700 }}>KSh {wallet?.balance.toFixed(2) ?? '0.00'}</span></div>
        <div className="row"><span className="text-dim">Total Earned</span><span style={{ fontWeight: 700 }}>KSh {earnings.total.toFixed(2)}</span></div>
        <div className="row"><span className="text-dim">Completed Sales</span><span>{earnings.count}</span></div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>🧠 AI Insights</span>
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', borderRadius: 8 }} disabled={loadingInsight} onClick={loadInsight}>
            {loadingInsight ? 'Thinking...' : 'Refresh'}
          </button>
        </div>
        <div className="text-dim">{insight || 'Tap Refresh to get AI-powered recommendations based on your sales data.'}</div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Subscription</span>
          <span className="badge badge-featured">{currentTier.toUpperCase()}</span>
        </div>
        {subscription ? (
          <div className="text-dim">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</div>
        ) : (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={() => handleSubscribe('pro')}>Go Pro</button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => handleSubscribe('premium')}>Go Premium</button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => handleSubscribe('enterprise')}>Go Enterprise</button>
          </div>
        )}
        <div className="text-dim" style={{ marginTop: 8, fontSize: 12 }}>
          Data cap for packages: {dataCap ? `${dataCap} MB` : 'Unlimited allowed'}
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', borderRadius: 8, marginTop: 10, fontSize: 13 }} onClick={() => navigate('/pricing')}>
          View full plan comparison →
        </button>
      </div>

      <div style={{ fontWeight: 600, margin: '20px 0 10px' }}>My Hotspots</div>
      {hotspots.map((h) => (
        <div key={h.id} className="card">
          <div className="row" style={{ marginBottom: 4 }}>
            <div style={{ fontWeight: 600 }}>{h.name}</div>
            {h.is_featured && <span className="badge badge-featured">FEATURED</span>}
          </div>
          <div className="text-dim" style={{ marginBottom: 10 }}>{h.address} · Health {h.health_score}</div>

          {packages.filter((p) => p.hotspot_id === h.id).map((p) => (
            <div key={p.id} className="row" style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span>{p.name} ({p.duration_minutes}min)</span>
              <span>KSh {p.price}</span>
            </div>
          ))}

          {addingPkgFor === h.id ? (
            <form onSubmit={(e) => handleAddPackage(e, h.id)} style={{ marginTop: 10 }}>
              <input name="pkgName" placeholder="Package name (e.g. 1 Hour Pass)" value={pkgName} onChange={(e) => setPkgName(e.target.value)} required />
              <input name="pkgDuration" type="number" placeholder="Duration (minutes)" value={pkgDuration} onChange={(e) => setPkgDuration(e.target.value)} required />
              <input name="pkgPrice" type="number" placeholder="Price (KSh)" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} required />

              {!pkgUnlimited && (
                <input
                  name="pkgDataLimit"
                  type="number"
                  placeholder={dataCap ? `Data limit MB (max ${dataCap})` : 'Data limit MB'}
                  value={pkgDataLimit}
                  onChange={(e) => setPkgDataLimit(e.target.value)}
                  max={dataCap ?? undefined}
                  required
                />
              )}

              <label className="row card" style={{ cursor: dataCap === null ? 'pointer' : 'not-allowed', opacity: dataCap === null ? 1 : 0.5 }}>
                <span>Unlimited data {dataCap !== null && '(requires Premium/Enterprise)'}</span>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={pkgUnlimited}
                  disabled={dataCap !== null}
                  onChange={(e) => setPkgUnlimited(e.target.checked)}
                />
              </label>

              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary" disabled={busy} type="submit">Add Package</button>
                <button className="btn btn-secondary" type="button" onClick={() => setAddingPkgFor(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => openAddPackage(h.id)}>+ Add Package</button>
              <button className="btn btn-secondary" onClick={() => handleGetSuggestions(h.id)}>✨ AI Suggest</button>
            </div>
          )}

          {suggestingFor === h.id && (
            <div style={{ marginTop: 12 }}>
              {loadingSuggestions && <div className="text-dim">Generating suggestions...</div>}
              {suggestions.map((s, i) => (
                <div key={i} className="card" style={{ background: 'var(--surface-hover)' }}>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontWeight: 700 }}>KSh {s.price}</div>
                  </div>
                  <div className="text-dim" style={{ marginBottom: 10 }}>
                    {s.duration_minutes} min{s.data_limit_mb ? ` · ${s.data_limit_mb}MB` : ' · Unlimited data'}
                    {s.speed_limit_mbps ? ` · up to ${s.speed_limit_mbps} Mbps` : ''}
                  </div>
                  <button className="btn btn-primary" disabled={addingSuggestion === i} onClick={() => handleAddSuggestion(h.id, s, i)}>
                    {addingSuggestion === i ? 'Adding...' : 'Add This Package'}
                  </button>
                </div>
              ))}
              {!loadingSuggestions && (
                <button className="btn btn-secondary" onClick={() => setSuggestingFor(null)}>Close Suggestions</button>
              )}
            </div>
          )}
        </div>
      ))}

      {showAddHotspot ? (
        <form onSubmit={handleAddHotspot} className="card">
          <input name="hsName" placeholder="Hotspot name" value={hsName} onChange={(e) => setHsName(e.target.value)} required />
          <input name="hsAddress" placeholder="Address" value={hsAddress} onChange={(e) => setHsAddress(e.target.value)} required />
          <div className="text-dim" style={{ marginBottom: 10 }}>Uses your current location for coordinates</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" disabled={busy} type="submit">Register Hotspot</button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowAddHotspot(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-primary" onClick={() => setShowAddHotspot(true)}>+ Register New Hotspot</button>
      )}

      <div style={{ fontWeight: 600, margin: '20px 0 10px' }}>Withdraw to M-Pesa</div>
      <form onSubmit={handleWithdraw} className="card">
        <input name="withdrawAmount" type="number" placeholder="Amount (KSh)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required />
        <input name="withdrawPhone" placeholder="M-Pesa phone (e.g. 0712345678)" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} required />
        <button className="btn btn-primary" disabled={busy} type="submit">Request Withdrawal</button>
      </form>
    </div>
  )
}
