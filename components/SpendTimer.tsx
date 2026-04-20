'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Square, AlertTriangle } from 'lucide-react'
import { formatMinutes } from '@/lib/utils'
import type { Reward } from '@/lib/types'

interface Props {
  availableMinutes: number
  rewards: Reward[]
  userId: string
}

interface ActiveSession {
  id: string
  started_at: string
  stopped_at: string | null
  reward_id: string | null
  rewards?: { id: string; name: string } | null
}

function formatCountdown(seconds: number) {
  if (seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SpendTimer({ availableMinutes, rewards, userId }: Props) {
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [elapsed, setElapsed] = useState(0) // seconds elapsed since start
  const [loading, setLoading] = useState(true)
  const [selectedReward, setSelectedReward] = useState<string>('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const totalSeconds = availableMinutes * 60
  const remaining = Math.max(0, totalSeconds - elapsed)
  const isOvertime = elapsed > totalSeconds && totalSeconds > 0
  const pct = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0

  // Load active session on mount
  useEffect(() => {
    fetch('/api/spend-sessions')
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setSession(data)
          const secs = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)
          setElapsed(secs)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Tick while session active
  useEffect(() => {
    if (session && !session.stopped_at) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const secs = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
          return secs
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [session])

  async function startSession() {
    if (availableMinutes <= 0) return
    setLoading(true)
    const res = await fetch('/api/spend-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId: selectedReward || null }),
    })
    if (res.ok) {
      const data = await res.json()
      setSession(data)
      setElapsed(0)
    }
    setLoading(false)
  }

  async function stopSession() {
    if (!session) return
    setLoading(true)
    const minutesUsed = Math.min(availableMinutes, Math.ceil(elapsed / 60))
    const res = await fetch('/api/spend-sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, minutesUsed }),
    })
    if (res.ok) {
      setSession(null)
      setElapsed(0)
      // Refresh page to update balance
      window.location.reload()
    }
    setLoading(false)
  }

  if (loading) return null
  if (availableMinutes <= 0 && !session) return null

  const alarm = isOvertime

  return (
    <div style={{
      background: alarm ? 'var(--accent)' : 'white',
      borderRadius: '1rem',
      padding: '1.25rem',
      marginBottom: '1rem',
      boxShadow: alarm ? '0 0 0 3px var(--accent), 0 4px 16px rgba(232,93,38,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',
      animation: alarm ? 'pulse 1s ease-in-out infinite' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: session ? '1rem' : '0.75rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: alarm ? 'rgba(255,255,255,0.8)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {session ? (alarm ? '⚠️ Laiks beidzies!' : 'Aktīvs') : 'Izmantot laiku'}
          </p>
          {session ? (
            <p style={{ margin: '0.2rem 0 0', fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: alarm ? 'white' : remaining < 60 ? 'var(--accent)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {formatCountdown(remaining)}
            </p>
          ) : (
            <p style={{ margin: '0.2rem 0 0', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--sage)' }}>
              {formatMinutes(availableMinutes)} pieejams
            </p>
          )}
          {session?.rewards?.name && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: alarm ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>
              🎮 {session.rewards.name}
            </p>
          )}
        </div>

        {session ? (
          <button
            onClick={stopSession}
            disabled={loading}
            style={{ width: 48, height: 48, borderRadius: '50%', background: alarm ? 'white' : 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: alarm ? 'var(--accent)' : 'white', flexShrink: 0 }}
          >
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={loading || availableMinutes <= 0}
            style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--sage)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}
          >
            <Play size={20} fill="white" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {session && totalSeconds > 0 && (
        <div style={{ height: 6, background: alarm ? 'rgba(255,255,255,0.3)' : 'var(--cream)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: alarm ? 'white' : remaining < 120 ? 'var(--accent)' : 'var(--sage)',
            borderRadius: 3, transition: 'width 1s linear, background 0.5s ease',
          }} />
        </div>
      )}

      {/* Reward selector (before starting) */}
      {!session && rewards.length > 0 && (
        <select
          value={selectedReward}
          onChange={e => setSelectedReward(e.target.value)}
          style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem 0.75rem', border: '2px solid var(--cream)', borderRadius: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', background: 'var(--paper)', color: 'var(--ink)' }}
        >
          <option value="">Brīvā izvēle</option>
          {rewards.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
      `}</style>
    </div>
  )
}
