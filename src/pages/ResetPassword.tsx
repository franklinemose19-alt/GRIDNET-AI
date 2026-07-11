import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error)
    else setDone(true)
  }

  return (
    <div className="page">
      <div className="title" style={{ marginTop: 40 }}>Set New Password</div>
      <div className="subtitle">Choose a new password for your account</div>

      {done ? (
        <div className="card">
          <div style={{ marginBottom: 10 }}>Password updated successfully.</div>
          <button className="btn btn-primary" onClick={() => navigate('/discover')}>Continue</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input name="password" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input name="confirmPassword" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  )
}
