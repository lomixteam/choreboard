'use client'

import { useRouter, usePathname } from 'next/navigation'
import { BarChart2, Settings, User as UserIcon, LogOut, Flame } from 'lucide-react'
import type { SessionUser } from '@/lib/types'

interface Props {
  session: SessionUser
  streak?: number
}

export default function NavBar({ session, streak = 0 }: Props) {
  const router = useRouter()
  const path = usePathname()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const navBtn = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,255,255,0.15)' : 'none',
    border: 'none', cursor: 'pointer',
    color: active ? 'white' : 'var(--muted)',
    padding: '0.4rem', borderRadius: '0.4rem',
    display: 'flex', alignItems: 'center',
  })

  return (
    <header style={{
      background: 'var(--ink)', padding: '0.85rem 1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <button
        onClick={() => router.push('/dashboard')}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <h1 style={{
          fontFamily: 'var(--font-display)', color: 'var(--paper)',
          fontSize: '1.3rem', margin: 0, letterSpacing: '-0.02em',
        }}>ChoreBoard</h1>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.9rem', marginRight: '0.25rem' }}>
          {session.name}
        </span>

        {streak >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(232,93,38,0.2)', borderRadius: '1rem', padding: '0.2rem 0.5rem' }}>
            <Flame size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>{streak}</span>
          </div>
        )}

        <button onClick={() => router.push('/history')} style={navBtn(path === '/history')} title="History">
          <BarChart2 size={18} />
        </button>
        <button onClick={() => router.push('/profile')} style={navBtn(path === '/profile')} title="Profile & PIN">
          <UserIcon size={18} />
        </button>
        {session.role === 'admin' && (
          <button onClick={() => router.push('/admin')} style={navBtn(path === '/admin')} title="Admin">
            <Settings size={18} />
          </button>
        )}
        <button onClick={logout} style={navBtn(false)} title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
