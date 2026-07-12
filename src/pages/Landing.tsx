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
        <div className="text-dim" style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
          The Shopify for Internet
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>
          Turn Your Wi-Fi Into a Business.
        </div>
        <div className="hero-tagline">
          Build your own internet store in minutes. Create packages, accept M-Pesa payments, manage customers, and let AI help you grow — all from one platform.
        </div>
      </div>

      <Link to="/signup" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        Create Your Internet Store
      </Link>
      <Link to="/signup" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
        Find Internet Near Me
      </Link>

      <div className="checklist-row">
        <div className="checklist-item"><span className="check">{'\u2714'}</span> Free to start</div>
        <div className="checklist-item"><span className="check">{'\u2714'}</span> M-Pesa powered</div>
        <div className="checklist-item"><span className="check">{'\u2714'}</span> AI Business Assistant</div>
        <div className="checklist-item"><span className="check">{'\u2714'}</span> Built for Kenya</div>
      </div>

      <div className="section-label">Two Ways to Use GRIDNET AI</div>

      <div className="two-way-card users">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{'\u{1F464}'} For Users</div>
        <ul className="bullet-list">
          <li>Discover nearby internet stores.</li>
          <li>Compare prices and reliability.</li>
          <li>Buy packages instantly with M-Pesa.</li>
          <li>Receive secure digital vouchers.</li>
          <li>Pay only for connected time.</li>
          <li>Gift or resell eligible vouchers.</li>
        </ul>
        <Link to="/signup" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          Get Started
        </Link>
      </div>

      <div className="two-way-card providers">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{'\u{1F3EA}'} For Providers</div>
        <div className="text-dim" style={{ marginBottom: 10, fontSize: 13 }}>
          Already paying for internet? Turn it into a new source of income.
        </div>
        <ul className="bullet-list">
          <li>Build your own internet store.</li>
          <li>Create internet packages.</li>
          <li>Sell Wi-Fi access.</li>
          <li>Accept M-Pesa payments.</li>
          <li>Generate vouchers.</li>
          <li>Track earnings.</li>
          <li>Manage customers.</li>
          <li>Grow with AI insights.</li>
        </ul>
        <Link to="/signup" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          Start Selling
        </Link>
      </div>

      <div className="section-label" style={{ marginTop: 10 }}>How It Works</div>
      <div className="text-dim" style={{ marginBottom: 14, fontSize: 13 }}>For Customers</div>
      <div className="steps-row">
        <div className="step-item">
          <div className="step-number">1</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Find Internet</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>Browse nearby internet stores ranked by distance and reliability — not by who paid the most.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Buy a Package</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>Pay with M-Pesa and receive your voucher instantly.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Connect</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>Start browsing immediately.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">4</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Fair Billing</div>
            <div className="text-dim" style={{ fontSize: 13.5 }}>If your connection is interrupted, your session pauses until you're connected again, so you aren't billed for disconnected time.</div>
          </div>
        </div>
      </div>

      <div className="section-label">Why Choose GRIDNET AI?</div>

      <div className="feature-row">
        <div className="feature-icon icon-blue">{'\u{1F4CD}'}</div>
        <div>
          <div className="feature-title">Smart Discovery</div>
          <div className="feature-desc">Find nearby internet stores using location, ratings, and reliability. Sponsored providers appear in dedicated promotional sections and do not change the main search ranking.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-purple">{'\u{1F916}'}</div>
        <div>
          <div className="feature-title">AI Business Assistant</div>
          <div className="feature-desc">AI helps providers recommend package prices, analyze sales, detect fraud, suggest promotions, generate business reports, and improve customer retention.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-green">{'\u{1F39F}\uFE0F'}</div>
        <div>
          <div className="feature-title">Digital Voucher Marketplace</div>
          <div className="feature-desc">Every package can generate a secure voucher. Redeem, gift, store, resell eligible vouchers, or scan QR vouchers.</div>
        </div>
      </div>

      <div className="feature-row">
        <div className="feature-icon icon-amber">{'\u{1F4B3}'}</div>
        <div>
          <div className="feature-title">M-Pesa Payments</div>
          <div className="feature-desc">Fast and secure wallet payments — deposit money, buy internet, receive provider payouts, and track every transaction.</div>
        </div>
      </div>

      <div className="feature-row" style={{ marginBottom: 24 }}>
        <div className="feature-icon icon-red">{'\u{1F4E2}'}</div>
        <div>
          <div className="feature-title">Local Advertising</div>
          <div className="feature-desc">Businesses can promote themselves through banner placements within GRIDNET AI. Advertisements are reviewed before publication to help maintain quality.</div>
        </div>
      </div>

      <div className="section-label">Everything You Need to Run an Internet Business</div>
      <div className="card">
        <ul className="bullet-list">
          <li>Internet Store Builder</li>
          <li>Package Creator</li>
          <li>Voucher Generator</li>
          <li>Customer Management</li>
          <li>Wallet</li>
          <li>Earnings Dashboard</li>
          <li>AI Analytics</li>
          <li>Business Reports</li>
          <li>Team Management (eligible plans)</li>
          <li>Subscription Management</li>
        </ul>
        <div className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          No coding. No custom website. No billing software.<br />
          Just build your store and start selling.
        </div>
      </div>

      <div className="section-label">Built for Kenya</div>
      <div className="text-dim" style={{ marginBottom: 12, fontSize: 13 }}>Designed around how Kenya connects.</div>
      <div className="hero-badge-row" style={{ justifyContent: 'flex-start', marginBottom: 26 }}>
        <span className="pill">M-Pesa payments</span>
        <span className="pill">Local businesses</span>
        <span className="pill">Schools</span>
        <span className="pill">Universities</span>
        <span className="pill">Apartments</span>
        <span className="pill">Hotels</span>
        <span className="pill">Cafés</span>
        <span className="pill">Offices</span>
        <span className="pill">Community hotspots</span>
      </div>

      <div className="provider-cta">
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Provider Plans</div>
        <div className="text-dim" style={{ marginBottom: 14, fontSize: 13.5 }}>
          Choose the plan that matches your business — Free, Pro, Premium, or Enterprise. Upgrade anytime as your business grows.
        </div>
        <Link to="/pricing" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          See Plans
        </Link>
      </div>

      <div style={{ textAlign: 'center', margin: '30px 0 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ready to Start?</div>
        <div className="text-dim" style={{ fontSize: 13.5, marginBottom: 20 }}>
          Whether you're looking for internet or looking to earn from it, GRIDNET AI brings both together.
        </div>
      </div>

      <Link to="/signup" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        Create Your Internet Store
      </Link>
      <Link to="/signup" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
        Find Internet Near Me
      </Link>

      <div className="text-dim" style={{ textAlign: 'center', marginTop: 22, fontSize: 12 }}>
        Buying is always free. Only providers pay platform fees, and only when they earn or choose premium business features.
      </div>
    </div>
  )
}
