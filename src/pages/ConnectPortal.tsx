import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Hotspot {
  id: string
  name: string
  address: string
}

interface Package {
  id: string
  name: string
  duration_minutes: number
  price: number
  data_limit_mb: number | null
}

export default function ConnectPortal() {
  const { hotspotId } = useParams()
  const [searchParams] = useSearchParams()
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const mac = searchParams.get('mac') || ''
  const linkLoginOnly = searchParams.get('link-login-only') || ''
  const linkOrig = searchParams.get('link-orig') || ''

  const [hotspot, setHotspot] = useState<Hotspot | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successCode, setSuccessCode] = useState('')

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => { load() }, [hotspotId])

  async function load() {
    if (!hotspotId) return
    setLoading(true)

    const hResult = await supabase.from('hotspots').select('id, name, address').eq('id', hotspotId).maybeSingle()
    if (hResult.data) setHotspot(hResult.data as Hotspot)

    const pResult = await supabase
      .from('packages')
      .select('id, name, duration_minutes, price, data_limit_mb')
      .eq('hotspot_id', hotspotId)
      .eq('active', true)
      .order('price', { ascending: true })
    if (pResult.data) setPackages(pResult.data as Package[])

    setLoading(false)
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthBusy(true)
    setAuthError('')

    if (authMode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setAuthError(error)
    } else {
      const { error } = await signUp(email, password, fullName, phone, false)
      if (error) setAuthError(error)
    }
    setAuthBusy(false)
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
        setBuying(null)
        return
      }

      const code = data.voucher.code
      setSuccessCode(code)

      if (linkLoginOnly) {
        const loginUrl = linkLoginOnly +
          '?username=' + encodeURIComponent(code) +
          '&password=' + encodeURIComponent(code) +
          (linkOrig ? '&dst=' + encodeURIComponent(linkOrig) : '')
        setTimeout(function () { window.location.href = loginUrl }, 1500)
      }
    } catch {
      setError('Network error, try again.')
      setBuying(null)
    }
  }

  if (loading) return <div className="page center-screen">Loading...</div>
  if (!hotspot) return <div className="page center-screen">Hotspot not found.</div>

  if (successCode) {
    return (
      <div className="page center-screen" style={{ flexDirection: 'column', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>{'\u2705'}</div>
        <div className="title">You're connected!</div>
        {linkLoginOnly ? (
          <div className="text-dim">Redirecting you to the internet now...</div>
        ) : (
          <>
            <div className="text-dim">Your access code:</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>{successCode}</div>
            <div className="text-dim">Show this code to the venue if you're not redirected automatically.</div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="title" style={{ marginBottom: 2 }}>{hotspot.name}</div>
        <div className="text-dim">{hotspot.address}</div>
      </div>

      {mac && (
        <div className="card text-dim" style={{ fontSize: 11, textAlign: 'center' }}>
          Device detected {'\u00B7'} connecting via hotspot
        </div>
      )}

      {!user ? (
        <div className="card">
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <button className={authMode === 'login' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setAuthMode('login')}>Log In</button>
            <button className={authMode === 'signup' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setAuthMode('signup')}>Sign Up</button>
          </div>
          <form onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <>
                <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <input placeholder="Phone (e.g. 0712345678)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </>
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {authError && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{authError}</div>}
            <button className="btn btn-primary" type="submit" disabled={authBusy}>
              {authBusy ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Choose a package</div>
          {packages.length === 0 && <div className="card text-dim">No packages available right now.</div>}
          {packages.map((pkg) => (
            <div key={pkg.id} className="card">
              <div className="row" style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{pkg.name}</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>KSh {pkg.price}</div>
              </div>
              <div className="text-dim" style={{ marginBottom: 12 }}>
                {pkg.duration_minutes} min{pkg.data_limit_mb ? ` \u00B7 ${pkg.data_limit_mb}MB` : ' \u00B7 Unlimited data'}
              </div>
              <button className="btn btn-primary" disabled={buying === pkg.id} onClick={() => handleBuy(pkg.id)}>
                {buying === pkg.id ? 'Connecting...' : 'Buy & Connect'}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
