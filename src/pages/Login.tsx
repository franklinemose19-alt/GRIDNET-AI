import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
    else navigate('/discover')
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error)
      setGoogleLoading(false)
    }
    // on success, Supabase redirects the browser away, no further code runs here
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginTop: 16 }} onClick={() => navigate('/')}>
        ← Back
      </button>

      <div className="title" style={{ marginTop: 24 }}>Log In</div>
      <div className="subtitle">Welcome back</div>

      <button className="btn btn-secondary" disabled={googleLoading} onClick={handleGoogle} style={{ marginBottom: 16 }}>
        {googleLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <div className="row" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span className="text-dim" style={{ padding: '0 10px' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input name="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="text-dim" style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/forgot-password" style={{ color: 'var(--accent-blue)' }}>Forgot password?</Link>
      </div>
      <div className="text-dim" style={{ marginTop: 8, textAlign: 'center' }}>
        No account? <Link to="/signup" style={{ color: 'var(--accent-blue)' }}>Sign up</Link>
      </div>
    </div>
  )
}
