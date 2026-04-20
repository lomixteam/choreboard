export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { getWeekStart } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const { status } = await req.json()

    if (!['approved', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get claim with reward info
    const { data: claim } = await supabaseAdmin
      .from('reward_claims')
      .select('id, user_id, rewards ( id, type, cost_minutes, threshold_minutes )')
      .eq('id', id)
      .single()

    if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('reward_claims')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status, users ( name ), rewards ( name )')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If approving a trigger reward, deduct cost_minutes via a spend session
    if (status === 'approved') {
      const reward = (claim as any).rewards
      if (reward?.type === 'trigger' && reward?.cost_minutes) {
        await supabaseAdmin.from('spend_sessions').insert({
          user_id: claim.user_id,
          reward_id: reward.id,
          week_start: getWeekStart().slice(0, 10),
          started_at: new Date().toISOString(),
          stopped_at: new Date().toISOString(),
          minutes_used: reward.cost_minutes,
        })
      }
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
