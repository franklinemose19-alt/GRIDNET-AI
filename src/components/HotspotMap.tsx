import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

interface MapHotspot {
  id: string
  name: string
  latitude: number
  longitude: number
  is_featured: boolean
  health_score: number
}

interface Props {
  hotspots: MapHotspot[]
  userLat: number
  userLng: number
  onSelect: (id: string) => void
}

export default function HotspotMap({ hotspots, userLat, userLng, onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    if (!mapboxgl.accessToken) return

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [userLng, userLat],
      zoom: 13,
    })

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const userEl = document.createElement('div')
    userEl.style.width = '16px'
    userEl.style.height = '16px'
    userEl.style.borderRadius = '50%'
    userEl.style.background = '#3b82f6'
    userEl.style.border = '3px solid #fff'
    userEl.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.3)'
    new mapboxgl.Marker({ element: userEl }).setLngLat([userLng, userLat]).addTo(mapRef.current)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    hotspots.forEach((h) => {
      const el = document.createElement('div')
      el.style.width = '30px'
      el.style.height = '30px'
      el.style.borderRadius = '50%'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.fontSize = '14px'
      el.style.cursor = 'pointer'
      el.style.border = h.is_featured ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)'
      el.style.background = h.health_score >= 70 ? '#22c55e' : h.health_score >= 45 ? '#f59e0b' : '#ef4444'
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
      el.innerText = '📶'
      el.onclick = () => onSelect(h.id)

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([h.longitude, h.latitude])
        .addTo(mapRef.current!)
      markersRef.current.push(marker)
    })
  }, [hotspots])

  if (!mapboxgl.accessToken) {
    return (
      <div className="card text-dim" style={{ textAlign: 'center', padding: 30 }}>
        Map unavailable — VITE_MAPBOX_TOKEN not set.
      </div>
    )
  }

  return <div ref={mapContainer} style={{ width: '100%', height: '360px', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }} />
}
