export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession()
    const { current_pin, new_pin } = await req.json()

    if (!current_pin || !new_pin) {
      return NextResponse.json({ error: 'Both current and new PIN required' }, { status: 400 })
    }
    if (new_pin.length < 4) {
      return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 })
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('pin_hash')
      .eq('id', session.userId)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(current_pin, user.pin_hash)
    if (!valid) return NextResponse.json({ error: 'Current PIN is wrong' }, { status: 401 })

    const pin_hash = await bcrypt.hash(new_pin, 10)
    await supabaseAdmin.from('users').update({ pin_hash }).eq('id', session.userId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
