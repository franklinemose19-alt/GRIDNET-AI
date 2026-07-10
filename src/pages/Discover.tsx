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

interface AdBanner {
  id: string
  business_name: string
  description: string
  image_urls: string[]
  contact_phone: string | null
  contact_whatsapp: string | null
  owner_type: string
}

export default function Discover() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [hotspots, setHotspots] = useState<RankedHotspot[]>([])
  const [featured, setFeatured] = useState<FeaturedHotspot[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [adPromo, setAdPromo] = useState<AdPromo | null>(null)
  const [adBanner, setAdBanner] = useState<AdBanner | null>(null)
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
      function (pos) {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        loadHotspots(pos.coords.latitude, pos.coords.longitude)
      },
      function () {
        setLocationError('Enable location access to find hotspots near you.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  async function loadBanners() {
    const bannerResult = await supabase
      .from('home_banners')
      .select('id, title, media_url, media_type, link_url')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .limit(1)

    if (bannerResult.data) setBanners(bannerResult.data as Banner[])

    const settingsResult = await supabase
      .from('platform_settings')
      .select('ad_contact_name, ad_contact_phone, ad_contact_whatsapp, ad_price_7d, ad_price_30d, show_ad_promo')
      .eq('id', 1)
      .maybeSingle()

    if (settingsResult.data) setAdPromo(settingsResult.data as AdPromo)

    const adBannerResult = await supabase.rpc('get_ad_banner')
    if (adBannerResult.data && adBannerResult.data.length > 0) {
      const ad = adBannerResult.data[0]
      setAdBanner(ad as AdBanner)
      supabase.rpc('increment_ad_impression', { p_ad_id: ad.id })
    }
  }

  async function loadUnreadCount() {
    if (!user) return
    const result = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('read', false)
    setUnreadCount(result.count || 0)
  }

  async function loadHotspots(lat: number, lng: number) {
    setLoading(true)
    await supabase.rpc('sync_featured_status')

    const rankedResult = await supabase.rpc('ranked_hotspots', {
      user_lat: lat,
      user_lng: lng,
    })
    if (!rankedResult.error && rankedResult.data) setHotspots(rankedResult.data as RankedHotspot[])

    const featuredResult = await supabase.rpc('featured_hotspots')
    if (featuredResult.data) setFeatured(featuredResult.data as FeaturedHotspot[])

    setLoading(false)
  }

  function healthBadgeClass(score: number) {
    if (score >= 70) return 'badge-health-good'
    if (score >= 45) return 'badge-health-mid'
    return 'badge-health-low'
  }

  function handleBannerClick(banner: Banner) {
    if (!banner.link_url) return
    if (banner.link_url.indexOf('http') === 0) {
      window.open(banner.link_url, '_blank')
    } else {
      navigate(banner.link_url)
    }
  }

  function handleAdClick() {
    if (!adBanner) return
    supabase.rpc('increment_ad_click', { p_ad_id: adBanner.id })
    if (adBanner.contact_whatsapp) {
      window.open('https://wa.me/' + adBanner.contact_whatsapp, '_blank')
    }
  }

  function openWhatsapp() {
    if (!adPromo || !adPromo.ad_contact_whatsapp) return
    window.open('https://wa.me/' + adPromo.ad_contact_whatsapp, '_blank')
  }

  function callPhone() {
    if (!adPromo || !adPromo.ad_contact_phone) return
    window.location.href = 'tel:' + adPromo.ad_contact_phone
  }

  const actions = [
    { label: 'Wallet', icon: '\u{1F4B0}', iconClass: 'icon-green', path: '/wallet' },
    { label: 'Vouchers', icon: '\u{1F39F}\u{FE0F}', iconClass: 'icon-blue', path: '/vouchers' },
    { label: 'Sell Wi-Fi', icon: '\u{1F4F6}', iconClass: 'icon-amber', path: '/provider' },
    { label: 'Alerts', icon: '\u{1F514}', iconClass: 'icon-red', path: '/notifications', badge: unreadCount },
    { label: 'Invite', icon: '\u{1F381}', iconClass: 'icon-purple', path: '/invite' },
    { label: 'Advertise any business', icon: '\u{1F4E2}', iconClass: 'icon-green', path: '/advertise' },
  ]

  return (
    <div className="page">
      {banners.length > 0 && (
        <div onClick={function () { handleBannerClick(banners[0]) }} className="banner-wrap">
          {banners[0].media_type === 'video' ? (
            <video src={banners[0].media_url} autoPlay muted loop playsInline className="banner-media" />
          ) : (
            <img src={banners[0].media_url} alt={banners[0].title} className="banner-media" />
          )}
        </div>
      )}

      {adBanner && (
        <div className="card ad-promo-card" onClick={handleAdClick} style={{ cursor: adBanner.contact_whatsapp ? 'pointer' : 'default' }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{adBanner.business_name}</span>
            <span className="badge badge-featured">{adBanner.owner_type === 'owner' ? 'GRIDNET AI' : 'SPONSORED'}</span>
          </div>
          {adBanner.image_urls && adBanner.image_urls[0] && (
            <img src={adBanner.image_urls[0]} alt={adBanner.business_name} style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />
          )}
          <div className="text-dim">{adBanner.description}</div>
        </div>
      )}

      {adPromo && adPromo.show_ad_promo && (
        <div className="card ad-promo-card">
          <div className="row" style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Advertise Here</span>
            <span className="badge badge-featured">SPONSOR</span>
          </div>
          <div className="text-dim" style={{ marginBottom: 10 }}>
            Reach everyone using {adPromo.ad_contact_name}. KSh {adPromo.ad_price_7d} per 7 days or KSh {adPromo.ad_price_30d} per 30 days.
          </div>
          <div className="row" style={{ gap: 8 }}>
            {adPromo.ad_contact_whatsapp && (
              <button className="btn btn-primary" onClick={openWhatsapp}>WhatsApp</button>
            )}
            {adPromo.ad_contact_phone && (
              <button className="btn btn-secondary" onClick={callPhone}>Call</button>
            )}
          </div>
        </div>
      )}

      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <div className="title">Nearby Wi-Fi</div>
          <div className="subtitle" style={{ marginBottom: 0 }}>
            Hi {profile && profile.full_name ? profile.full_name.split(' ')[0] : 'there'}
          </div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10 }} onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="action-grid">
        {actions.map(function (a) {
          return (
            <div key={a.label} className="action-tile" onClick={function () { navigate(a.path) }}>
              <div className={'action-icon ' + a.iconClass}>{a.icon}</div>
              <div className="action-label">{a.label}</div>
              {a.badge ? <span className="action-badge">{a.badge}</span> : null}
            </div>
          )
        })}
      </div>

      {featured.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Featured Providers</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {featured.map(function (f) {
              return (
                <div key={f.id} className="card featured-tile" onClick={function () { navigate('/hotspot/' + f.id) }}>
                  <div className="badge badge-featured" style={{ marginBottom: 6 }}>FEATURED</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                  <div className="text-dim" style={{ fontSize: 12 }}>{f.address}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading && <div className="text-dim">Finding hotspots near you...</div>}

      {locationError && (
        <div className="card">
          <div style={{ marginBottom: 10 }}>{locationError}</div>
          <button className="btn btn-primary" onClick={function () { window.location.reload() }}>Retry</button>
        </div>
      )}

      {!loading && !locationError && (
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button className={view === 'list' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={function () { setView('list') }}>
            List
          </button>
          <button className={view === 'map' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={function () { setView('map') }}>
            Map
          </button>
        </div>
      )}

      {!loading && !locationError && view === 'map' && coords && (
        <HotspotMap
          hotspots={hotspots}
          userLat={coords.lat}
          userLng={coords.lng}
          onSelect={function (id) { navigate('/hotspot/' + id) }}
        />
      )}

      {!loading && !locationError && hotspots.length === 0 && (
        <div className="card text-dim">No hotspots found near you yet.</div>
      )}

      {view === 'list' && hotspots.map(function (h) {
        return (
          <div key={h.id} className="card" onClick={function () { navigate('/hotspot/' + h.id) }} style={{ cursor: 'pointer' }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{h.name}</div>
              {h.is_featured && <span className="badge badge-featured">FEATURED</span>}
            </div>
            <div className="text-dim" style={{ marginBottom: 8 }}>{h.address}</div>
            <div className="row">
              <span className="text-dim">{h.distance_km} km away</span>
              <span className={'badge ' + healthBadgeClass(h.health_score)}>
                Health {h.health_score}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
