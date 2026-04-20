import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const [tasksRes, usersRes, rewardsRes, pendingRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').order('name'),
    supabaseAdmin.from('users').select('id, name, role, avatar_color, created_at').order('name'),
    supabaseAdmin.from('rewards').select('*').order('threshold_minutes'),
    supabaseAdmin
      .from('completions')
      .select('id, completed_at, actual_duration, status, users ( id, name, avatar_color ), tasks ( id, name, time_value )')
      .eq('status', 'pending')
      .order('completed_at', { ascending: false })
      .limit(50),
  ])

  return (
    <AdminClient
      tasks={(tasksRes.data || []) as any[]}
      users={(usersRes.data || []) as any[]}
      rewards={(rewardsRes.data || []) as any[]}
      pendingCompletions={(pendingRes.data || []) as any[]}
    />
  )
}
