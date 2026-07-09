import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="page" style={{ maxWidth: 480, paddingBottom: 50 }}>
      <div className="hero-wrap">
        <div className="radar-stage">
          <div className="radar-ring r1" />
          <div className="radar-ring r2" />
          <div className="radar-ring r3" />
          <div className="radar-ping p1" />
          <div className="radar-ping p2" />
          <div className="radar-ping p3" />
          <div className="radar-core">📶</div>
        </div>

        <div className="hero-wordmark">GRIDNET AI</div>
        <div className="hero-tagline">
          Find internet nearby, in seconds. Only pay for the time you're actually connected.
        </div>
      </div>

      <div className="stat-strip">
        <span>FREE FOR BUYERS</span>
        <span>4 PROVIDER TIERS</span>
        <span>KSH · M-PESA</span>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-blue">📍</div>
        <div>
          <div className="feature-title">Find Wi-Fi Near You</div>
          <div className="feature-desc">Nearby hotspots ranked by distance and real reliability — not just who paid the most.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-green">⏱️</div>
        <div>
          <div className="feature-title">Fair, Adaptive Billing</div>
          <div className="feature-desc">Your timer pauses automatically if you lose connection, and resumes the moment you're back.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-purple">🎟️</div>
        <div>
          <div className="feature-title">Buy, Sell & Resell Vouchers</div>
          <div className="feature-desc">Every purchase gives you a voucher code. Use it now, gift it, or resell it to someone nearby.</div>
        </div>
      </div>

      <div className="feature-row" style={{ marginBottom: 26 }}>
        <div className="feature-icon icon-amber">📶</div>
        <div>
          <div className="feature-title">Be the Net</div>
          <div className="feature-desc">Got Wi-Fi to spare? List it, set your price, and start earning — no approval process, no upfront cost.</div>
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

      <div className="text-dim" style={{ textAlign: 'center', marginTop: 22, fontSize: 12 }}>
        Buying is always free. Only providers pay, and only when they earn.
      </div>
    </div>
  )
}
