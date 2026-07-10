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

interface Banner {
  id: string
  title: string
  media_url: string
  media_type: string
  link_url: string | null
  active: boolean
  display_order: number
  created_at: string
}

interface Advertisement {
  id: string
  business_name: string
  description: string
  status: string
  risk_level: string | null
  moderation_reason: string | null
  amount_paid: number
  owner_type: string
  image_urls: string[]
  contact_phone: string | null
  contact_whatsapp: string | null
  created_at: string
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState<'overview' | 'fraud' | 'withdrawals' | 'settings' | 'banners' | 'ads'>('overview')

  const [stats, setStats] = useState({ users: 0, providers: 0, hotspots: 0, commissionRevenue: 0, subscriptionRevenue: 0, resaleRevenue: 0 })
  const [flags, setFlags] = useState<FraudFlag[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [ads, setAds] = useState<Advertisement[]>([])

  const [showAddBanner, setShowAddBanner] = useState(false)
  const [bTitle, setBTitle] = useState('')
  const [bMediaUrl, setBMediaUrl] = useState('')
  const [bMediaType, setBMediaType] = useState<'image' | 'video'>('image')
  const [bLinkUrl, setBLinkUrl] = useState('')

  const [adContactName, setAdContactName] = useState('')
  const [adContactPhone, setAdContactPhone] = useState('')
  const [adContactWhatsapp, setAdContactWhatsapp] = useState('')
  const [adPrice7d, setAdPrice7d] = useState('')
  const [adPrice30d, setAdPrice30d] = useState('')
  const [showAdPromo, setShowAdPromo] = useState(true)

  const [showOwnerAd, setShowOwnerAd] = useState(false)
  const [oaName, setOaName] = useState('')
  const [oaDescription, setOaDescription] = useState('')
  const [oaImageUrl, setOaImageUrl] = useState('')
  const [oaPhone, setOaPhone] = useState('')
  const [oaWhatsapp, setOaWhatsapp] = useState('')

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
    if (tab === 'banners') await loadBanners()
    if (tab === 'ads') await loadAds()
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

  async function loadBanners() {
    const { data } = await supabase.from('home_banners').select('*').order('display_order', { ascending: true })
    if (data) setBanners(data as Banner[])

    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('ad_contact_name, ad_contact_phone, ad_contact_whatsapp, ad_price_7d, ad_price_30d, show_ad_promo')
      .eq('id', 1)
      .maybeSingle()

    if (settingsData) {
      setAdContactName(settingsData.ad_contact_name || '')
      setAdContactPhone(settingsData.ad_contact_phone || '')
      setAdContactWhatsapp(settingsData.ad_contact_whatsapp || '')
      setAdPrice7d(String(settingsData.ad_price_7d ?? ''))
      setAdPrice30d(String(settingsData.ad_price_30d ?? ''))
      setShowAdPromo(settingsData.show_ad_promo ?? true)
    }
  }

  async function loadAds() {
    const { data } = await supabase.from('advertisements').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setAds(data as Advertisement[])
  }

  async function approveAd(id: string) {
    setBusy(id)
    const { data: pkgData } = await supabase
      .from('advertisements')
      .select('package_id, ad_packages(days)')
      .eq('id', id)
      .maybeSingle()
    const days = pkgData && (pkgData as any).ad_packages ? (pkgData as any).ad_packages.days : 7
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('advertisements').update({ status: 'active', starts_at: new Date().toISOString(), ends_at: endsAt }).eq('id', id)
    await loadAds()
    setBusy(null)
  }

  async function rejectAd(id: string) {
    setBusy(id)
    await supabase.from('advertisements').update({ status: 'rejected' }).eq('id', id)
    await loadAds()
    setBusy(null)
  }

  async function createOwnerAd(e: React.FormEvent) {
    e.preventDefault()
    setBusy('owner-ad')
    await supabase.from('advertisements').insert({
      owner_type: 'owner',
      business_name: oaName,
      description: oaDescription,
      image_urls: oaImageUrl ? [oaImageUrl] : [],
      contact_phone: oaPhone || null,
      contact_whatsapp: oaWhatsapp || null,
      status: 'active',
      risk_level: 'low',
      amount_paid: 0,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })
    setOaName(''); setOaDescription(''); setOaImageUrl(''); setOaPhone(''); setOaWhatsapp(''); setShowOwnerAd(false)
    await loadAds()
    setBusy(null)
  }

  async function runFraudScan() {
    setBusy('scan')
    setScanMessage('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fraud-scan' }),
      })
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

  async function handleAddBanner(e: React.FormEvent) {
    e.preventDefault()
    setBusy('banner')
    const { error } = await supabase.from('home_banners').insert({
      title: bTitle, media_url: bMediaUrl, media_type: bMediaType,
      link_url: bLinkUrl || null, display_order: banners.length,
    })
    if (!error) {
      setBTitle(''); setBMediaUrl(''); setBLinkUrl(''); setBMediaType('image'); setShowAddBanner(false)
      await loadBanners()
    }
    setBusy(null)
  }

  async function toggleBannerActive(id: string, active: boolean) {
    setBusy(id)
    await supabase.from('home_banners').update({ active: !active }).eq('id', id)
    await loadBanners()
    setBusy(null)
  }

  async function deleteBanner(id: string) {
    setBusy(id)
    await supabase.from('home_banners').delete().eq('id', id)
    await loadBanners()
    setBusy(null)
  }

  async function saveAdPromo() {
    setBusy('adpromo')
    await supabase.from('platform_settings').update({
      ad_contact_name: adContactName,
      ad_contact_phone: adContactPhone,
      ad_contact_whatsapp: adContactWhatsapp,
      ad_price_7d: Number(adPrice7d),
      ad_price_30d: Number(adPrice30d),
      show_ad_promo: showAdPromo,
    }).eq('id', 1)
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
        {(['overview', 'fraud', 'withdrawals', 'settings', 'banners', 'ads'] as const).map((t) => (
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

      {tab === 'banners' && !loading && (
        <>
          <div className="text-dim" style={{ marginBottom: 12 }}>
            This banner shows at the top of every user's Discover page. Paste a hosted image or video URL — no upload needed.
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 10 }}>"Advertise Here" Contact Card</div>
            <div className="text-dim" style={{ marginBottom: 10, fontSize: 12 }}>
              Shows below the banner so businesses can see your ad pricing and reach you directly.
            </div>
            <input
              placeholder="Display name (e.g. GRIDNET AI)"
              value={adContactName}
              onChange={(e) => setAdContactName(e.target.value)}
            />
            <input
              placeholder="Phone (e.g. 0712345678)"
              value={adContactPhone}
              onChange={(e) => setAdContactPhone(e.target.value)}
            />
            <input
              placeholder="WhatsApp number (e.g. 254712345678)"
              value={adContactWhatsapp}
              onChange={(e) => setAdContactWhatsapp(e.target.value)}
            />
            <input
              type="number"
              placeholder="7-day price (KSh)"
              value={adPrice7d}
              onChange={(e) => setAdPrice7d(e.target.value)}
            />
            <input
              type="number"
              placeholder="30-day price (KSh)"
              value={adPrice30d}
              onChange={(e) => setAdPrice30d(e.target.value)}
            />
            <label className="row card" style={{ cursor: 'pointer' }}>
              <span>Show this card on Discover</span>
              <input type="checkbox" style={{ width: 'auto' }} checked={showAdPromo} onChange={(e) => setShowAdPromo(e.target.checked)} />
            </label>
            <button className="btn btn-primary" disabled={busy === 'adpromo'} onClick={saveAdPromo}>
              {busy === 'adpromo' ? 'Saving...' : 'Save Contact Card'}
            </button>
          </div>

          {banners.map((b) => (
            <div key={b.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{b.title}</span>
                <span className={`badge ${b.active ? 'badge-health-good' : 'badge-health-low'}`}>{b.active ? 'ACTIVE' : 'HIDDEN'}</span>
              </div>
              <div className="text-dim" style={{ marginBottom: 10, wordBreak: 'break-all', fontSize: 12 }}>{b.media_url}</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-secondary" disabled={busy === b.id} onClick={() => toggleBannerActive(b.id, b.active)}>
                  {b.active ? 'Hide' : 'Show'}
                </button>
                <button className="btn btn-secondary" disabled={busy === b.id} onClick={() => deleteBanner(b.id)}>Delete</button>
              </div>
            </div>
          ))}

          {showAddBanner ? (
            <form onSubmit={handleAddBanner} className="card">
              <input name="bTitle" placeholder="Banner title (internal reference)" value={bTitle} onChange={(e) => setBTitle(e.target.value)} required />
              <input name="bMediaUrl" placeholder="Image or video URL" value={bMediaUrl} onChange={(e) => setBMediaUrl(e.target.value)} required />
              <select
                name="bMediaType"
                value={bMediaType}
                onChange={(e) => setBMediaType(e.target.value as 'image' | 'video')}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', marginBottom: 12 }}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
              <input name="bLinkUrl" placeholder="Link when tapped (optional)" value={bLinkUrl} onChange={(e) => setBLinkUrl(e.target.value)} />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary" disabled={busy === 'banner'} type="submit">Add Banner</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowAddBanner(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAddBanner(true)}>+ Add Banner</button>
          )}
        </>
      )}

      {tab === 'ads' && !loading && (
        <>
          <div className="text-dim" style={{ marginBottom: 12 }}>
            Owner ads are free, unlimited, and always show first. Paid ads from businesses appear here for moderation before going live.
          </div>

          {showOwnerAd ? (
            <form onSubmit={createOwnerAd} className="card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>New Owner Ad</div>
              <input placeholder="Title" value={oaName} onChange={(e) => setOaName(e.target.value)} required />
              <input placeholder="Description" value={oaDescription} onChange={(e) => setOaDescription(e.target.value)} required />
              <input placeholder="Image URL" value={oaImageUrl} onChange={(e) => setOaImageUrl(e.target.value)} />
              <input placeholder="Phone (optional)" value={oaPhone} onChange={(e) => setOaPhone(e.target.value)} />
              <input placeholder="WhatsApp (optional)" value={oaWhatsapp} onChange={(e) => setOaWhatsapp(e.target.value)} />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary" disabled={busy === 'owner-ad'} type="submit">Publish</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowOwnerAd(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowOwnerAd(true)}>+ New Owner Ad</button>
          )}

          {ads.map((ad) => (
            <div key={ad.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{ad.business_name}</span>
                <span className={`badge ${
                  ad.status === 'active' ? 'badge-health-good'
                  : ad.status === 'rejected' || ad.status === 'expired' ? 'badge-health-low'
                  : 'badge-health-mid'
                }`}>{ad.status.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="text-dim" style={{ marginBottom: 6 }}>{ad.description}</div>
              <div className="text-dim" style={{ marginBottom: 6, fontSize: 12 }}>
                {ad.owner_type === 'owner' ? 'Owner ad · Free' : 'Paid · KSh ' + ad.amount_paid}
                {ad.risk_level && ' · Risk: ' + ad.risk_level}
              </div>
              {ad.moderation_reason && (
                <div className="text-dim" style={{ marginBottom: 10, fontSize: 12, fontStyle: 'italic' }}>
                  AI note: {ad.moderation_reason}
                </div>
              )}
              {ad.status === 'pending_review' && (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary" disabled={busy === ad.id} onClick={() => approveAd(ad.id)}>Approve</button>
                  <button className="btn btn-secondary" disabled={busy === ad.id} onClick={() => rejectAd(ad.id)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
