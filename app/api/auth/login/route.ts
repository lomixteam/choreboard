import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { createSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { userId, pin } = await req.json()

    if (!userId || !pin) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, pin_hash, role')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const valid = await bcrypt.compare(pin, user.pin_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
    }

    const token = await createSession({
      userId: user.id,
      role: user.role as 'admin' | 'member',
      name: user.name,
    })

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
