import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    mapRef.current = L.map(mapContainer.current, {
      zoomControl: true,
    }).setView([userLat, userLng], 14)

    // dark-friendly free tile layer, no key required
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current)

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })
    L.marker([userLat, userLng], { icon: userIcon }).addTo(mapRef.current)

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
      const color = h.health_score >= 70 ? '#22c55e' : h.health_score >= 45 ? '#f59e0b' : '#ef4444'
      const border = h.is_featured ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.25)'

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;border:${border};background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.4);">📶</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })

      const marker = L.marker([h.latitude, h.longitude], { icon })
        .addTo(mapRef.current!)
        .on('click', () => onSelect(h.id))

      markersRef.current.push(marker)
    })
  }, [hotspots])

  return <div ref={mapContainer} style={{ width: '100%', height: '360px', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }} />
}
