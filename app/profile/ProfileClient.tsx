'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import type { SessionUser } from '@/lib/types'

interface Props { session: SessionUser }

export default function ProfileClient({ session }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function changePin() {
    if (!current || !next || !confirm) return
    if (next !== confirm) { setStatus('error'); setMessage("New PINs don't match"); return }
    if (next.length < 4) { setStatus('error'); setMessage('PIN must be at least 4 digits'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_pin: current, new_pin: next }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        setMessage('PIN changed successfully')
        setCurrent(''); setNext(''); setConfirm('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.85rem',
    border: '2px solid var(--cream)', borderRadius: '0.6rem',
    fontFamily: 'var(--font-body)', fontSize: '1rem',
    background: 'white', color: 'var(--ink)', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <NavBar session={session} />

      <div style={{ maxWidth: 400, margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: '0 0 1.25rem' }}>Change PIN</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              style={inputStyle} type="password" placeholder="Current PIN"
              value={current} onChange={e => setCurrent(e.target.value)}
            />
            <input
              style={inputStyle} type="password" placeholder="New PIN (4+ digits)"
              value={next} onChange={e => setNext(e.target.value)}
            />
            <input
              style={inputStyle} type="password" placeholder="Confirm new PIN"
              value={confirm} onChange={e => setConfirm(e.target.value)}
            />

            {status !== 'idle' && (
              <p style={{ margin: 0, fontSize: '0.875rem', color: status === 'ok' ? 'var(--sage)' : 'var(--accent)', fontWeight: 500 }}>
                {message}
              </p>
            )}

            <button
              onClick={changePin}
              disabled={loading || !current || !next || !confirm}
              style={{
                padding: '0.8rem', background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving...' : 'Change PIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
