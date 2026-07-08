import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface RankedHotspot {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  is_featured: boolean
  health_score: number
  distance_km: number
  rank_score: number
}

interface FeaturedHotspot {
  id: string
  name: string
  address: string
  health_score: number
}

export default function Discover() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [hotspots, setHotspots] = useState<RankedHotspot[]>([])
  const [featured, setFeatured] = useState<FeaturedHotspot[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    loadUnreadCount()

    if (!navigator.geolocation) {
      setLocationError('Location not supported on this device.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await loadHotspots(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setLocationError('Enable location access to find hotspots near you.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  async function loadUnreadCount() {
    if (!user) return
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  async function loadHotspots(lat: number, lng: number) {
    setLoading(true)
    await supabase.rpc('sync_featured_status')

    const { data, error } = await supabase.rpc('ranked_hotspots', {
      user_lat: lat,
      user_lng: lng,
    })
    if (!error && data) setHotspots(data as RankedHotspot[])

    const { data: featuredData } = await supabase.rpc('featured_hotspots')
    if (featuredData) setFeatured(featuredData as FeaturedHotspot[])

    setLoading(false)
  }

  function healthBadgeClass(score: number) {
    if (score >= 70) return 'badge-health-good'
    if (score >= 45) return 'badge-health-mid'
    return 'badge-health-low'
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <div className="title">Nearby Wi-Fi</div>
          <div className="subtitle" style={{ marginBottom: 0 }}>
            Hi {profile?.full_name?.split(' ')[0] || 'there'}
          </div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10 }} onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="row" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/wallet')}>💰 Wallet</button>
        <button className="btn btn-secondary" onClick={() => navigate('/vouchers')}>🎟️ Vouchers</button>
        <button className="btn btn-secondary" onClick={() => navigate('/provider')}>📶 Sell Wi-Fi</button>
        <button className="btn btn-secondary" style={{ position: 'relative' }} onClick={() => navigate('/notifications')}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff',
              borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            }}>
              {unreadCount}
            </span>
          )}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/invite')}>🎁 Invite & Earn</button>
      </div>

      {featured.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>⭐ Featured Providers</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {featured.map((f) => (
              <div
                key={f.id}
                className="card"
                style={{ minWidth: 160, flexShrink: 0, cursor: 'pointer' }}
                onClick={() => navigate(`/hotspot/${f.id}`)}
              >
                <div className="badge badge-featured" style={{ marginBottom: 6 }}>FEATURED</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                <div className="text-dim" style={{ fontSize: 12 }}>{f.address}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-dim">Finding hotspots near you...</div>}

      {locationError && (
        <div className="card">
          <div style={{ marginBottom: 10 }}>{locationError}</div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!loading && !locationError && hotspots.length === 0 && (
        <div className="card text-dim">No hotspots found near you yet.</div>
      )}

      {hotspots.map((h) => (
        <div key={h.id} className="card" onClick={() => navigate(`/hotspot/${h.id}`)} style={{ cursor: 'pointer' }}>
          <div className="row" style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{h.name}</div>
            {h.is_featured && <span className="badge badge-featured">FEATURED</span>}
          </div>
          <div className="text-dim" style={{ marginBottom: 8 }}>{h.address}</div>
          <div className="row">
            <span className="text-dim">{h.distance_km} km away</span>
            <span className={`badge ${healthBadgeClass(h.health_score)}`}>
              Health {h.health_score}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
