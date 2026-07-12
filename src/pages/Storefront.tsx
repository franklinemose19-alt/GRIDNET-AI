import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface StoreInfo {
  business_name: string | null
  logo_url: string | null
  cover_image_url: string | null
  business_category: string | null
  store_description: string | null
  business_hours: string | null
  store_slug: string | null
  full_name: string | null
  avg_rating: number
  total_ratings: number
  hotspot_count: number
}

interface Hotspot {
  id: string
  name: string
  address: string
  health_score: number
  is_online: boolean
}

interface Package {
  id: string
  hotspot_id: string
  name: string
  duration_minutes: number
  price: number
  data_limit_mb: number | null
}

export default function Storefront() {
  const { providerId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [store, setStore] = useState<StoreInfo | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [providerId])

  async function load() {
    if (!providerId) return
    setLoading(true)

    const resolveResult = await supabase.rpc('resolve_provider_id', { p_identifier: providerId })
    const resolvedId = resolveResult.data

    if (!resolvedId) {
      setLoading(false)
      return
    }

    const storeResult = await supabase.rpc('get_provider_storefront', { p_provider_id: resolvedId })
    if (storeResult.data && storeResult.data.length > 0) setStore(storeResult.data[0] as StoreInfo)

    const hotspotsResult = await supabase
      .from('hotspots')
      .select('id, name, address, health_score, is_online')
      .eq('provider_id', resolvedId)
      .eq('status', 'active')
    const hs = hotspotsResult.data || []
    setHotspots(hs as Hotspot[])

    const hotspotIds = hs.map((h) => h.id)
    if (hotspotIds.length > 0) {
      const packagesResult = await supabase
        .from('packages')
        .select('id, hotspot_id, name, duration_minutes, price, data_limit_mb')
        .in('hotspot_id', hotspotIds)
        .eq('active', true)
        .order('price', { ascending: true })
      if (packagesResult.data) setPackages(packagesResult.data as Package[])
    }

    if (user) {
      const favResult = await supabase
        .from('favorite_providers')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_id', resolvedId)
        .maybeSingle()
      setIsFavorited(!!favResult.data)
    }

    setLoading(false)
  }

  async function toggleFavorite() {
    if (!user || !providerId) return
    setBusy(true)

    const resolveResult = await supabase.rpc('resolve_provider_id', { p_identifier: providerId })
    const resolvedId = resolveResult.data
    if (!resolvedId) { setBusy(false); return }

    if (isFavorited) {
      await supabase.from('favorite_providers').delete().eq('user_id', user.id).eq('provider_id', resolvedId)
    } else {
      await supabase.from('favorite_providers').insert({ user_id: user.id, provider_id: resolvedId })
    }
    setIsFavorited(!isFavorited)
    setBusy(false)
  }

  function ratingStars(rating: number) {
    const fullStars = Math.round(rating)
    let stars = ''
    for (let i = 0; i < 5; i++) stars += i < fullStars ? '\u2605' : '\u2606'
    return stars
  }

  if (loading) return <div className="page center-screen">Loading store...</div>
  if (!store) return <div className="page center-screen">Store not found.</div>

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        {'\u2190'} Back
      </button>

      {store.cover_image_url && (
        <img src={store.cover_image_url} alt="Store cover" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 16, marginBottom: 12 }} />
      )}

      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        {store.logo_url ? (
          <img src={store.logo_url} alt="Store logo" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', margin: '0 auto 12px' }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: 16, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff',
          }}>
            {(store.business_name || store.full_name || 'S').charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {store.business_name || store.full_name + "'s Store"}
        </div>

        {store.business_category && (
          <span className="badge badge-featured" style={{ marginBottom: 8, display: 'inline-block' }}>{store.business_category}</span>
        )}

        {store.total_ratings > 0 ? (
          <div className="text-dim" style={{ marginBottom: 10 }}>
            <span style={{ color: 'var(--accent-amber)' }}>{ratingStars(store.avg_rating)}</span> {store.avg_rating} ({store.total_ratings} ratings)
          </div>
        ) : (
          <div className="text-dim" style={{ marginBottom: 10 }}>No ratings yet</div>
        )}

        {store.store_description && (
          <div className="text-dim" style={{ marginBottom: 10 }}>{store.store_description}</div>
        )}

        {store.business_hours && (
          <div className="text-dim" style={{ marginBottom: 10, fontSize: 12 }}>{'\u{1F550}'} {store.business_hours}</div>
        )}

        <div className="text-dim" style={{ marginBottom: 14, fontSize: 12 }}>
          {store.hotspot_count} location{store.hotspot_count !== 1 ? 's' : ''}
        </div>

        {user && (
          <button className={isFavorited ? 'btn btn-primary' : 'btn btn-secondary'} disabled={busy} onClick={toggleFavorite}>
            {isFavorited ? '\u2605 Favorited' : '\u2606 Save Store'}
          </button>
        )}
      </div>

      <div style={{ fontWeight: 600, margin: '20px 0 10px' }}>Locations</div>
      {hotspots.length === 0 && <div className="card text-dim">No active locations right now.</div>}
      {hotspots.map((h) => (
        <div key={h.id} className="card" onClick={() => navigate('/hotspot/' + h.id)} style={{ cursor: 'pointer' }}>
          <div className="row" style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>{h.name}</div>
            <span className={`badge ${h.is_online ? 'badge-health-good' : 'badge-health-low'}`}>
              {h.is_online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-dim">{h.address} {'\u00B7'} Health {h.health_score}</div>
        </div>
      ))}

      <div style={{ fontWeight: 600, margin: '20px 0 10px' }}>All Packages</div>
      {packages.length === 0 && <div className="card text-dim">No packages listed yet.</div>}
      {packages.map((p) => (
        <div key={p.id} className="card" onClick={() => navigate('/hotspot/' + p.hotspot_id)} style={{ cursor: 'pointer' }}>
          <div className="row">
            <span style={{ fontWeight: 600 }}>{p.name}</span>
            <span style={{ fontWeight: 700 }}>KSh {p.price}</span>
          </div>
          <div className="text-dim">
            {p.duration_minutes} min{p.data_limit_mb ? ' \u00B7 ' + p.data_limit_mb + 'MB' : ' \u00B7 Unlimited data'}
          </div>
        </div>
      ))}
    </div>
  )
}
