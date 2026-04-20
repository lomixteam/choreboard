'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { formatMinutes } from '@/lib/utils'
import type { SessionUser } from '@/lib/types'

interface Completion {
  user_id: string
  completed_at: string
  actual_duration: number | null
  tasks: { name: string; time_value: number } | null
  users: { id: string; name: string; avatar_color: string } | null
}

interface User {
  id: string
  name: string
  avatar_color: string
}

interface Props {
  completions: Completion[]
  users: User[]
  session: SessionUser
}

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function formatWeekLabel(weekKey: string) {
  const d = new Date(weekKey)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function HistoryClient({ completions, users, session }: Props) {
  const router = useRouter()
  const [range, setRange] = useState<'nedēļa' | 'mēnesis'>('mēnesis')
  const [selectedUser, setSelectedUser] = useState<string>('all')

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - (range === 'nedēļa' ? 7 : 28))
    d.setHours(0, 0, 0, 0)
    return d
  }, [range])

  const filtered = useMemo(() =>
    completions.filter(c => {
      const d = new Date(c.completed_at)
      if (d < cutoff) return false
      if (selectedUser !== 'all' && c.user_id !== selectedUser) return false
      return true
    }), [completions, cutoff, selectedUser])

  // Weekly totals per user per week
  const weeklyData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {} // weekKey → userId → minutes
    for (const c of filtered) {
      const wk = getWeekKey(c.completed_at)
      if (!map[wk]) map[wk] = {}
      const uid = c.user_id
      map[wk][uid] = (map[wk][uid] || 0) + (c.tasks?.time_value || 0)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Task breakdown
  const taskBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of filtered) {
      const name = c.tasks?.name || 'Unknown'
      map[name] = (map[name] || 0) + (c.tasks?.time_value || 0)
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [filtered])

  const totalMinutes = filtered.reduce((s, c) => s + (c.tasks?.time_value || 0), 0)
  const maxWeekMinutes = Math.max(1, ...weeklyData.map(([, u]) => Object.values(u).reduce((s, v) => s + v, 0)))
  const maxTaskMinutes = taskBreakdown[0]?.[1] || 1

  const displayUsers = selectedUser === 'all' ? users : users.filter(u => u.id === selectedUser)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)', paddingBottom: '3rem' }}>
      <NavBar session={session} />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.25rem' }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: '0.6rem', padding: '0.25rem' }}>
            {(['nedēļa', 'mēnesis'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '0.4rem 0.9rem', border: 'none', borderRadius: '0.4rem',
                background: range === r ? 'white' : 'transparent',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem',
                color: range === r ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer',
                boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                textTransform: 'capitalize',
              }}>{r}</button>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: '0.6rem', padding: '0.25rem', flexWrap: 'wrap', gap: '0.15rem' }}>
            <button onClick={() => setSelectedUser('all')} style={{
              padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem',
              background: selectedUser === 'all' ? 'white' : 'transparent',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem',
              color: selectedUser === 'all' ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer',
            }}>Visi</button>
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u.id)} style={{
                padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem',
                background: selectedUser === u.id ? u.avatar_color : 'transparent',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem',
                color: selectedUser === u.id ? 'white' : 'var(--muted)', cursor: 'pointer',
              }}>{u.name}</button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--ink)', borderRadius: '1rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kopējais laiks</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gold)' }}>
              {formatMinutes(totalMinutes)}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Izpildīti uzdevumi</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)' }}>
              {filtered.length}
            </p>
          </div>
        </div>

        {/* Weekly bar chart */}
        {weeklyData.length > 0 && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 1.25rem', fontSize: '1rem' }}>Nedēļas kopsavilkums</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', minHeight: 120 }}>
              {weeklyData.map(([weekKey, userMinutes]) => {
                const weekTotal = Object.values(userMinutes).reduce((s, v) => s + v, 0)
                const barHeight = Math.max(4, (weekTotal / maxWeekMinutes) * 100)
                return (
                  <div key={weekKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMinutes(weekTotal)}
                    </span>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, borderRadius: '0.4rem', overflow: 'hidden' }}>
                      {displayUsers.map(u => {
                        const mins = userMinutes[u.id] || 0
                        const h = Math.max(0, (mins / maxWeekMinutes) * 100)
                        return h > 0 ? (
                          <div key={u.id} title={`${u.name}: ${formatMinutes(mins)}`} style={{
                            width: '100%', height: h,
                            background: u.avatar_color,
                            borderRadius: '0.25rem',
                          }} />
                        ) : null
                      })}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{formatWeekLabel(weekKey)}</span>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            {displayUsers.length > 1 && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {displayUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: u.avatar_color }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{u.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task breakdown */}
        {taskBreakdown.length > 0 && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 1rem', fontSize: '1rem' }}>Pa uzdevumiem</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {taskBreakdown.map(([name, mins]) => (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{formatMinutes(mins)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--cream)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(mins / maxTaskMinutes) * 100}%`,
                      background: 'var(--sage)', borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📊</p>
            <p style={{ margin: 0 }}>Šajā periodā vēl nav apstiprinātu izpilžu.</p>
          </div>
        )}
      </div>
    </div>
  )
}
