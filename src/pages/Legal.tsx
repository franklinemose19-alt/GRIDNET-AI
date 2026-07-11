import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Legal() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms')

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="title">Legal</div>
      <div className="subtitle">Terms of Service and Privacy Policy</div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button className={tab === 'terms' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('terms')}>
          Terms of Service
        </button>
        <button className={tab === 'privacy' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('privacy')}>
          Privacy Policy
        </button>
      </div>

      {tab === 'terms' && (
        <div className="card" style={{ lineHeight: 1.6, fontSize: 14 }}>
          <p className="text-dim" style={{ marginBottom: 16 }}>Last updated: {new Date().toLocaleDateString()}</p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>1. What GRIDNET AI Is</p>
          <p style={{ marginBottom: 16 }}>
            GRIDNET AI is a marketplace app that helps you discover Wi-Fi hotspots, buy internet
            access packages from independent providers, and buy or sell internet vouchers. GRIDNET
            AI does not own, operate, or guarantee the internet connection at any hotspot. Actual
            Wi-Fi access is provided directly by the hotspot owner, not by GRIDNET AI. Connecting
            to a hotspot's Wi-Fi network still requires you to manually join that network on your
            device, separately from this app.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>2. Accounts</p>
          <p style={{ marginBottom: 16 }}>
            You must provide accurate information when creating an account. You are responsible for
            keeping your login credentials secure and for all activity that happens under your
            account. You must be able to lawfully enter into agreements in Kenya to use GRIDNET AI.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>3. Wallet and Payments</p>
          <p style={{ marginBottom: 16 }}>
            GRIDNET AI holds a wallet balance on your behalf, funded via M-Pesa. This balance can be
            used to buy packages, vouchers, subscriptions, or advertising, and providers can
            withdraw their earnings to M-Pesa. GRIDNET AI is not a bank and your wallet balance does
            not earn interest. We take reasonable steps to keep transaction records accurate, but
            you should review your transaction history and report any discrepancy promptly.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>4. Vouchers</p>
          <p style={{ marginBottom: 16 }}>
            A voucher represents a specific internet package from a specific provider and hotspot.
            Vouchers expire after the period stated at time of purchase. Reselling or gifting a
            voucher transfers ownership of that voucher only — it does not change the underlying
            package, hotspot, or provider. GRIDNET AI takes a commission on voucher resale as
            disclosed in the app.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>5. Providers</p>
          <p style={{ marginBottom: 16 }}>
            Anyone may register as a provider and list a hotspot. GRIDNET AI does not inspect,
            certify, or guarantee the quality, legality, or reliability of any provider's internet
            connection or business. The "health score" shown for a hotspot is calculated from
            reported usage and ratings within the app, and is not a live measurement of internet
            speed or signal strength. Providers are solely responsible for the accuracy of their
            listings and for actually providing the internet access they advertise.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>6. Advertising</p>
          <p style={{ marginBottom: 16 }}>
            Adverts submitted by businesses are reviewed by an automated system before publication.
            GRIDNET AI reserves the right to reject, remove, or suspend any advert at any time,
            including after it has gone live, if it is found to violate these terms or applicable
            law. Purchasing an advertising package does not guarantee any particular level of
            engagement, visibility beyond what is described in the app, or business outcome.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>7. Prohibited Conduct</p>
          <p style={{ marginBottom: 16 }}>
            You may not use GRIDNET AI to commit fraud, launder money, advertise illegal goods or
            services, impersonate another person or business, manipulate ratings or health scores,
            or attempt to circumvent wallet, commission, or fee structures. GRIDNET AI may suspend
            or terminate accounts suspected of violating this section, with or without notice.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>8. No Guarantee of Connectivity</p>
          <p style={{ marginBottom: 16 }}>
            GRIDNET AI's adaptive billing pauses your session timer when your device loses internet
            connectivity, so you are not charged for that downtime. This is based on your device's
            general internet connectivity, not a direct measurement of the specific hotspot's Wi-Fi
            signal. GRIDNET AI does not guarantee uninterrupted, error-free, or minimum-speed access
            to any hotspot.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>9. Limitation of Liability</p>
          <p style={{ marginBottom: 16 }}>
            To the maximum extent permitted by law, GRIDNET AI is not liable for losses arising from
            a provider's failure to deliver internet access, disputes between users and providers,
            unauthorized account access resulting from your own failure to secure your credentials,
            or service interruptions. GRIDNET AI's total liability for any claim is limited to the
            amount held in your wallet at the time of the claim.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>10. Changes</p>
          <p style={{ marginBottom: 16 }}>
            These terms may be updated from time to time. Continued use of GRIDNET AI after a change
            takes effect means you accept the updated terms.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>11. Contact</p>
          <p>
            Questions about these terms can be sent through the contact details listed on the app's
            "Advertise Here" section or directly to the GRIDNET AI team.
          </p>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="card" style={{ lineHeight: 1.6, fontSize: 14 }}>
          <p className="text-dim" style={{ marginBottom: 16 }}>Last updated: {new Date().toLocaleDateString()}</p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>1. Information We Collect</p>
          <p style={{ marginBottom: 16 }}>
            When you use GRIDNET AI, we collect: your name, phone number, and email (provided at
            signup); your device's location, used only to show nearby hotspots and calculate
            distance — never stored as a location history or shared with third parties; transaction
            records including deposits, purchases, withdrawals, and voucher activity; and usage data
            such as session duration and connection events, used to calculate hotspot health scores.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>2. How We Use It</p>
          <p style={{ marginBottom: 16 }}>
            Your information is used to operate your account and wallet, process M-Pesa payments,
            show you relevant nearby hotspots, calculate fair adaptive billing, generate AI insights
            for providers based on their own sales data, and detect fraud or abuse of the platform.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>3. Payments</p>
          <p style={{ marginBottom: 16 }}>
            Payments are processed through Safaricom's M-Pesa Daraja API. GRIDNET AI does not store
            your M-Pesa PIN or full payment credentials. Transaction references and amounts are
            stored to maintain your wallet balance and transaction history.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>4. AI Processing</p>
          <p style={{ marginBottom: 16 }}>
            Some features — package pricing suggestions, business insights, and advertisement safety
            review — use third-party AI services to process the data you or your business submit
            (such as package details or advert images and descriptions). This data is sent only for
            the purpose of generating that specific feature's result and is not used to build a
            personal profile of you beyond what's described here.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>5. Who Can See Your Information</p>
          <p style={{ marginBottom: 16 }}>
            Your phone number can be looked up by other users only for the specific purposes of
            gifting a voucher to you or adding you to a provider's team — no other profile details
            are exposed through that lookup. Providers can see purchase and session information tied
            to their own hotspots. GRIDNET AI's admin team can access platform-wide data for fraud
            monitoring, support, and financial oversight.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>6. Data Storage</p>
          <p style={{ marginBottom: 16 }}>
            Your data is stored using Supabase, a third-party database and authentication provider,
            with access controls restricting who can read or modify different parts of your data.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>7. Your Choices</p>
          <p style={{ marginBottom: 16 }}>
            You can decline to share your device location, though this will limit hotspot discovery
            to no results. You can request account deletion by contacting GRIDNET AI directly.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>8. Changes</p>
          <p>
            This policy may be updated from time to time. Continued use of GRIDNET AI after a change
            takes effect means you accept the updated policy.
          </p>
        </div>
      )}
    </div>
  )
}
