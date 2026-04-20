export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'

export async function GET() {
  try {
    await requireSession()

    // Get all approved completion dates per user for last 60 days
    const since = new Date()
    since.setDate(since.getDate() - 60)

    const { data, error } = await supabaseAdmin
      .from('completions')
      .select('user_id, completed_at')
      .eq('status', 'approved')
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group dates by user
    const byUser: Record<string, Set<string>> = {}
    for (const row of data) {
      const day = row.completed_at.slice(0, 10) // YYYY-MM-DD
      if (!byUser[row.user_id]) byUser[row.user_id] = new Set()
      byUser[row.user_id].add(day)
    }

    // Calculate streak per user
    const streaks: Record<string, number> = {}
    for (const [userId, days] of Object.entries(byUser)) {
      const sorted = Array.from(days).sort().reverse() // newest first
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      // Streak must include today or yesterday to be active
      if (!sorted[0] || (sorted[0] !== today && sorted[0] !== yesterday)) {
        streaks[userId] = 0
        continue
      }

      let streak = 1
      let current = new Date(sorted[0])
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i])
        const diff = (current.getTime() - prev.getTime()) / 86400000
        if (diff === 1) {
          streak++
          current = prev
        } else {
          break
        }
      }
      streaks[userId] = streak
    }

    return NextResponse.json(streaks)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
