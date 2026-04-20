import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'

// Returns count of today's non-rejected completions per task for current user
export async function GET() {
  try {
    const session = await requireSession()
    const dayStart = new Date(); dayStart.setHours(0,0,0,0)
    const dayEnd = new Date(); dayEnd.setHours(23,59,59,999)

    const { data, error } = await supabaseAdmin
      .from('completions')
      .select('task_id')
      .eq('user_id', session.userId)
      .neq('status', 'rejected')
      .gte('completed_at', dayStart.toISOString())
      .lte('completed_at', dayEnd.toISOString())

    if (error) return NextResponse.json({}, { status: 500 })

    const counts: Record<string, number> = {}
    for (const row of data) {
      counts[row.task_id] = (counts[row.task_id] || 0) + 1
    }
    return NextResponse.json(counts)
  } catch {
    return NextResponse.json({}, { status: 401 })
  }
}
