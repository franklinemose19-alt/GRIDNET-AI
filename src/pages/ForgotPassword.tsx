import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) setError(error)
    else setSent(true)
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginTop: 16 }} onClick={() => navigate('/login')}>
        ← Back
      </button>

      <div className="title" style={{ marginTop: 24 }}>Reset Password</div>
      <div className="subtitle">We'll email you a link to reset it</div>

      {sent ? (
        <div className="card">
          <div style={{ marginBottom: 10 }}>Check your inbox — a reset link has been sent to {email}.</div>
          <Link to="/login" style={{ color: 'var(--accent-blue)' }}>Back to log in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  )
}
