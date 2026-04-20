export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'

// GET - fetch claims (admin sees all pending, member sees own)
export async function GET() {
  try {
    const session = await requireSession()
    let query = supabaseAdmin
      .from('reward_claims')
      .select('id, claimed_at, status, note, users ( id, name, avatar_color ), rewards ( id, name, threshold_minutes )')
      .order('claimed_at', { ascending: false })

    if (session.role !== 'admin') {
      query = query.eq('user_id', session.userId)
    } else {
      query = query.eq('status', 'pending')
    }

    const { data, error } = await query.limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST - kid claims a reward
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const { rewardId, note } = await req.json()
    if (!rewardId) return NextResponse.json({ error: 'rewardId required' }, { status: 400 })

    // Check no existing pending claim for this reward by this user
    const { count } = await supabaseAdmin
      .from('reward_claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .eq('reward_id', rewardId)
      .eq('status', 'pending')

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'already_pending' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('reward_claims')
      .insert({ user_id: session.userId, reward_id: rewardId, note: note || null })
      .select('id, status, rewards ( name )')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
