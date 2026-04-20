export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'
import { getWeekStart, getWeekEnd } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const { searchParams } = new URL(req.url)
    const week = searchParams.get('week') === 'true'

    if (week) {
      const { data, error } = await supabaseAdmin
        .from('completions')
        .select('user_id, awarded_minutes, tasks ( time_value )')
        .eq('status', 'approved')
        .gte('completed_at', getWeekStart())
        .lte('completed_at', getWeekEnd())

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const totals: Record<string, number> = {}
      for (const row of data as any[]) {
        const uid = row.user_id
        // Use awarded_minutes if set, otherwise fall back to task's time_value
        const mins = row.awarded_minutes ?? row.tasks?.time_value ?? 0
        totals[uid] = (totals[uid] || 0) + mins
      }
      return NextResponse.json(totals)
    }

    const { data, error } = await supabaseAdmin
      .from('completions')
      .select('id, completed_at, status, actual_duration, awarded_minutes, note, users ( id, name, avatar_color ), tasks ( id, name, time_value )')
      .order('completed_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const { taskId, userId, actual_duration, force, note, pre_approved } = await req.json()

    // pre_approved: admin quick-logging on behalf of a child
    const isAdmin = session.role === 'admin'
    const targetUserId = isAdmin && userId ? userId : session.userId
    const status = (isAdmin && pre_approved) ? 'approved' : 'pending'

    if (!force) {
      const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('daily_limit')
        .eq('id', taskId)
        .single()

      if (task?.daily_limit != null) {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999)

        const { count } = await supabaseAdmin
          .from('completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUserId)
          .eq('task_id', taskId)
          .neq('status', 'rejected')
          .gte('completed_at', dayStart.toISOString())
          .lte('completed_at', dayEnd.toISOString())

        if ((count ?? 0) >= task.daily_limit) {
          return NextResponse.json({ error: 'daily_limit', count, limit: task.daily_limit }, { status: 409 })
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('completions')
      .insert({
        user_id: targetUserId,
        task_id: taskId,
        status,
        actual_duration: actual_duration ?? null,
        note: note || null,
      })
      .select('id, completed_at, status, awarded_minutes, tasks ( name, time_value )')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: completion } = await supabaseAdmin
      .from('completions')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (!completion) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (session.role !== 'admin' && completion.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (completion.status === 'approved' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Already approved' }, { status: 403 })
    }

    const { error } = await supabaseAdmin.from('completions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
