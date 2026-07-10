import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import HotspotMap from '../components/HotspotMap'

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

interface Banner {
  id: string
  title: string
  media_url: string
  media_type: string
  link_url: string | null
}

interface AdPromo {
  ad_contact_name: string
  ad_contact_phone: string | null
  ad_contact_whatsapp: string | null
  ad_price_7d: number
  ad_price_30d: number
  show_ad_promo: boolean
}

export default function Discover() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [hotspots, setHotspots] = useState<RankedHotspot[]>([])
  const [featured, setFeatured] = useState<FeaturedHotspot[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [adPromo, setAdPromo] = useState<AdPromo | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    loadUnreadCount()
    loadBanners()

    if (!navigator.geolocation) {
      setLocationError('Location not supported on this device.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        await loadHotspots(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setLocationError('Enable location access to find hotspots near you.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  async function loadBanners() {
    const { data } = await supabase
      .from('home_banners')
      .select('id, title, media_url, media_type, link_url')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .limit(1)
    if (data) setBanners(data as Banner[])

    const { data: promoData } = await supabase
      .from('platform_settings')
      .select('ad_contact_name, ad_contact_phone, ad_contact_whatsapp, ad_price_7d, ad_price_30d, show_ad_promo')
      .eq('id', 1)
      .maybeSingle()
    if (promoData) setAdPromo(promoData as AdPromo)
  }

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

  function handleBannerClick(banner: Banner) {
    if (!banner.link_url) return
    if (banner.link_url.startsWith('http')) {
      window.open(banner.link_url, '_blank')
    } else {
      navigate(banner.link_url)
    }
  }

  const actions = [
    { label: 'Wallet', icon: '💰', iconClass: 'icon-green', path: '/wallet' },
    { label: 'Vouchers', icon: '🎟️', iconClass: 'icon-blue', path: '/vouchers' },
    { label: 'Sell Wi-Fi', icon: '📶', iconClass: 'icon-amber', path: '/provider' },
    { label: 'Alerts', icon: '🔔', iconClass: 'icon-red', path: '/notifications', badge: unreadCount },
    { label: 'Invite', icon: '🎁', iconClass: 'icon-purple', path: '/invite' },
  ]

  const whatsappHref = adPromo?.ad_contact_whatsapp
    ? 'https://wa.me/' + adPromo.ad_contact_whatsapp
    : ''
  const phoneHref = adPromo?.ad_contact_phone
    ? 'tel:' + adPromo.ad_contact_phone
    : ''

  return (
    <div className="page">
      {banners.length > 0 && (
        <div
          onClick={() => handleBannerClick(banners[0])}
          style={{
            width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16,
            cursor: banners[0].link_url ? 'pointer' : 'default',
          }}
        >
          {banners[0].media_type === 'video' ? (
            <video src={banners[0].media_url} autoPlay muted loop playsInline style={{ width: '100%', display: 'block' }} />
          ) : (
            <img src={banners[0].media_url} alt={banners[0].title} style={{ width: '100%', display: 'block' }} />
          )}
        </div>
      )}

      {adPromo && adPromo.show_ad_promo && (
        <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(34,197,94,0.08))' }}>
          <div className="row" style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Advertise Here</span>
            <span className="badge badge-featured">SPONSOR</span>
          </div>
          <div className="text-dim" style={{ marginBottom: 10 }}>
            Reach everyone using {adPromo.ad_contact_name} - KSh {adPromo.ad_price_7d}/7 days or KSh {adPromo.ad_price_30d}/30 days
          </div>
          <div className="row" style={{ gap: 8 }}>
            {whatsappHref && (
              
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                WhatsApp
              </a>
            )}
            {phoneHref && (
              
                href={phoneHref}
                className="btn btn-secondary"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Call
              </a>
            )}
          </div>
        </div>
      )}

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

      <div className="action-grid">
        {actions.map((a) => (
          <div key={a.label} className="action-tile" onClick={() => navigate(a.path)}>
            <div className={`action-icon ${a.iconClass}`}>{a.icon}</div>
            <div className="action-label">{a.label}</div>
            {!!a.badge && <span className="action-badge">{a.badge}</span>}
          </div>
        ))}
      </div>

      {featured.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Featured Providers</div>
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

      {!loading && !locationError && (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <button className={view === 'list' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setView('list')}>
              List
            </button>
            <button className={view === 'map' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setView('map')}>
              Map
            </button>
          </div>

          {view === 'map' && coords && (
            <HotspotMap
              hotspots={hotspots}
              userLat={coords.lat}
              userLng={coords.lng}
              onSelect={(id) => navigate(`/hotspot/${id}`)}
            />
          )}
        </>
      )}

      {!loading && !locationError && hotspots.length === 0 && (
        <div className="card text-dim">No hotspots found near you yet.</div>
      )}

      {view === 'list' && hotspots.map((h) => (
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
