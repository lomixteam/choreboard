import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import HistoryClient from './HistoryClient'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const since = new Date()
  since.setDate(since.getDate() - 28)
  since.setHours(0, 0, 0, 0)

  const [completionsRes, usersRes] = await Promise.all([
    supabaseAdmin
      .from('completions')
      .select('user_id, completed_at, actual_duration, awarded_minutes, tasks ( name, time_value ), users ( id, name, avatar_color )')
      .eq('status', 'approved')
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: true }),
    supabaseAdmin.from('users').select('id, name, avatar_color').order('name'),
  ])

  return (
    <HistoryClient
      completions={(completionsRes.data || []) as any[]}
      users={usersRes.data || []}
      session={session}
    />
  )
}
