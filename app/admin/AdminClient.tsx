'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, X, Check, ArrowLeft, ThumbsUp, ThumbsDown, Clock, Trophy } from 'lucide-react'
import type { Task, User, Reward } from '@/lib/types'
import { formatMinutes } from '@/lib/utils'

const COLORS = ['#6b8f71','#e85d26','#f2a93b','#4a7fb5','#9b6bb5','#b56b6b','#6bb5b5','#1a1a2e']

interface PendingCompletion {
  id: string
  completed_at: string
  actual_duration: number | null
  status: string
  note: string | null
  users: { id: string; name: string; avatar_color: string } | null
  tasks: { id: string; name: string; time_value: number } | null
}

interface PendingClaim {
  id: string
  claimed_at: string
  status: string
  note: string | null
  users: { id: string; name: string; avatar_color: string } | null
  rewards: { id: string; name: string; threshold_minutes: number } | null
}

interface Props {
  tasks: Task[]
  users: User[]
  rewards: Reward[]
  pendingCompletions: PendingCompletion[]
  pendingClaims: PendingClaim[]
}

type Tab = 'approvals' | 'tasks' | 'users' | 'rewards'

// Award options for a completion
type AwardOption = 'full' | 'half' | 'actual' | 'custom'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminClient({ tasks: initialTasks, users: initialUsers, rewards: initialRewards, pendingCompletions: initialPending, pendingClaims: initialClaims }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('approvals')

  const [tasks, setTasks] = useState(initialTasks)
  const [users, setUsers] = useState(initialUsers)
  const [rewards, setRewards] = useState(initialRewards)
  const [pending, setPending] = useState(initialPending)
  const [claims, setClaims] = useState(initialClaims)

  // Award state per completion
  const [awardOption, setAwardOption] = useState<Record<string, AwardOption>>({})
  const [customMinutes, setCustomMinutes] = useState<Record<string, string>>({})

  // Quick-log modal
  const [quickLog, setQuickLog] = useState(false)
  const [qlUser, setQlUser] = useState('')
  const [qlTask, setQlTask] = useState('')
  const [qlNote, setQlNote] = useState('')

  const [taskForm, setTaskForm] = useState({ name: '', time_value: '', frequency_per_week: '1', daily_limit: '', category: '', instructions: '' })
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: '', pin: '', role: 'member', avatar_color: COLORS[0] })
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [rewardForm, setRewardForm] = useState({ name: '', threshold_minutes: '' })
  const [editingReward, setEditingReward] = useState<string | null>(null)

  const totalPending = pending.length + claims.length

  function getAwardedMinutes(c: PendingCompletion): number | null {
    const opt = awardOption[c.id] || 'full'
    const preset = c.tasks?.time_value ?? 0
    if (opt === 'full') return null // null = use preset
    if (opt === 'half') return Math.floor(preset / 2)
    if (opt === 'actual' && c.actual_duration) return Math.max(1, Math.floor(c.actual_duration / 60))
    if (opt === 'custom') return parseInt(customMinutes[c.id] || '0') || 0
    return null
  }

  // --- Approvals ---
  async function approve(c: PendingCompletion) {
    const awarded_minutes = getAwardedMinutes(c)
    const res = await fetch(`/api/completions/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', awarded_minutes }),
    })
    if (res.ok) {
      setPending(prev => prev.filter(x => x.id !== c.id))
      router.refresh()
    }
  }

  async function reject(id: string) {
    const res = await fetch(`/api/completions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    if (res.ok) setPending(prev => prev.filter(x => x.id !== id))
  }

  async function approveClaim(id: string) {
    const res = await fetch(`/api/reward-claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    if (res.ok) setClaims(prev => prev.filter(x => x.id !== id))
  }

  async function declineClaim(id: string) {
    const res = await fetch(`/api/reward-claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'declined' }),
    })
    if (res.ok) setClaims(prev => prev.filter(x => x.id !== id))
  }

  // --- Quick log ---
  async function submitQuickLog() {
    if (!qlUser || !qlTask) return
    const res = await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: qlTask, userId: qlUser, note: qlNote || undefined, pre_approved: true, force: true }),
    })
    if (res.ok) {
      setQuickLog(false); setQlUser(''); setQlTask(''); setQlNote('')
      router.refresh()
    }
  }

  // --- Tasks ---
  async function saveTask() {
    if (!taskForm.name || !taskForm.time_value) return
    const body = {
      name: taskForm.name, time_value: Number(taskForm.time_value),
      frequency_per_week: Number(taskForm.frequency_per_week),
      daily_limit: taskForm.daily_limit ? Number(taskForm.daily_limit) : null,
      category: taskForm.category || null,
      instructions: taskForm.instructions || null,
    }
    if (editingTask) {
      const res = await fetch(`/api/tasks/${editingTask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === editingTask ? updated : t))
      setEditingTask(null)
    } else {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const created = await res.json()
      setTasks(prev => [...prev, created])
    }
    setTaskForm({ name: '', time_value: '', frequency_per_week: '1', daily_limit: '', category: '', instructions: '' })
  }

  async function deleteTask(id: string) {
    if (!confirm('Archive this task?')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function startEditTask(task: Task) {
    setEditingTask(task.id)
    setTaskForm({ name: task.name, time_value: String(task.time_value), frequency_per_week: String(task.frequency_per_week), daily_limit: task.daily_limit != null ? String(task.daily_limit) : '', category: task.category || '', instructions: task.instructions || '' })
  }

  // --- Users ---
  async function saveUser() {
    if (!userForm.name || (!editingUser && !userForm.pin)) return
    const body: Record<string, string> = { name: userForm.name, role: userForm.role, avatar_color: userForm.avatar_color }
    if (userForm.pin) body.pin = userForm.pin
    if (editingUser) {
      const res = await fetch(`/api/users/${editingUser}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === editingUser ? updated : u))
      setEditingUser(null)
    } else {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const created = await res.json()
      setUsers(prev => [...prev, created])
    }
    setUserForm({ name: '', pin: '', role: 'member', avatar_color: COLORS[0] })
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  // --- Rewards ---
  async function saveReward() {
    if (!rewardForm.name || !rewardForm.threshold_minutes) return
    const body = { name: rewardForm.name, threshold_minutes: Number(rewardForm.threshold_minutes) }
    if (editingReward) {
      const res = await fetch(`/api/rewards/${editingReward}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const updated = await res.json()
      setRewards(prev => prev.map(r => r.id === editingReward ? updated : r))
      setEditingReward(null)
    } else {
      const res = await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const created = await res.json()
      setRewards(prev => [...prev, created].sort((a, b) => a.threshold_minutes - b.threshold_minutes))
    }
    setRewardForm({ name: '', threshold_minutes: '' })
  }

  async function deleteReward(id: string) {
    if (!confirm('Delete this reward?')) return
    await fetch(`/api/rewards/${id}`, { method: 'DELETE' })
    setRewards(prev => prev.filter(r => r.id !== id))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.85rem', border: '2px solid var(--cream)',
    borderRadius: '0.6rem', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
    background: 'white', color: 'var(--ink)', outline: 'none',
  }
  const btnPrimary: React.CSSProperties = {
    background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '0.6rem',
    padding: '0.65rem 1.25rem', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
  }
  const awardBtn = (active: boolean, color = 'var(--sage)'): React.CSSProperties => ({
    padding: '0.3rem 0.6rem', border: `2px solid ${active ? color : 'var(--cream)'}`,
    borderRadius: '0.4rem', background: active ? color : 'transparent',
    color: active ? 'white' : 'var(--muted)', fontFamily: 'var(--font-body)',
    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)', paddingBottom: '3rem' }}>

      {/* Quick-log modal */}
      {quickLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 1.25rem' }}>Log task for someone</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select style={inputStyle} value={qlUser} onChange={e => setQlUser(e.target.value)}>
                <option value="">Select person...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select style={inputStyle} value={qlTask} onChange={e => setQlTask(e.target.value)}>
                <option value="">Select task...</option>
                {tasks.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name} ({t.time_value} min)</option>)}
              </select>
              <input style={inputStyle} placeholder="Note (optional)" value={qlNote} onChange={e => setQlNote(e.target.value)} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }} onClick={submitQuickLog} disabled={!qlUser || !qlTask}>
                  <Check size={16} /> Log & approve
                </button>
                <button style={{ ...btnPrimary, background: 'var(--cream)', color: 'var(--ink)' }} onClick={() => setQuickLog(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header style={{ background: 'var(--ink)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><ArrowLeft size={20} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)', fontSize: '1.3rem', margin: 0, flex: 1 }}>Admin</h1>
        <button onClick={() => setQuickLog(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600 }}>
          + Quick log
        </button>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.25rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: 'var(--cream)', borderRadius: '0.75rem', padding: '0.3rem' }}>
          {(['approvals', 'tasks', 'users', 'rewards'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.55rem 0.25rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
              background: tab === t ? 'white' : 'transparent',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem',
              color: tab === t ? 'var(--ink)' : 'var(--muted)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              textTransform: 'capitalize', position: 'relative',
            }}>
              {t}
              {t === 'approvals' && totalPending > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {totalPending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ---- APPROVALS ---- */}
        {tab === 'approvals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {totalPending === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>✓</p>
                <p style={{ margin: 0 }}>Nothing to approve</p>
              </div>
            )}

            {/* Reward claims */}
            {claims.map(c => (
              <div key={c.id} style={{ background: 'rgba(242,169,59,0.08)', border: '2px solid var(--gold)', borderRadius: '1rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: c.users?.avatar_color || 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                    {c.users?.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Trophy size={14} color="var(--gold)" />
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{c.rewards?.name}</p>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {c.users?.name} · {timeAgo(c.claimed_at)} · {c.rewards?.threshold_minutes} min reward
                    </p>
                    {c.note && <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic' }}>"{c.note}"</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => declineClaim(c.id)} style={{ background: 'rgba(232,93,38,0.1)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--accent)' }}><ThumbsDown size={16} /></button>
                    <button onClick={() => approveClaim(c.id)} style={{ background: 'rgba(242,169,59,0.2)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--gold)' }}><ThumbsUp size={16} /></button>
                  </div>
                </div>
              </div>
            ))}

            {/* Task completions */}
            {pending.map(c => {
              const opt = awardOption[c.id] || 'full'
              const preset = c.tasks?.time_value ?? 0
              const hasTimer = c.actual_duration != null
              const actualMins = hasTimer ? Math.max(1, Math.floor(c.actual_duration! / 60)) : null

              return (
                <div key={c.id} style={{ background: 'white', borderRadius: '1rem', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: c.users?.avatar_color || 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                      {c.users?.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{c.tasks?.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.users?.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>·</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{timeAgo(c.completed_at)}</span>
                        {hasTimer && (
                          <>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>·</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={11} /> {formatDuration(c.actual_duration!)}
                            </span>
                          </>
                        )}
                      </div>
                      {c.note && <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', background: 'var(--cream)', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', display: 'inline-block' }}>"{c.note}"</p>}

                      {/* Award options */}
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginRight: '0.2rem' }}>Award:</span>
                        <button style={awardBtn(opt === 'full')} onClick={() => setAwardOption(p => ({ ...p, [c.id]: 'full' }))}>
                          Full ({preset} min)
                        </button>
                        <button style={awardBtn(opt === 'half', 'var(--gold)')} onClick={() => setAwardOption(p => ({ ...p, [c.id]: 'half' }))}>
                          Half ({Math.floor(preset / 2)} min)
                        </button>
                        {hasTimer && (
                          <button style={awardBtn(opt === 'actual', 'var(--sage)')} onClick={() => setAwardOption(p => ({ ...p, [c.id]: 'actual' }))}>
                            Actual ({actualMins} min)
                          </button>
                        )}
                        <button style={awardBtn(opt === 'custom', 'var(--ink)')} onClick={() => setAwardOption(p => ({ ...p, [c.id]: 'custom' }))}>
                          Custom
                        </button>
                        {opt === 'custom' && (
                          <input
                            type="number" placeholder="min"
                            value={customMinutes[c.id] || ''}
                            onChange={e => setCustomMinutes(p => ({ ...p, [c.id]: e.target.value }))}
                            style={{ width: 60, padding: '0.25rem 0.4rem', border: '2px solid var(--ink)', borderRadius: '0.4rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}
                          />
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button onClick={() => reject(c.id)} style={{ background: 'rgba(232,93,38,0.1)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--accent)' }}><ThumbsDown size={16} /></button>
                      <button onClick={() => approve(c)} style={{ background: 'rgba(107,143,113,0.15)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--sage)' }}><ThumbsUp size={16} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ---- TASKS ---- */}
        {tab === 'tasks' && (
          <div>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input style={inputStyle} placeholder="Task name" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} />
                <input style={inputStyle} placeholder="Category (e.g. Kitchen, Music)" value={taskForm.category} onChange={e => setTaskForm(f => ({ ...f, category: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                  <input style={inputStyle} placeholder="Minutes" type="number" value={taskForm.time_value} onChange={e => setTaskForm(f => ({ ...f, time_value: e.target.value }))} />
                  <input style={inputStyle} placeholder="×/week" type="number" value={taskForm.frequency_per_week} onChange={e => setTaskForm(f => ({ ...f, frequency_per_week: e.target.value }))} />
                  <input style={inputStyle} placeholder="Max/day" type="number" value={taskForm.daily_limit} onChange={e => setTaskForm(f => ({ ...f, daily_limit: e.target.value }))} />
                </div>
                <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} placeholder="Instructions (optional)" value={taskForm.instructions} onChange={e => setTaskForm(f => ({ ...f, instructions: e.target.value }))} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={btnPrimary} onClick={saveTask}>{editingTask ? <><Check size={16} /> Save</> : <><Plus size={16} /> Add</>}</button>
                  {editingTask && <button style={{ ...btnPrimary, background: 'var(--cream)', color: 'var(--ink)' }} onClick={() => { setEditingTask(null); setTaskForm({ name: '', time_value: '', frequency_per_week: '1', daily_limit: '', category: '', instructions: '' }) }}><X size={16} /> Cancel</button>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map(task => (
                <div key={task.id} style={{ background: task.active ? 'white' : 'var(--cream)', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{task.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {task.category && <span style={{ marginRight: '0.4rem' }}>{task.category} ·</span>}
                      {task.time_value} min · {task.frequency_per_week}×/week
                      {task.daily_limit != null ? ` · max ${task.daily_limit}/day` : ''}
                    </p>
                  </div>
                  <button onClick={() => startEditTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><Pencil size={16} /></button>
                  <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- USERS ---- */}
        {tab === 'users' && (
          <div>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{editingUser ? 'Edit User' : 'Add User'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input style={inputStyle} placeholder="Name" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
                <input style={inputStyle} placeholder={editingUser ? 'New PIN (leave blank to keep)' : 'PIN (4+ digits)'} type="password" value={userForm.pin} onChange={e => setUserForm(f => ({ ...f, pin: e.target.value }))} />
                <select style={inputStyle} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <div>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--muted)' }}>Avatar color</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {COLORS.map(c => <button key={c} onClick={() => setUserForm(f => ({ ...f, avatar_color: c }))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: userForm.avatar_color === c ? '3px solid var(--ink)' : 'none', outlineOffset: 2 }} />)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={btnPrimary} onClick={saveUser}>{editingUser ? <><Check size={16} /> Save</> : <><Plus size={16} /> Add</>}</button>
                  {editingUser && <button style={{ ...btnPrimary, background: 'var(--cream)', color: 'var(--ink)' }} onClick={() => { setEditingUser(null); setUserForm({ name: '', pin: '', role: 'member', avatar_color: COLORS[0] }) }}><X size={16} /> Cancel</button>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.map(user => (
                <div key={user.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>{user.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{user.role}</p>
                  </div>
                  <button onClick={() => { setEditingUser(user.id); setUserForm({ name: user.name, pin: '', role: user.role, avatar_color: user.avatar_color }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><Pencil size={16} /></button>
                  <button onClick={() => deleteUser(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- REWARDS ---- */}
        {tab === 'rewards' && (
          <div>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{editingReward ? 'Edit Reward' : 'Add Reward'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input style={inputStyle} placeholder="Reward name" value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} />
                <input style={inputStyle} placeholder="Minutes required" type="number" value={rewardForm.threshold_minutes} onChange={e => setRewardForm(f => ({ ...f, threshold_minutes: e.target.value }))} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={btnPrimary} onClick={saveReward}>{editingReward ? <><Check size={16} /> Save</> : <><Plus size={16} /> Add</>}</button>
                  {editingReward && <button style={{ ...btnPrimary, background: 'var(--cream)', color: 'var(--ink)' }} onClick={() => { setEditingReward(null); setRewardForm({ name: '', threshold_minutes: '' }) }}><X size={16} /> Cancel</button>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {rewards.map(reward => (
                <div key={reward.id} style={{ background: reward.active ? 'white' : 'var(--cream)', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{reward.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>{reward.threshold_minutes} min</p>
                  </div>
                  <button onClick={() => { setEditingReward(reward.id); setRewardForm({ name: reward.name, threshold_minutes: String(reward.threshold_minutes) }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><Pencil size={16} /></button>
                  <button onClick={() => deleteReward(reward.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
