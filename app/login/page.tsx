'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  avatar_color: string
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [fetchError, setFetchError] = useState('')
  const [fetchDone, setFetchDone] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/users/public')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setUsers(Array.isArray(data) ? data : [])
        setFetchDone(true)
      })
      .catch(e => {
        setFetchError(e.message)
        setFetchDone(true)
      })
  }, [])

  function addDigit(digit: string) {
    if (loading) return
    setPin(prev => prev.length < 6 ? prev + digit : prev)
  }

  function deleteDigit() {
    if (loading) return
    setPin(prev => prev.slice(0, -1))
  }

  async function submit() {
    if (!selected || pin.length < 4 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, pin }),
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Nepareizs PIN')
        setPin('')
      }
    } catch (e) {
      setError('Tīkla kļūda')
    } finally {
      setLoading(false)
    }
  }

  function selectUser(user: User) {
    setSelected(user)
    setPin('')
    setError('')
  }

  function back() {
    setSelected(null)
    setPin('')
    setError('')
  }

  const s = {
    page: {
      minHeight: '100vh',
      background: 'var(--paper)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '2rem',
      fontFamily: 'var(--font-body)',
    },
    card: {
      background: 'white',
      borderRadius: '1.5rem',
      padding: '2rem',
      width: '100%',
      maxWidth: '320px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '1.5rem',
    },
    numBtn: (digit: string) => ({
      padding: '1rem',
      fontSize: '1.25rem',
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      background: digit === '' ? 'transparent' : 'var(--cream)',
      border: 'none',
      borderRadius: '0.75rem',
      cursor: digit === '' ? 'default' as const : 'pointer' as const,
      color: 'var(--ink)',
      opacity: digit === '' ? 0 : loading ? 0.5 : 1,
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation' as const,
      userSelect: 'none' as const,
    }),
    submitBtn: {
      width: '100%',
      padding: '0.9rem',
      background: pin.length >= 4 && !loading ? 'var(--accent)' : 'var(--cream)',
      color: pin.length >= 4 && !loading ? 'white' : 'var(--muted)',
      border: 'none',
      borderRadius: '0.75rem',
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: '1rem',
      cursor: pin.length >= 4 && !loading ? 'pointer' as const : 'default' as const,
    },
  }

  return (
    <div style={s.page}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 8vw, 3rem)',
          fontWeight: 700,
          color: 'var(--ink)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>ChoreBoard</h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
          {selected ? `Hi ${selected.name} — enter your PIN` : 'Kas tu esi?'}
        </p>
      </div>

      {/* Loading / error state for user fetch */}
      {!fetchDone && !selected && (
        <p style={{ color: 'var(--muted)' }}>Ielādē...</p>
      )}

      {fetchError && (
        <p style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
          Could not load users: {fetchError}. Is the server running?
        </p>
      )}

      {fetchDone && !fetchError && users.length === 0 && !selected && (
        <p style={{ color: 'var(--accent)', fontSize: '0.875rem', textAlign: 'center', maxWidth: 300 }}>
          No users found. Run <code>node scripts/seed-admin.js</code> to create your first user.
        </p>
      )}

      {/* User cards */}
      {!selected && users.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          width: '100%',
          maxWidth: '480px',
        }}>
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              style={{
                background: 'white',
                border: `3px solid ${user.avatar_color}`,
                borderRadius: '1.25rem',
                padding: '1.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: user.avatar_color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', color: 'white',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                pointerEvents: 'none',
              }}>
                {user.name[0].toUpperCase()}
              </div>
              <span style={{
                fontFamily: 'var(--font-body)', fontWeight: 600,
                color: 'var(--ink)', fontSize: '1rem',
                pointerEvents: 'none',
              }}>{user.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* PIN entry */}
      {selected && (
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: selected.avatar_color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontFamily: 'var(--font-display)',
            }}>
              {selected.name[0].toUpperCase()}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{selected.name}</span>
          </div>

          {/* PIN dots */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: i < pin.length ? 'var(--accent)' : 'var(--cream)',
                border: '2px solid',
                borderColor: i < pin.length ? 'var(--accent)' : 'var(--muted)',
                transition: 'all 0.15s ease',
              }} />
            ))}
          </div>

          {error && (
            <p style={{ color: 'var(--accent)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
          )}

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', width: '100%' }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((digit, i) => (
              <button
                key={i}
                disabled={loading || digit === ''}
                onPointerDown={e => {
                  e.preventDefault()
                  if (digit === '⌫') deleteDigit()
                  else if (digit) addDigit(digit)
                }}
                style={s.numBtn(digit)}
              >
                {digit}
              </button>
            ))}
          </div>

          <button
            onPointerDown={e => { e.preventDefault(); submit() }}
            disabled={pin.length < 4 || loading}
            style={s.submitBtn}
          >
            {loading ? 'Pārbauda...' : 'Ieiet →'}
          </button>

          <button
            onClick={back}
            style={{
              background: 'none', border: 'none',
              color: 'var(--muted)', cursor: 'pointer',
              fontSize: '0.875rem', fontFamily: 'var(--font-body)',
            }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
