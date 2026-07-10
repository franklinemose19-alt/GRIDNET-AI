import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface AdPackage {
  id: string
  duration_type: string
  tier: string
  price: number
  image_slots: number
  days: number
}

interface MyAd {
  id: string
  business_name: string
  description: string
  status: string
  risk_level: string | null
  moderation_reason: string | null
  amount_paid: number
  impressions: number
  clicks: number
  ends_at: string | null
  package_id: string | null
  category: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  location_address: string | null
  image_urls: string[]
}

const DURATION_LABELS: Record<string, string> = {
  weekly: 'Weekly', monthly: 'Monthly', sixmonths: '6 Months', annual: 'Annual',
}

export default function Advertise() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [mainTab, setMainTab] = useState<'new' | 'mine'>('new')

  const [packages, setPackages] = useState<AdPackage[]>([])
  const [selectedPkg, setSelectedPkg] = useState<AdPackage | null>(null)
  const [wallet, setWallet] = useState<{ balance: number } | null>(null)
  const [myAds, setMyAds] = useState<MyAd[]>([])

  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [imageUrl1, setImageUrl1] = useState('')
  const [imageUrl2, setImageUrl2] = useState('')
  const [imageUrl3, setImageUrl3] = useState('')

  const [step, setStep] = useState<'package' | 'details' | 'result'>('package')
  const [moderating, setModerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const [resultOk, setResultOk] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [mainTab])

  async function load() {
    if (!user) return
    setLoading(true)

    if (mainTab === 'new') {
      const { data: pkgs } = await supabase.from('ad_packages').select('*').order('price', { ascending: true })
      if (pkgs) setPackages(pkgs as AdPackage[])

      const { data: w } = await supabase.from('wallets').select('balance').eq('profile_id', user.id).maybeSingle()
      if (w) setWallet(w as any)
    }

    if (mainTab === 'mine') {
      const { data: ads } = await supabase
        .from('advertisements')
        .select('id, business_name, description, status, risk_level, moderation_reason, amount_paid, impressions, clicks, ends_at, package_id, category, contact_phone, contact_whatsapp, location_address, image_urls')
        .eq('advertiser_id', user.id)
        .order('created_at', { ascending: false })
      if (ads) setMyAds(ads as MyAd[])
    }

    setLoading(false)
  }

  function selectPackage(pkg: AdPackage) {
    setSelectedPkg(pkg)
    setStep('details')
  }

  function startRenew(ad: MyAd) {
    setMainTab('new')
    setBusinessName(ad.business_name)
    setDescription(ad.description)
    setCategory(ad.category || '')
    setContactPhone(ad.contact_phone || '')
    setContactWhatsapp(ad.contact_whatsapp || '')
    setLocationAddress(ad.location_address || '')
    setImageUrl1(ad.image_urls && ad.image_urls[0] ? ad.image_urls[0] : '')
    setImageUrl2(ad.image_urls && ad.image_urls[1] ? ad.image_urls[1] : '')
    setImageUrl3(ad.image_urls && ad.image_urls[2] ? ad.image_urls[2] : '')
    setStep('package')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedPkg) return

    setError('')
    setSubmitting(true)
    setModerating(true)

    const imageUrls = [imageUrl1, imageUrl2, imageUrl3].filter(Boolean).slice(0, selectedPkg.image_slots)

    try {
      const modRes = await fetch('/api/ad-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, description, imageUrls, contactPhone, contactWhatsapp }),
      })
      const modData = await modRes.json()
      setModerating(false)

      if (!modRes.ok) {
        setError(modData.error || 'Moderation check failed, try again.')
        setSubmitting(false)
        return
      }

      const buyRes = await fetch('/api/wallet-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy-ad',
          advertiserId: user.id,
          packageId: selectedPkg.id,
          businessName, description, category, contactPhone, contactWhatsapp, locationAddress,
          imageUrls,
          riskLevel: modData.risk_level,
          moderationReason: modData.reason,
        }),
      })
      const buyData = await buyRes.json()

      if (!buyRes.ok) {
        setError(buyData.error || 'Could not complete purchase.')
        setSubmitting(false)
        return
      }

      setResultOk(true)
      if (modData.risk_level === 'low') {
        setResultMsg('Your advert is live now! It will run for the next ' + selectedPkg.days + ' days.')
      } else {
        setResultMsg('Payment received. Your advert needs a quick manual check (' + modData.reason + ') before going live — you will be notified once approved.')
      }
      setStep('result')
    } catch {
      setError('Network error, try again.')
      setModerating(false)
    }
    setSubmitting(false)
  }

  function statusBadgeClass(status: string) {
    if (status === 'active') return 'badge-health-good'
    if (status === 'rejected' || status === 'expired' || status === 'cancelled') return 'badge-health-low'
    return 'badge-health-mid'
  }

  function isExpiringSoon(endsAt: string | null) {
    if (!endsAt) return false
    const daysLeft = (new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysLeft > 0 && daysLeft <= 3
  }

  if (loading) return <div className="page center-screen">Loading...</div>

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="title">Advertise on GRIDNET AI</div>
      <div className="subtitle">Reach everyone using the app, right from your wallet balance</div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button className={mainTab === 'new' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => { setMainTab('new'); setStep('package') }}>
          New Ad
        </button>
        <button className={mainTab === 'mine' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setMainTab('mine')}>
          My Ads
        </button>
      </div>

      {mainTab === 'mine' && (
        <>
          {myAds.length === 0 && <div className="card text-dim">You haven't created any adverts yet.</div>}
          {myAds.map((ad) => (
            <div key={ad.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{ad.business_name}</span>
                <span className={`badge ${statusBadgeClass(ad.status)}`}>{ad.status.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="text-dim" style={{ marginBottom: 8 }}>{ad.description}</div>

              {ad.status === 'pending_review' && ad.moderation_reason && (
                <div className="text-dim" style={{ marginBottom: 8, fontSize: 12, fontStyle: 'italic' }}>
                  Under review: {ad.moderation_reason}
                </div>
              )}
              {ad.status === 'rejected' && ad.moderation_reason && (
                <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--danger)' }}>
                  Rejected: {ad.moderation_reason}
                </div>
              )}

              <div className="row" style={{ marginBottom: 8 }}>
                <span className="text-dim">Impressions</span>
                <span>{ad.impressions}</span>
              </div>
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="text-dim">Clicks</span>
                <span>{ad.clicks}</span>
              </div>
              {ad.ends_at && (
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="text-dim">Expires</span>
                  <span style={{ color: isExpiringSoon(ad.ends_at) ? 'var(--warning)' : undefined }}>
                    {new Date(ad.ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              {(ad.status === 'active' || ad.status === 'expired' || ad.status === 'rejected') && (
                <button className="btn btn-primary" onClick={() => startRenew(ad)}>
                  {ad.status === 'expired' ? 'Renew' : ad.status === 'rejected' ? 'Edit & Resubmit' : 'Renew Early'}
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {mainTab === 'new' && step === 'package' && (
        <>
          <div className="card">
            <span className="text-dim">Wallet Balance</span>
            <div style={{ fontWeight: 700, fontSize: 20 }}>KSh {wallet?.balance.toFixed(2) ?? '0.00'}</div>
          </div>

          {(['weekly', 'monthly', 'sixmonths', 'annual'] as const).map((duration) => (
            <div key={duration} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{DURATION_LABELS[duration]}</div>
              {packages.filter((p) => p.duration_type === duration).map((p) => (
                <div key={p.id} className="card" onClick={() => selectPackage(p)} style={{ cursor: 'pointer' }}>
                  <div className="row" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.tier}</span>
                    <span style={{ fontWeight: 700 }}>KSh {p.price}</span>
                  </div>
                  <div className="text-dim">{p.image_slots} image{p.image_slots > 1 ? 's' : ''} · {p.days} days</div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {mainTab === 'new' && step === 'details' && selectedPkg && (
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="row">
              <span className="text-dim">Selected plan</span>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selectedPkg.tier} · {DURATION_LABELS[selectedPkg.duration_type]} · KSh {selectedPkg.price}</span>
            </div>
          </div>

          <input placeholder="Business or provider name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          <input placeholder="Category (e.g. Cafe, Barber, Electronics)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <input placeholder="Location / address" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
          <input placeholder="Phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <input placeholder="WhatsApp number (e.g. 254712345678)" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} />

          <input placeholder="Image URL 1" value={imageUrl1} onChange={(e) => setImageUrl1(e.target.value)} required />
          {selectedPkg.image_slots >= 2 && (
            <input placeholder="Image URL 2" value={imageUrl2} onChange={(e) => setImageUrl2(e.target.value)} />
          )}
          {selectedPkg.image_slots >= 3 && (
            <input placeholder="Image URL 3" value={imageUrl3} onChange={(e) => setImageUrl3(e.target.value)} />
          )}

          {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {moderating ? 'Running safety check...' : submitting ? 'Processing payment...' : 'Submit & Pay KSh ' + selectedPkg.price}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setStep('package')}>Back</button>
          </div>
        </form>
      )}

      {mainTab === 'new' && step === 'result' && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>{resultOk ? '✓' : '✕'}</div>
          <div style={{ marginBottom: 16 }}>{resultMsg}</div>
          <button className="btn btn-primary" onClick={() => { setStep('package'); setMainTab('mine') }}>View My Ads</button>
        </div>
      )}
    </div>
  )
}
