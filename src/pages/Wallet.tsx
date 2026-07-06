import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface WalletRow {
  id: string
  balance: number
}

interface TxnRow {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
}

export default function Wallet() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<WalletRow | null>(null)
  const [transactions, setTransactions] = useState<TxnRow[]>([])
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWallet()
  }, [])

  async function loadWallet() {
    if (!user) return
    setLoading(true)

    const { data: walletData } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (walletData) {
      setWallet(walletData as WalletRow)

      const { data: txnData } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, status, created_at')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (txnData) setTransactions(txnData as TxnRow[])
    }
    setLoading(false)
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault()
    if (!wallet) return
    setDepositing(true)
    setStatusMsg('')

    try {
      const res = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: wallet.id,
          amount: Number(amount),
          phone: phone.startsWith('254') ? phone : `254${phone.replace(/^0/, '')}`,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatusMsg(data.error || 'Failed to initiate payment. Try again.')
      } else {
        setStatusMsg('Check your phone and enter your M-Pesa PIN. This page will update once payment completes.')
        setAmount('')
        // poll for wallet update since STK confirmation comes via async callback
        pollForUpdate()
      }
    } catch {
      setStatusMsg('Network error. Try again.')
    }
    setDepositing(false)
  }

  function pollForUpdate() {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      await loadWallet()
      if (attempts >= 15) clearInterval(interval) // stop after ~45s
    }, 3000)
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 10, marginBottom: 16 }} onClick={() => navigate('/discover')}>
        ← Back
      </button>

      <div className="title">Wallet</div>
      <div className="subtitle">Deposit and manage your balance</div>

      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div className="text-dim">Balance</div>
        <div style={{ fontSize: 36, fontWeight: 700, margin: '4px 0' }}>
          {loading ? '...' : `KSh ${wallet?.balance.toFixed(2) ?? '0.00'}`}
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Deposit via M-Pesa</div>
        <form onSubmit={handleDeposit}>
          <input
            type="number"
            placeholder="Amount (KSh)"
            value={amount}
            min={10}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <input
            placeholder="M-Pesa phone (e.g. 0712345678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={depositing}>
            {depositing ? 'Sending request...' : 'Deposit'}
          </button>
        </form>
        {statusMsg && <div className="text-dim" style={{ marginTop: 10 }}>{statusMsg}</div>}
      </div>

      <div style={{ fontWeight: 600, margin: '20px 0 10px' }}>Recent Transactions</div>
      {transactions.length === 0 && !loading && <div className="text-dim">No transactions yet.</div>}
      {transactions.map((t) => (
        <div key={t.id} className="card row">
          <div>
            <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>{t.type}</div>
            <div className="text-dim">{new Date(t.created_at).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>KSh {t.amount.toFixed(2)}</div>
            <div className={`text-dim ${t.status === 'completed' ? '' : ''}`}>{t.status}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
