import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'

// GET /api/history?range=week|month&userId=xxx
export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'month'
    const userId = searchParams.get('userId')

    const since = new Date()
    if (range === 'month') since.setDate(since.getDate() - 28)
    else since.setDate(since.getDate() - 7)
    since.setHours(0, 0, 0, 0)

    let query = supabaseAdmin
      .from('completions')
      .select('user_id, completed_at, actual_duration, tasks ( name, time_value ), users ( id, name, avatar_color )')
      .eq('status', 'approved')
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: true })

    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
