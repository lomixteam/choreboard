export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'
import { getWeekStart } from '@/lib/utils'

// GET - active session for current user this week
export async function GET() {
  try {
    const session = await requireSession()
    const { data, error } = await supabaseAdmin
      .from('spend_sessions')
      .select('id, started_at, stopped_at, minutes_used, reward_id, rewards ( id, name )')
      .eq('user_id', session.userId)
      .eq('week_start', getWeekStart().slice(0, 10))
      .is('stopped_at', null)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST - start a spend session
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const { rewardId } = await req.json()

    // Check no active session already
    const { count } = await supabaseAdmin
      .from('spend_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .eq('week_start', getWeekStart().slice(0, 10))
      .is('stopped_at', null)

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'already_active' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('spend_sessions')
      .insert({
        user_id: session.userId,
        reward_id: rewardId || null,
        week_start: getWeekStart().slice(0, 10),
      })
      .select('id, started_at, reward_id, rewards ( id, name )')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH - stop a spend session, record minutes used
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession()
    const { sessionId, minutesUsed } = await req.json()

    const { data: existing } = await supabaseAdmin
      .from('spend_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (!existing || existing.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('spend_sessions')
      .update({ stopped_at: new Date().toISOString(), minutes_used: minutesUsed })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
