import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const admin = createAdminClient()
  let query = admin
    .from('weekly_assessments')
    .select('*')
    .eq('user_id', auth.userId)
    .order('week_date', { ascending: false })

  if (date) query = query.eq('week_date', date)

  const { data, error } = await query.limit(52)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('weekly_assessments')
    .upsert({
      user_id: auth.userId,
      week_date: body.week_date,
      self_identity_clarity: body.self_identity_clarity,
      confidence: body.confidence,
      focus_quality: body.focus_quality,
      anxiety_management: body.anxiety_management,
      resilience: body.resilience,
      motivation: body.motivation,
      mental_imagery: body.mental_imagery,
      routine_consistency: body.routine_consistency,
      team_relationships: body.team_relationships,
      vision_clarity: body.vision_clarity,
      notes: body.notes || null,
    }, { onConflict: 'user_id,week_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
