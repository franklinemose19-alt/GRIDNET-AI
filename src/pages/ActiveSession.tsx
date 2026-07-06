import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ActiveSession() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [remaining, setRemaining] = useState(0)
  const [status, setStatus] = useState<'loading' | 'active' | 'paused' | 'expired'>('loading')
  const [hotspotId, setHotspotId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  const remainingRef = useRef(0) // avoid stale closures inside intervals
  const disconnectFlagRef = useRef(false)

  useEffect(() => {
    load()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const tickInterval = setInterval(tick, 1000)
    const syncInterval = setInterval(sync, 8000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(tickInterval)
      clearInterval(syncInterval)
    }
  }, [])

  async function load() {
    if (!sessionId) return
    const { data, error } = await supabase
      .from('sessions')
      .select('id, remaining_seconds, status, hotspot_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (error || !data) {
      setStatus('expired')
      return
    }

    remainingRef.current = data.remaining_seconds
    setRemaining(data.remaining_seconds)
    setHotspotId(data.hotspot_id)
    setStatus(data.remaining_seconds <= 0 ? 'expired' : (navigator.onLine ? 'active' : 'paused'))
  }

  function tick() {
    if (!navigator.onLine) return // paused, don't decrement
    if (remainingRef.current <= 0) return

    remainingRef.current -= 1
    setRemaining(remainingRef.current)
    setStatus('active')

    if (remainingRef.current <= 0) {
      expireSession()
    }
  }

  function handleOffline() {
    disconnectFlagRef.current = true
    setStatus('paused')
    sync('pause')
  }

  function handleOnline() {
    setStatus('active')
    sync('resume')
  }

  async function sync(forceAction?: 'pause' | 'resume') {
    if (!sessionId || !user) return
    if (remainingRef.current <= 0) return

    try {
      await fetch('/api/session-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: user.id,
          remainingSeconds: remainingRef.current,
          action: forceAction === 'pause' ? 'pause' : 'sync',
          disconnectIncrement: disconnectFlagRef.current,
        }),
      })
      disconnectFlagRef.current = false
    } catch {
      // heartbeat itself failed to reach server - treat as a disconnect too
      disconnectFlagRef.current = true
      setStatus('paused')
    }
  }

  async function expireSession() {
    if (!sessionId || !user) return
    setStatus('expired')
    try {
      await fetch('/api/session-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: user.id, action: 'expire' }),
      })
    } catch {
      // will reconcile on next load if this fails
    }
  }

  async function submitRating() {
    if (!hotspotId || !user || !sessionId || rating === 0) return
    const { error } = await supabase.from('hotspot_ratings').insert({
      hotspot_id: hotspotId,
      user_id: user.id,
      session_id: sessionId,
      rating,
    })
    if (!error) {
      setRatingSubmitted(true)
      await supabase.rpc('recalculate_health_score', { p_hotspot_id: hotspotId })
    }
  }

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (status === 'loading') return <div className="page center-screen">Loading session...</div>

  if (status === 'expired') {
    return (
      <div className="page">
        <div className="title" style={{ marginTop: 40 }}>Session Ended</div>
        <div className="subtitle">Your internet time is up.</div>

        {!ratingSubmitted ? (
          <div className="card">
            <div style={{ marginBottom: 10 }}>How was your connection?</div>
            <div className="row" style={{ justifyContent: 'center', gap: 10, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  onClick={() => setRating(n)}
                  style={{ fontSize: 28, cursor: 'pointer', opacity: rating >= n ? 1 : 0.3 }}
                >
                  ⭐
                </span>
              ))}
            </div>
            <button className="btn btn-primary" disabled={rating === 0} onClick={submitRating}>
              Submit Rating
            </button>
          </div>
        ) : (
          <div className="card text-dim">Thanks for rating!</div>
        )}

        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate('/discover')}>
          Back to Discover
        </button>
      </div>
    )
  }

  return (
    <div className="page center-screen" style={{ flexDirection: 'column', gap: 16 }}>
      <div className={`badge ${status === 'active' ? 'badge-health-good' : 'badge-health-low'}`}>
        {status === 'active' ? '● CONNECTED' : '⏸ PAUSED — connection lost'}
      </div>
      <div style={{ fontSize: 56, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(remaining)}
      </div>
      <div className="text-dim">
        {status === 'active'
          ? "You're only being charged while connected."
          : "Timer paused. It'll resume automatically once you're back online."}
      </div>
      <button className="btn btn-secondary" onClick={() => navigate('/discover')}>
        Back to Discover
      </button>
    </div>
  )
}
