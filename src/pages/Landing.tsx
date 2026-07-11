import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="page" style={{ maxWidth: 480, paddingBottom: 60 }}>
      <div className="hero-wrap">
        <div className="radar-stage">
          <div className="radar-ring r1" />
          <div className="radar-ring r2" />
          <div className="radar-ring r3" />
          <div className="radar-ping p1" />
          <div className="radar-ping p2" />
          <div className="radar-ping p3" />
          <div className="radar-core">{'\u{1F4F6}'}</div>
        </div>

        <div className="hero-wordmark">GRIDNET AI</div>
        <div className="hero-tagline">
          Kenya's marketplace for internet access. Find Wi-Fi nearby, pay only for time connected, and never overpay for a bad connection again.
        </div>
      </div>

      <div className="hero-badge-row">
        <span className="pill">Free for buyers</span>
        <span className="pill">M-Pesa payments</span>
        <span className="pill">AI-priced packages</span>
        <span className="pill">Voucher marketplace</span>
      </div>

      <div className="section-label">How it works</div>
      <div className="steps-row">
        <div className="step-item">
          <div className="step-number">1</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Find Wi-Fi near you</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>Open the app, see hotspots ranked by real distance and a genuine reliability score, not who paid the most.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Buy a package with M-Pesa</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>Pick a pass, pay from your wallet, get an instant voucher code.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Connect and go</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>Your timer only runs while you're actually connected. Lose signal, and it pauses automatically until you're back.</div>
          </div>
        </div>
      </div>

      <div className="section-label">Built for how Kenya buys internet</div>

      <div className="feature-row">
        <div className="feature-icon icon-blue">{'\u{1F4CD}'}</div>
        <div>
          <div className="feature-title">Real Discovery, Not Ads</div>
          <div className="feature-desc">Nearby hotspots ranked by distance and a genuine health score built from real usage — sponsored listings get their own spotlight, never a boosted ranking.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-green">{'\u23F1\uFE0F'}</div>
        <div>
          <div className="feature-title">Fair, Adaptive Billing</div>
          <div className="feature-desc">Disconnect for any reason and your countdown pauses instantly, resuming the moment you're back online. You only ever pay for time actually connected.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-purple">{'\u{1F39F}\uFE0F'}</div>
        <div>
          <div className="feature-title">Buy, Gift, or Resell Vouchers</div>
          <div className="feature-desc">Every purchase gives you a voucher. Redeem it, gift it to a friend by phone number, or resell it on the marketplace if you don't need it.</div>
        </div>
      </div>

      <div className="feature-row" style={{ marginBottom: 24 }}>
        <div className="feature-icon icon-amber">{'\u{1F4E2}'}</div>
        <div>
          <div className="feature-title">Local Business Advertising</div>
          <div className="feature-desc">Businesses near a hotspot can run their own advert on GRIDNET AI, reviewed automatically for safety before it ever goes live.</div>
        </div>
      </div>

      <div className="provider-cta">
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Got Wi-Fi to spare?</div>
        <div className="text-dim" style={{ marginBottom: 14, fontSize: 13.5 }}>
          List your hotspot, set your own packages, and start earning — free to start, no approval process, AI helps you price your packages.
        </div>
        <Link to="/pricing" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          See Provider Plans
        </Link>
      </div>

      <Link to="/signup" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        Get Started
      </Link>
      <Link to="/login" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
        Log In
      </Link>

      <div className="text-dim" style={{ textAlign: 'center', marginTop: 22, fontSize: 12 }}>
        Buying is always free. Only providers pay, and only when they earn.
      </div>
    </div>
  )
}
