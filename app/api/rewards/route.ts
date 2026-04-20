export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSession, requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireSession()
    const { data, error } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('active', true)
      .order('threshold_minutes')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { name, threshold_minutes } = await req.json()
    if (!name || !threshold_minutes) {
      return NextResponse.json({ error: 'Name and threshold required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('rewards')
      .insert({ name, threshold_minutes })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
