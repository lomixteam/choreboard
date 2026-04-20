import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const [tasksRes, usersRes, rewardsRes, pendingRes, claimsRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').order('category').order('name'),
    supabaseAdmin.from('users').select('id, name, role, avatar_color, created_at').order('name'),
    supabaseAdmin.from('rewards').select('*').order('threshold_minutes'),
    supabaseAdmin
      .from('completions')
      .select('id, completed_at, actual_duration, status, note, users ( id, name, avatar_color ), tasks ( id, name, time_value )')
      .eq('status', 'pending')
      .order('completed_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('reward_claims')
      .select('id, claimed_at, status, note, users ( id, name, avatar_color ), rewards ( id, name, threshold_minutes )')
      .eq('status', 'pending')
      .order('claimed_at', { ascending: false }),
  ])

  return (
    <AdminClient
      session={session}
      tasks={(tasksRes.data || []) as any[]}
      users={(usersRes.data || []) as any[]}
      rewards={(rewardsRes.data || []) as any[]}
      pendingCompletions={(pendingRes.data || []) as any[]}
      pendingClaims={(claimsRes.data || []) as any[]}
    />
  )
}
