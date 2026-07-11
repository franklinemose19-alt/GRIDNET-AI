import React, { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [asProvider, setAsProvider] = useState(false)
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signUp(email, password, fullName, phone, asProvider, referralCode || undefined)
    setLoading(false)
    if (error) setError(error)
    else navigate(asProvider ? '/provider' : '/discover')
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginTop: 16 }} onClick={() => navigate('/')}>
        ← Back
      </button>

      <div className="title" style={{ marginTop: 24 }}>Sign Up</div>
      <div className="subtitle">Join GRIDNET AI</div>
      <form onSubmit={handleSubmit}>
        <input name="fullName" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input name="phone" placeholder="Phone (e.g. 2547...)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input name="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input name="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input name="referralCode" placeholder="Referral code (optional)" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
        <label className="row card" style={{ cursor: 'pointer' }}>
          <span>Register as a Wi-Fi provider</span>
          <input name="asProvider" type="checkbox" style={{ width: 'auto' }} checked={asProvider} onChange={(e) => setAsProvider(e.target.checked)} />
        </label>
        <div className="text-dim" style={{ marginBottom: 12, textAlign: 'center', fontSize: 12 }}>
  By signing up, you agree to GRIDNET AI's{' '}
  <Link to="/legal" style={{ color: 'var(--accent-blue)' }}>Terms of Service and Privacy Policy</Link>.
</div>
        {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <div className="text-dim" style={{ marginTop: 16, textAlign: 'center' }}>
        Have an account? <Link to="/login" style={{ color: 'var(--accent-blue)' }}>Log in</Link>
      </div>
    </div>
  )
}
