'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, CheckCircle, Trophy, BookOpen, ChevronDown, ChevronUp, Undo2, Timer, Hourglass, Flame } from 'lucide-react'
import { formatMinutes } from '@/lib/utils'
import type { Task, User, Reward, SessionUser } from '@/lib/types'
import NavBar from '@/components/NavBar'
import SpendTimer from '@/components/SpendTimer'

interface Props {
  session: SessionUser
  tasks: Task[]
  users: User[]
  rewards: Reward[]
  weeklyTotals: Record<string, number>
  streaks: Record<string, number>
  pendingClaimRewardIds: string[]
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function DashboardClient({ session, tasks, users, rewards, weeklyTotals, streaks, pendingClaimRewardIds }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [justDone, setJustDone] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ msg: string; type?: 'ok' | 'warn' } | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [claimedIds, setClaimedIds] = useState<string[]>(pendingClaimRewardIds)

  // Timer state
  const [activeTimer, setActiveTimer] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState<Record<string, number>>({})
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Confirm repeat dialog
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)

  const myMinutes = weeklyTotals[session.userId] || 0
  const myStreak = streaks[session.userId] || 0
  const maxReward = rewards.filter(r => r.threshold_minutes <= myMinutes).at(-1)
  const nextReward = rewards.find(r => r.threshold_minutes > myMinutes)
  const progressPct = nextReward ? Math.min(100, (myMinutes / nextReward.threshold_minutes) * 100) : 100

  // Group tasks by category
  const grouped = tasks.reduce((acc, task) => {
    const cat = task.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  useEffect(() => {
    if (timerRunning && activeTimer) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(prev => ({ ...prev, [activeTimer]: (prev[activeTimer] || 0) + 1 }))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning, activeTimer])

  function showToast(msg: string, type: 'ok' | 'warn' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function startTimer(taskId: string) {
    if (activeTimer && activeTimer !== taskId) setTimerRunning(false)
    setActiveTimer(taskId)
    setTimerRunning(true)
  }

  function stopTimer(taskId: string) { setTimerRunning(false) }

  function resetTimer(taskId: string) {
    setTimerRunning(false)
    setTimerSeconds(prev => ({ ...prev, [taskId]: 0 }))
    if (activeTimer === taskId) setActiveTimer(null)
  }

  async function markDone(task: Task, force = false, useTimer = false) {
    const actual_duration = useTimer && activeTimer === task.id && timerSeconds[task.id]
      ? timerSeconds[task.id] : undefined
    const note = noteInputs[task.id] || undefined

    const res = await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, actual_duration, force, note }),
    })

    if (res.status === 409) { setConfirmTask(task); return }

    if (res.ok) {
      const data = await res.json()
      setJustDone(prev => ({ ...prev, [task.id]: data.id }))
      setNoteInputs(prev => { const n = { ...prev }; delete n[task.id]; return n })
      if (useTimer && activeTimer === task.id) {
        setTimerRunning(false); setActiveTimer(null)
        setTimerSeconds(prev => ({ ...prev, [task.id]: 0 }))
      }
      showToast('✓ Logged — pending approval')
      startTransition(() => router.refresh())
    }
  }

  async function confirmRepeat() {
    if (!confirmTask) return
    setConfirmTask(null)
    await markDone(confirmTask, true)
  }

  async function undoCompletion(taskId: string) {
    const completionId = justDone[taskId]
    if (!completionId) return
    const res = await fetch(`/api/completions?id=${completionId}`, { method: 'DELETE' })
    if (res.ok) {
      setJustDone(prev => { const n = { ...prev }; delete n[taskId]; return n })
      showToast('Atcelts')
      startTransition(() => router.refresh())
    } else {
      const d = await res.json()
      showToast(d.error || 'Nevar atcelt', 'warn')
    }
  }

  async function claimReward(rewardId: string) {
    if (claimedIds.includes(rewardId)) return
    const res = await fetch('/api/reward-claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId }),
    })
    if (res.ok) {
      setClaimedIds(prev => [...prev, rewardId])
      showToast('🎉 Reward claimed — waiting for approval!')
    } else {
      const d = await res.json()
      showToast(d.error === 'already_pending' ? 'Jau pieprasīts, gaida apstiprinājumu' : 'Nevarēja pieprasīt', 'warn')
    }
  }

  const taskSec = (id: string) => timerSeconds[id] || 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'warn' ? 'var(--accent)' : 'var(--ink)',
          color: 'white', padding: '0.6rem 1.25rem', borderRadius: '2rem',
          fontSize: '0.9rem', fontWeight: 500, zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* Confirm repeat */}
      {confirmTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>⚠️</p>
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 0.5rem' }}>Šodien jau izpildīts</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              You've already logged <strong>{confirmTask.name}</strong> today. Log it again anyway?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmTask(null)} style={{ flex: 1, padding: '0.75rem', background: 'var(--cream)', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Atcelt</button>
              <button onClick={confirmRepeat} style={{ flex: 1, padding: '0.75rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Atzīmēt vēlreiz</button>
            </div>
          </div>
        </div>
      )}

      <NavBar session={session} streak={myStreak} />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.25rem' }}>

        {/* Weekly progress card */}
        <div style={{ background: 'var(--ink)', borderRadius: '1.5rem', padding: '1.5rem', marginBottom: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Šī nedēļa (apstiprināts)</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
                {formatMinutes(myMinutes)}
              </p>
              {myStreak >= 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem' }}>
                  <Flame size={14} color="var(--accent)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>{myStreak} dienu sērija!</span>
                </div>
              )}
            </div>
            {maxReward && (
              <div style={{ background: 'rgba(242,169,59,0.15)', border: '1px solid var(--gold)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trophy size={14} color="var(--gold)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600 }}>{maxReward.name}</span>
              </div>
            )}
          </div>
          {nextReward && (
            <div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--sage), var(--gold))', borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                {formatMinutes(nextReward.threshold_minutes - myMinutes)} more for <strong style={{ color: 'white' }}>{nextReward.name}</strong>
              </p>
            </div>
          )}
          {users.length > 1 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {users.filter(u => u.id !== session.userId).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: u.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 700 }}>{u.name[0]}</div>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    {u.name}: <strong style={{ color: 'white' }}>{formatMinutes(weeklyTotals[u.id] || 0)}</strong>
                    {(streaks[u.id] || 0) >= 2 && <span style={{ marginLeft: '0.3rem' }}>🔥{streaks[u.id]}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks grouped by category */}
        {Object.entries(grouped).map(([category, catTasks]) => (
          <div key={category} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {category}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {catTasks.map(task => {
                const done = !!justDone[task.id]
                const expanded = expandedTask === task.id
                const isTimerTask = activeTimer === task.id
                const elapsed = taskSec(task.id)

                return (
                  <div key={task.id} style={{
                    background: done ? 'var(--sage)' : 'white',
                    borderRadius: '1rem', overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: isTimerTask && timerRunning ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'background 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.9rem 1rem', gap: '0.75rem' }}>
                      <button
                        onClick={() => done ? undoCompletion(task.id) : markDone(task)}
                        disabled={isPending}
                        style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(255,255,255,0.3)' : 'var(--cream)', border: done ? '2px solid rgba(255,255,255,0.5)' : '2px solid var(--sage)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? 'white' : 'var(--sage)' }}
                      >
                        {done ? <Undo2 size={16} /> : <CheckCircle size={16} />}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <p style={{ margin: 0, fontWeight: 600, color: done ? 'white' : 'var(--ink)', fontSize: '0.95rem' }}>{task.name}</p>
                          {done && <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.25)', color: 'white', borderRadius: '0.5rem', padding: '0.1rem 0.4rem' }}>gaida</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} color={done ? 'rgba(255,255,255,0.7)' : 'var(--muted)'} />
                            <span style={{ fontSize: '0.8rem', color: done ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>{task.time_value} min</span>
                          </div>
                          {isTimerTask && elapsed > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Hourglass size={12} color={timerRunning ? 'var(--accent)' : 'var(--muted)'} />
                              <span style={{ fontSize: '0.8rem', color: timerRunning ? 'var(--accent)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(elapsed)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {!done && (
                        <button
                          onClick={() => { if (!isTimerTask || !timerRunning) startTimer(task.id); else stopTimer(task.id) }}
                          style={{ background: isTimerTask && timerRunning ? 'var(--accent)' : 'var(--cream)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.5rem', cursor: 'pointer', color: isTimerTask && timerRunning ? 'white' : 'var(--muted)', display: 'flex', alignItems: 'center' }}
                        ><Timer size={15} /></button>
                      )}

                      {task.instructions && (
                        <button onClick={() => setExpandedTask(expanded ? null : task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? 'rgba(255,255,255,0.7)' : 'var(--muted)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                          <BookOpen size={15} />
                          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Note input */}
                    {!done && expanded && (
                      <div style={{ padding: '0 1rem 0.75rem' }}>
                        <input
                          placeholder="Piezīme (pēc izvēles)..."
                          value={noteInputs[task.id] || ''}
                          onChange={e => setNoteInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '2px solid var(--cream)', borderRadius: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.85rem', background: 'var(--paper)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {/* Timer controls */}
                    {isTimerTask && !done && (
                      <div style={{ padding: '0 1rem 0.75rem', display: 'flex', gap: '0.5rem' }}>
                        {elapsed > 0 && !timerRunning && (
                          <button onClick={() => markDone(task, false, true)} style={{ flex: 1, padding: '0.5rem', background: 'var(--sage)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem' }}>
                            ✓ Done — {formatDuration(elapsed)}
                          </button>
                        )}
                        <button onClick={() => resetTimer(task.id)} style={{ padding: '0.5rem 0.75rem', background: 'var(--cream)', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--muted)' }}>Atiestatīt</button>
                      </div>
                    )}

                    {/* Instructions */}
                    {expanded && task.instructions && (
                      <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--cream)' }}>
                        <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.instructions}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Spend timer */}
        <SpendTimer availableMinutes={myMinutes} rewards={rewards.filter(r => r.unlimited || myMinutes >= r.threshold_minutes)} userId={session.userId} />

        {/* Rewards */}
        {rewards.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.75rem' }}>Atlīdzības</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {rewards.map(reward => {
                const unlocked = myMinutes >= reward.threshold_minutes
                const claimed = claimedIds.includes(reward.id)
                return (
                  <div key={reward.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: unlocked ? 'rgba(242,169,59,0.1)' : 'white', border: unlocked ? '2px solid var(--gold)' : '2px solid transparent', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <Trophy size={16} color={unlocked ? 'var(--gold)' : 'var(--muted)'} />
                    <span style={{ flex: 1, fontWeight: 600, color: unlocked ? 'var(--ink)' : 'var(--muted)', fontSize: '0.9rem' }}>{reward.name}</span>
                    <span style={{ fontSize: '0.85rem', color: unlocked ? 'var(--gold)' : 'var(--muted)', fontWeight: 600 }}>{formatMinutes(reward.threshold_minutes)}</span>
                    {unlocked && !claimed && (
                      <button onClick={() => claimReward(reward.id)} style={{ background: 'var(--gold)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.35rem 0.75rem', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                        Claim
                      </button>
                    )}
                    {claimed && <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600 }}>Gaida ⏳</span>}
                    {unlocked && !claimed && <CheckCircle size={16} color="var(--gold)" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
