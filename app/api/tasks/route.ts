import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession, requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireSession()
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('active', true)
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
    const body = await req.json()
    const { name, time_value, frequency_per_week, instructions } = body

    if (!name || !time_value) {
      return NextResponse.json({ error: 'Name and time_value required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({ name, time_value, frequency_per_week: frequency_per_week || 1, instructions })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
