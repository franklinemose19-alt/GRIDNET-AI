import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Hotspot { id: string; name: string; address: string; health_score: number; is_featured: boolean; is_online: boolean }
interface Package { id: string; hotspot_id: string; name: string; duration_minutes: number; price: number; active: boolean }
interface Subscription { tier: string; status: string; current_period_end: string }
interface Suggestion { name: string; duration_minutes: number; price: number; data_limit_mb: number | null; speed_limit_mbps: number | null }
interface TeamMember { id: string; role: string; member_id: string; profiles?: { full_name: string | null; phone: string | null } }

const TIER_DATA_CAPS: Record<string, number | null> = {
  free: 1024,
  pro: 10240,
  premium: null,
  enterprise: null,
}

const TIER_TEAM_CAPS: Record<string, number | null> = {
  free: 1,
  pro: 1,
  premium: 3,
  enterprise: null,
}

export default function ProviderDashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [effectiveOwnerId, setEffectiveOwnerId] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [isTeamMember, setIsTeamMember] = useState(false)

  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [wallet, setWallet] = useState<{ id: string; balance: number } | null>(null)
  const [earnings, setEarnings] = useState({ total: 0, count: 0 })
  const [team, setTeam] = useState<TeamMember[]>([])

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

  const [showAddTeam, setShowAddTeam] = useState(false)
  const [teamPhone, setTeamPhone] = useState('')
  const [teamRole, setTeamRole] = useState<'manager' | 'staff'>('staff')

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const currentTier = (subscription?.tier || 'free') as keyof typeof TIER_DATA_CAPS
  const dataCap = TIER_DATA_CAPS[currentTier]
  const teamCap = TIER_TEAM_CAPS[currentTier]

  useEffect(() => { load() }, [])

  async function load() {
    if (!user) return
    setLoading(true)

    const managedOwnerResult = await supabase.rpc('get_managed_owner', { p_user_id: user.id })
    const managedOwnerId = managedOwnerResult.data

    let ownerId = user.id
    if (managedOwnerId) {
      ownerId = managedOwnerId
      setIsTeamMember(true)
      const ownerProfileResult = await supabase.from('profiles').select('full_name, business_name').eq('id', managedOwnerId).maybeSingle()
      if (ownerProfileResult.data) {
        setOwnerName(ownerProfileResult.data.business_name || ownerProfileResult.data.full_name || 'the owner')
      }
    } else {
      setIsTeamMember(false)
    }
    setEffectiveOwnerId(ownerId)

    const { data: hs } = await supabase.from('hotspots').select('id, name, address, health_score, is_featured, is_online').eq('provider_id', ownerId)
    if (hs) setHotspots(hs as Hotspot[])

    const hotspotIds = (hs || []).map((h) => h.id)
    if (hotspotIds.length > 0) {
      const { data: pkgs } = await supabase.from('packages').select('id, hotspot_id, name, duration_minutes, price, active').in('hotspot_id', hotspotIds)
      if (pkgs) setPackages(pkgs as Package[])
    }

    if (!managedOwnerId) {
      const { data: sub } = await supabase.from('provider_subscriptions')
        .select('tier, status, current_period_end').eq('provider_id', ownerId).eq('status', 'active').maybeSingle()
      setSubscription(sub as Subscription | null)

      const { data: w } = await supabase.from('wallets').select('id, balance').eq('profile_id', ownerId).maybeSingle()
      if (w) setWallet(w as any)

      const { data: purchases } = await supabase.from('purchases')
        .select('provider_earning, package_id, packages!inner(provider_id)')
        .eq('packages.provider_id', ownerId).eq('status', 'completed')
      if (purchases) {
        const total = purchases.reduce((sum: number, p: any) => sum + Number(p.provider_earning), 0)
        setEarnings({ total, count: purchases.length })
      }

      const { data: teamData } = await supabase
        .from('provider_team_members')
        .select('id, role, member_id, profiles(full_name, phone)')
        .eq('owner_id', ownerId)
      if (teamData) setTeam(teamData as any)
    }

    setLoading(false)
  }

  async function toggleOnline(hotspotId: string, currentStatus: boolean) {
    await supabase.from('hotspots').update({ is_online: !currentStatus }).eq('id', hotspotId)
    await load()
  }

  async function handleDeleteHotspot(hotspotId: string) {
    const confirmed = window.confirm('Delete this hotspot and all its packages? This cannot be undone.')
    if (!confirmed) return

    setBusy(true)
    await supabase.from('packages').delete().eq('hotspot_id', hotspotId)
    const { error: deleteErr } = await supabase.from('hotspots').delete().eq('id', hotspotId)
    if (deleteErr) setError(deleteErr.message)
    else await load()
    setBusy(false)
  }

  async function handleAddHotspot(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveOwnerId) return
    setBusy(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error: insertErr } = await supabase.from('hotspots').insert({
          provider_id: effectiveOwnerId, name: hsName, address: hsAddress,
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
    if (!effectiveOwnerId) return

    if (!pkgUnlimited && dataCap && Number(pkgDataLimit) > dataCap) {
      setError('Your ' + currentTier + ' tier allows a max package data limit of ' + dataCap + ' MB. Lower the value or ask the owner to upgrade.')
      return
    }
    if (pkgUnlimited && dataCap !== null) {
      setError('Your ' + currentTier + ' tier does not allow unlimited data packages.')
      return
    }

    setBusy(true)
    setError('')

    const { error: insertErr } = await supabase.from('packages').insert({
      provider_id: effectiveOwnerId, hotspot_id: hotspotId, name: pkgName,
      duration_minutes: Number(pkgDuration), price: Number(pkgPrice),
      data_limit_mb: pkgUnlimited ? null : Number(pkgDataLimit),
    })
    if (insertErr) setError(insertErr.message)
    else { setAddingPkgFor(null); await load() }
    setBusy(false)
  }

  async function handleGetSuggestions(hotspotId: string) {
    if (!effectiveOwnerId) return
    setSuggestingFor(hotspotId)
    setLoadingSuggestions(true)
    setSuggestions([])
    setError('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-packages', providerId: effectiveOwnerId, hotspotId }),
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
    if (!effectiveOwnerId) return
    setAddingSuggestion(index)
    setError('')

    const { error: insertErr } = await supabase.from('packages').insert({
      provider_id: effectiveOwnerId, hotspot_id: hotspotId, name: s.name,
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

  async function handleAddTeamMember(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')

    const normalizedPhone = teamPhone.startsWith('254') ? teamPhone : '254' + teamPhone.replace(/^0/, '')

    const { data: memberId, error: lookupError } = await supabase.rpc('find_profile_by_phone', {
      p_phone: normalizedPhone,
    })

    if (lookupError || !memberId) {
      setError('No GRIDNET AI user found with that phone number. They need to sign up first.')
      setBusy(false)
      return
    }

    if (memberId === user.id) {
      setError("You can't add yourself as a team member.")
      setBusy(false)
      return
    }

    const { error: insertErr } = await supabase.from('provider_team_members').insert({
      owner_id: user.id, member_id: memberId, role: teamRole,
    })

    if (insertErr) {
      setError(insertErr.message.includes('duplicate') ? 'That person is already on your team.' : insertErr.message)
    } else {
      setTeamPhone(''); setTeamRole('staff'); setShowAddTeam(false)
      await load()
    }
    setBusy(false)
  }

  async function removeTeamMember(id: string) {
    setBusy(true)
    await supabase.from('provider_team_members').delete().eq('id', id)
    await load()
    setBusy(false)
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

      {isTeamMember && (
        <div className="card" style={{ background: 'rgba(59,130,246,0.08)' }}>
          Managing hotspots on behalf of <strong>{ownerName}</strong>. Wallet, withdrawals, and subscription are managed by the owner only.
        </div>
      )}

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {!isTeamMember && (
        <>
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
