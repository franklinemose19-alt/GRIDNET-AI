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

const DURATION_LABELS: Record<string, string> = {
  weekly: 'Weekly', monthly: 'Monthly', sixmonths: '6 Months', annual: 'Annual',
}

export default function Advertise() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [packages, setPackages] = useState<AdPackage[]>([])
  const [selectedPkg, setSelectedPkg] = useState<AdPackage | null>(null)
  const [wallet, setWallet] = useState<{ balance: number } | null>(null)

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

  useEffect(() => { load() }, [])

  async function load() {
    if (!user) return
    setLoading(true)
    const { data: pkgs } = await supabase.from('ad_packages').select('*').order('price', { ascending: true })
    if (pkgs) setPackages(pkgs as AdPackage[])

    const { data: w } = await supabase.from('wallets').select('balance').eq('profile_id', user.id).maybeSingle()
    if (w) setWallet(w as any)
    setLoading(false)
  }

  function selectPackage(pkg: AdPackage) {
    setSelectedPkg(pkg)
    setStep('details')
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

  if (loading) return <div className="page center-screen">Loading...</div>

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="title">Advertise on GRIDNET AI</div>
      <div className="subtitle">Reach everyone using the app, right from your wallet balance</div>

      {step === 'package' && (
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

      {step === 'details' && selectedPkg && (
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

      {step === 'result' && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>{resultOk ? '✓' : '✕'}</div>
          <div style={{ marginBottom: 16 }}>{resultMsg}</div>
          <button className="btn btn-primary" onClick={() => navigate('/discover')}>Back to Discover</button>
        </div>
      )}
    </div>
  )
}
