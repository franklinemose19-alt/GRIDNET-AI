import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Hotspot {
  id: string
  name: string
  address: string
  health_score: number
  is_featured: boolean
}

interface Package {
  id: string
  name: string
  duration_minutes: number
  data_limit_mb: number | null
  price: number
}

export default function HotspotDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hotspot, setHotspot] = useState<Hotspot | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    if (!id) return
    setLoading(true)

    const { data: h } = await supabase
      .from('hotspots')
      .select('id, name, address, health_score, is_featured')
      .eq('id', id)
      .maybeSingle()

    const { data: p } = await supabase
      .from('packages')
      .select('id, name, duration_minutes, data_limit_mb, price')
      .eq('hotspot_id', id)
      .eq('active', true)
      .order('price', { ascending: true })

    if (h) setHotspot(h as Hotspot)
    if (p) setPackages(p as Package[])
    setLoading(false)
  }

  async function handleBuy(packageId: string) {
    if (!user) return
    setBuying(packageId)
    setError('')

    try {
      const res = await fetch('/api/wallet-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase-package', userId: user.id, packageId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Purchase failed')
      } else {
        navigate('/vouchers')
      }
    } catch {
      setError('Network error, try again.')
    }
    setBuying(null)
  }

  if (loading) return <div className="page center-screen">Loading hotspot...</div>
  if (!hotspot) return <div className="page center-screen">Hotspot not found.</div>

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="row" style={{ marginBottom: 4 }}>
        <div className="title">{hotspot.name}</div>
        {hotspot.is_featured && <span className="badge badge-featured">FEATURED</span>}
      </div>
      <div className="subtitle">{hotspot.address}</div>

      {error && (
        <div className="card">
          <div style={{ color: 'var(--danger)', marginBottom: error.includes('Insufficient') ? 10 : 0 }}>
            {error}
          </div>
          {error.includes('Insufficient') && (
            <button className="btn btn-primary" onClick={() => navigate('/wallet')}>
              Top Up Now
            </button>
          )}
        </div>
      )}

      <div style={{ fontWeight: 600, margin: '10px 0' }}>Available Packages</div>
      {packages.length === 0 && <div className="text-dim">No packages listed yet.</div>}

      {packages.map((pkg) => (
        <div key={pkg.id} className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{pkg.name}</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>KSh {pkg.price}</div>
          </div>
          <div className="text-dim" style={{ marginBottom: 12 }}>
            {pkg.duration_minutes} min{pkg.data_limit_mb ? ` · ${pkg.data_limit_mb}MB` : ' · Unlimited data'}
          </div>
          <button className="btn btn-primary" disabled={buying === pkg.id} onClick={() => handleBuy(pkg.id)}>
            {buying === pkg.id ? 'Processing...' : 'Buy'}
          </button>
        </div>
      ))}
    </div>
  )
}
