import React from 'react'
import { useNavigate } from 'react-router-dom'

const tiers = [
  {
    name: 'Free', price: 'KSh 0', useCase: 'Chatting & browsing',
    features: ['Up to 2 hotspot listings', 'Max package speed: 5 Mbps', 'Max package data: 1 GB', 'Basic weekly AI summary', '1 team member'],
    highlight: false,
  },
  {
    name: 'Pro', price: 'KSh 500/mo', useCase: 'Streaming',
    features: ['Up to 5 hotspot listings', 'Max package speed: 15 Mbps', 'Max package data: 10 GB', 'On-demand AI insights', 'Featured carousel slot', 'Verified badge'],
    highlight: false,
  },
  {
    name: 'Premium', price: 'KSh 1,200/mo', useCase: 'Everything',
    features: ['Unlimited hotspot listings', 'Max package speed: 50 Mbps', 'Unlimited data packages allowed', 'On-demand AI insights', 'Larger featured slot', 'Up to 3 team members'],
    highlight: true,
  },
  {
    name: 'Enterprise', price: 'KSh 3,500/mo', useCase: 'Everything, unlimited',
    features: ['Unlimited hotspot listings', 'No speed cap', 'No data cap', 'AI insights + revenue forecasts', 'Top featured slot', 'Unlimited team members', 'API access', 'Dedicated support'],
    highlight: false,
  },
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="title">Provider Pricing</div>
      <div className="subtitle">
        Buying internet is always free. These plans are only for providers who want to sell or advertise.
      </div>

      {tiers.map((tier) => (
        <div
          key={tier.name}
          className="card"
          style={tier.highlight ? { border: '1px solid var(--accent-blue)' } : {}}
        >
          <div className="row" style={{ marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{tier.name}</div>
            {tier.highlight && <span className="badge badge-featured">POPULAR</span>}
          </div>
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="text-dim">{tier.useCase}</span>
            <span style={{ fontWeight: 700 }}>{tier.price}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            {tier.features.map((f) => (
              <div key={f} className="text-dim" style={{ padding: '4px 0', fontSize: 13.5 }}>
                ✓ {f}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => navigate('/signup')}>
        Get Started
      </button>
    </div>
  )
}
