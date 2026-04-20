import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWeekStart, getWeekEnd } from '@/lib/utils'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch all data in parallel
  const [tasksRes, usersRes, rewardsRes, completionsRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('active', true).order('name'),
    supabaseAdmin.from('users').select('id, name, avatar_color, role, created_at').order('name'),
    supabaseAdmin.from('rewards').select('*').eq('active', true).order('threshold_minutes'),
    supabaseAdmin
      .from('completions')
      .select('user_id, tasks ( time_value )')
      .eq('status', 'approved')
      .gte('completed_at', getWeekStart())
      .lte('completed_at', getWeekEnd()),
  ])

  const tasks = tasksRes.data || []
  const users = usersRes.data || []
  const rewards = rewardsRes.data || []

  // Compute weekly totals per user
  const weeklyTotals: Record<string, number> = {}
  for (const row of (completionsRes.data || []) as any[]) {
    const uid = row.user_id
    weeklyTotals[uid] = (weeklyTotals[uid] || 0) + (row.tasks?.time_value || 0)
  }

  return (
    <DashboardClient
      session={session}
      tasks={tasks}
      users={users}
      rewards={rewards}
      weeklyTotals={weeklyTotals}
    />
  )
}
