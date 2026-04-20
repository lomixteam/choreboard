import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWeekStart, getWeekEnd } from '@/lib/utils'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const since60 = new Date()
  since60.setDate(since60.getDate() - 60)
  since60.setHours(0, 0, 0, 0)

  const [tasksRes, usersRes, rewardsRes, completionsRes, streakRes, claimsRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('active', true).order('category').order('name'),
    supabaseAdmin.from('users').select('id, name, avatar_color, role, created_at').order('name'),
    supabaseAdmin.from('rewards').select('*').eq('active', true).order('threshold_minutes'),
    supabaseAdmin
      .from('completions')
      .select('user_id, awarded_minutes, tasks ( time_value )')
      .eq('status', 'approved')
      .gte('completed_at', getWeekStart())
      .lte('completed_at', getWeekEnd()),
    supabaseAdmin
      .from('completions')
      .select('user_id, completed_at')
      .eq('status', 'approved')
      .gte('completed_at', since60.toISOString()),
    supabaseAdmin
      .from('reward_claims')
      .select('id, status, reward_id, user_id')
      .eq('user_id', session.userId)
      .eq('status', 'pending'),
  ])

  // Weekly totals
  const weeklyTotals: Record<string, number> = {}
  for (const row of (completionsRes.data || []) as any[]) {
    const uid = row.user_id
    const mins = row.awarded_minutes ?? row.tasks?.time_value ?? 0
    weeklyTotals[uid] = (weeklyTotals[uid] || 0) + mins
  }

  // Streaks
  const byUser: Record<string, Set<string>> = {}
  for (const row of (streakRes.data || [])) {
    const day = row.completed_at.slice(0, 10)
    if (!byUser[row.user_id]) byUser[row.user_id] = new Set()
    byUser[row.user_id].add(day)
  }
  const streaks: Record<string, number> = {}
  for (const [userId, days] of Object.entries(byUser)) {
    const sorted = Array.from(days).sort().reverse()
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (!sorted[0] || (sorted[0] !== today && sorted[0] !== yesterday)) { streaks[userId] = 0; continue }
    let streak = 1
    let current = new Date(sorted[0])
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i])
      if ((current.getTime() - prev.getTime()) / 86400000 === 1) { streak++; current = prev } else break
    }
    streaks[userId] = streak
  }

  // Pending claim reward IDs for current user
  const pendingClaimRewardIds = (claimsRes.data || []).map((c: any) => c.reward_id)

  return (
    <DashboardClient
      session={session}
      tasks={(tasksRes.data || []) as any[]}
      users={(usersRes.data || []) as any[]}
      rewards={(rewardsRes.data || []) as any[]}
      weeklyTotals={weeklyTotals}
      streaks={streaks}
      pendingClaimRewardIds={pendingClaimRewardIds}
    />
  )
}
