import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, role, avatar_color, created_at')
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { name, pin, role, avatar_color } = await req.json()

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 })
    }

    const pin_hash = await bcrypt.hash(pin, 10)

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ name, pin_hash, role: role || 'member', avatar_color: avatar_color || '#6b8f71' })
      .select('id, name, role, avatar_color')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
