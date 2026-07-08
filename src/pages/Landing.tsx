import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="page" style={{ maxWidth: 480, paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          fontSize: 34, fontWeight: 800, letterSpacing: -0.5,
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          GRIDNET AI
        </div>
        <div className="text-dim" style={{ fontSize: 15, marginTop: 6 }}>
          Find internet nearby. Only pay for time you're connected.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>📍</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Find Wi-Fi Near You</div>
        <div className="text-dim">
          See nearby hotspots ranked by distance and real reliability — not just who paid the most.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>⏱️</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Fair, Adaptive Billing</div>
        <div className="text-dim">
          Your timer pauses automatically if you lose connection, and resumes the moment you're back — you never pay for downtime.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>🎟️</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Buy, Sell & Resell Vouchers</div>
        <div className="text-dim">
          Every purchase gives you a voucher code. Use it, or resell it to someone nearby who needs it now.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>📶</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Be the Net</div>
        <div className="text-dim">
          Got Wi-Fi to spare? List it, set your price, and start earning — no approval process, no upfront cost.
        </div>
      </div>

      <Link to="/signup" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        Get Started
      </Link>
      <Link to="/login" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        Log In
      </Link>
      <Link to="/pricing" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
        View Provider Pricing
      </Link>

      <div className="text-dim" style={{ textAlign: 'center', marginTop: 24, fontSize: 12 }}>
        Buying is always free. Only providers pay, and only when they earn.
      </div>
    </div>
  )
}
