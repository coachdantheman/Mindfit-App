import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '14')
  const since = new Date()
  since.setDate(since.getDate() - days)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flow_logs')
    .select('*')
    .eq('user_id', auth.userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('flow_logs')
    .insert({
      user_id: auth.userId,
      flow_session_id: body.flow_session_id || null,
      logged_at: body.logged_at || new Date().toISOString(),
      sport: body.sport || null,
      challenge_level: body.challenge_level,
      skill_level: body.skill_level,
      flow_score: body.flow_score,
      ending_stage: body.ending_stage,
      triggers_fired: body.triggers_fired || [],
      journal_note: body.journal_note || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
