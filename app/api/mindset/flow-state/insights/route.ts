import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import {
  avgFlowScore, flowPct, mostCommonStage, topTrigger,
  generateRecommendation, needsAttention,
} from '@/components/mindset/flow-logic'
import { FlowInsights, FlowLog, FlowSession } from '@/types'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const athleteId = searchParams.get('athlete_id')
  const targetId = athleteId || auth.userId

  const admin = createAdminClient()

  if (athleteId && athleteId !== auth.userId) {
    if (auth.role !== 'admin' && auth.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (auth.role === 'coach') {
      const { data: link } = await admin
        .from('coach_athletes')
        .select('id')
        .eq('coach_id', auth.userId)
        .eq('athlete_id', athleteId)
        .single()
      if (!link) return NextResponse.json({ error: 'Not your athlete' }, { status: 403 })
    }
  }

  const since7 = new Date(); since7.setDate(since7.getDate() - 7)
  const since14 = new Date(); since14.setDate(since14.getDate() - 14)

  const [{ data: logs7 }, { data: logs14 }, { data: sessions14 }] = await Promise.all([
    admin.from('flow_logs').select('*').eq('user_id', targetId).gte('logged_at', since7.toISOString()),
    admin.from('flow_logs').select('*').eq('user_id', targetId).gte('logged_at', since14.toISOString()),
    admin.from('flow_sessions').select('*').eq('user_id', targetId).gte('started_at', since14.toISOString()),
  ])

  const logs7Arr = (logs7 ?? []) as FlowLog[]
  const logs14Arr = (logs14 ?? []) as FlowLog[]
  const sessions14Arr = (sessions14 ?? []) as FlowSession[]

  let coachNote: string | null = null
  if (!athleteId || athleteId === auth.userId) {
    const { data: note } = await admin
      .from('flow_coach_notes')
      .select('note')
      .eq('athlete_id', targetId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    coachNote = note?.note ?? null
  } else if (auth.role === 'coach') {
    const { data: note } = await admin
      .from('flow_coach_notes')
      .select('note')
      .eq('athlete_id', targetId)
      .eq('coach_id', auth.userId)
      .maybeSingle()
    coachNote = note?.note ?? null
  }

  const insights: FlowInsights = {
    avg_flow_score: avgFlowScore(logs7Arr),
    flow_pct: flowPct(logs7Arr),
    most_common_stage: mostCommonStage(logs7Arr),
    top_trigger: topTrigger(logs7Arr),
    recommendation: generateRecommendation(logs14Arr, sessions14Arr),
    coach_note: coachNote,
    sessions_7d: sessions14Arr.filter(s => new Date(s.started_at) >= since7).length,
    logs_7d: logs7Arr.length,
  }

  const attention = needsAttention(logs14Arr, sessions14Arr)

  return NextResponse.json({ insights, needs_attention: attention })
}
