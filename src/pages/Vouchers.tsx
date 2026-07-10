import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Voucher {
  id: string
  code: string
  status: string
  resale_price: number | null
  original_price: number
  expires_at: string
  current_owner_id: string
  package_id: string
  packages?: { name: string }
}

export default function Vouchers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myVouchers, setMyVouchers] = useState<Voucher[]>([])
  const [marketVouchers, setMarketVouchers] = useState<Voucher[]>([])
  const [tab, setTab] = useState<'mine' | 'market'>('mine')

  const [listingId, setListingId] = useState<string | null>(null)
  const [listPrice, setListPrice] = useState('')

  const [giftingId, setGiftingId] = useState<string | null>(null)
  const [giftPhone, setGiftPhone] = useState('')

  const [qrVoucher, setQrVoucher] = useState<Voucher | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    if (!user) return
    setLoading(true)

    const { data: mine } = await supabase
      .from('vouchers')
      .select('id, code, status, resale_price, original_price, expires_at, current_owner_id, package_id, packages(name)')
      .eq('current_owner_id', user.id)
      .order('created_at', { ascending: false })

    const { data: market } = await supabase
      .from('vouchers')
      .select('id, code, status, resale_price, original_price, expires_at, current_owner_id, package_id, packages(name)')
      .eq('status', 'listed')
      .neq('current_owner_id', user.id)
      .order('created_at', { ascending: false })

    if (mine) setMyVouchers(mine as any)
    if (market) setMarketVouchers(market as any)
    setLoading(false)
  }

  async function handleRedeem(voucherId: string) {
    if (!user) return
    setBusy(voucherId)
    setError('')
    try {
      const res = await fetch('/api/wallet-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem-voucher', userId: user.id, voucherId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else navigate(`/session/${data.sessionId}`)
    } catch {
      setError('Network error, try again.')
    }
    setBusy(null)
  }

  async function handleListForResale(voucherId: string) {
    const price = Number(listPrice)
    if (!price || price <= 0) return setError('Enter a valid resale price')
    setBusy(voucherId)
    setError('')

    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ status: 'listed', resale_price: price })
      .eq('id', voucherId)

    if (updateError) setError(updateError.message)
    else {
      setListingId(null)
      setListPrice('')
      await load()
    }
    setBusy(null)
  }

  async function handleUnlist(voucherId: string) {
    setBusy(voucherId)
    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ status: 'unused', resale_price: null })
      .eq('id', voucherId)
    if (updateError) setError(updateError.message)
    else await load()
    setBusy(null)
  }

  async function handleBuyResale(voucherId: string) {
    if (!user) return
    setBusy(voucherId)
    setError('')
    try {
      const res = await fetch('/api/wallet-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buy-voucher-resale', buyerId: user.id, voucherId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else await load()
    } catch {
      setError('Network error, try again.')
    }
    setBusy(null)
  }

  async function handleGift(voucherId: string) {
    if (!user || !giftPhone) return
    setBusy(voucherId)
    setError('')
    setSuccessMsg('')

    const normalizedPhone = giftPhone.startsWith('254') ? giftPhone : `254${giftPhone.replace(/^0/, '')}`

    const { data: recipientId, error: lookupError } = await supabase.rpc('find_profile_by_phone', {
      p_phone: normalizedPhone,
    })

    if (lookupError || !recipientId) {
      setError('No GRIDNET AI user found with that phone number.')
      setBusy(null)
      return
    }

    if (recipientId === user.id) {
      setError("You can't gift a voucher to yourself.")
      setBusy(null)
      return
    }

    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ current_owner_id: recipientId, status: 'unused', resale_price: null })
      .eq('id', voucherId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccessMsg('Voucher gifted successfully!')
      setGiftingId(null)
      setGiftPhone('')
      await load()
    }
    setBusy(null)
  }

  async function handleShowQr(voucher: Voucher) {
    setQrVoucher(voucher)
    const dataUrl = await QRCode.toDataURL(voucher.code, { width: 240, margin: 2 })
    setQrDataUrl(dataUrl)
  }

  function handlePrint() {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head><title>GRIDNET AI Voucher</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      unused: 'badge-health-good',
      listed: 'badge-featured',
      redeemed: 'badge-health-mid',
      expired: 'badge-health-low',
    }
    return map[status] || 'badge-health-mid'
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="title">Vouchers</div>
      <div className="subtitle">Redeem, sell, gift, or buy internet vouchers</div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button className={tab === 'mine' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('mine')}>
          My Vouchers
        </button>
        <button className={tab === 'market' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('market')}>
          Marketplace
        </button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}
      {successMsg && <div className="card" style={{ color: 'var(--accent-green)' }}>{successMsg}</div>}
      {loading && <div className="text-dim">Loading...</div>}

      {qrVoucher && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div ref={printRef}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>GRIDNET AI Voucher</div>
            {qrDataUrl && <img src={qrDataUrl} alt="Voucher QR code" style={{ margin: '0 auto' }} />}
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, margin: '10px 0' }}>{qrVoucher.code}</div>
            <div className="text-dim">Expires {new Date(qrVoucher.expires_at).toLocaleDateString()}</div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={handlePrint}>Print</button>
            <button className="btn btn-secondary" onClick={() => setQrVoucher(null)}>Close</button>
          </div>
        </div>
      )}

      {tab === 'mine' && !loading && (
        <>
          {myVouchers.length === 0 && <div className="card text-dim">No vouchers yet — buy a package to get one.</div>}
          {myVouchers.map((v) => (
            <div key={v.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>{v.code}</div>
                <span className={`badge ${statusBadge(v.status)}`}>{v.status.toUpperCase()}</span>
              </div>
              <div className="text-dim" style={{ marginBottom: 10 }}>
                {(v.packages as any)?.name || 'Package'} · KSh {v.original_price}
                {v.status === 'listed' && ` · listed at KSh ${v.resale_price}`}
              </div>
              <div className="text-dim" style={{ marginBottom: 10 }}>
                Expires {new Date(v.expires_at).toLocaleDateString()}
              </div>

              {v.status === 'unused' && listingId !== v.id && giftingId !== v.id && (
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" disabled={busy === v.id} onClick={() => handleRedeem(v.id)}>
                    {busy === v.id ? 'Starting...' : 'Redeem Now'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setListingId(v.id)}>Sell</button>
                  <button className="btn btn-secondary" onClick={() => setGiftingId(v.id)}>Gift</button>
                  <button className="btn btn-secondary" onClick={() => handleShowQr(v)}>QR / Print</button>
                </div>
              )}

              {v.status === 'unused' && listingId === v.id && (
                <div>
                  <input
                    type="number"
                    placeholder={`Resale price (bought at ${v.original_price})`}
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-primary" disabled={busy === v.id} onClick={() => handleListForResale(v.id)}>
                      Confirm Listing
                    </button>
                    <button className="btn btn-secondary" onClick={() => setListingId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {v.status === 'unused' && giftingId === v.id && (
                <div>
                  <input
                    placeholder="Recipient's phone (e.g. 0712345678)"
                    value={giftPhone}
                    onChange={(e) => setGiftPhone(e.target.value)}
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-primary" disabled={busy === v.id} onClick={() => handleGift(v.id)}>
                      {busy === v.id ? 'Gifting...' : 'Confirm Gift'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setGiftingId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {v.status === 'listed' && (
                <button className="btn btn-secondary" disabled={busy === v.id} onClick={() => handleUnlist(v.id)}>
                  Unlist
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'market' && !loading && (
        <>
          {marketVouchers.length === 0 && <div className="card text-dim">No vouchers listed for resale right now.</div>}
          {marketVouchers.map((v) => (
            <div key={v.id} className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>{v.code}</div>
                <div style={{ fontWeight: 700 }}>KSh {v.resale_price}</div>
              </div>
              <div className="text-dim" style={{ marginBottom: 10 }}>
                {(v.packages as any)?.name || 'Package'} · originally KSh {v.original_price}
              </div>
              <button className="btn btn-primary" disabled={busy === v.id} onClick={() => handleBuyResale(v.id)}>
                {busy === v.id ? 'Buying...' : 'Buy Voucher'}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
