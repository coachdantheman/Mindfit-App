import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { calcStreak } from '@/lib/streaks'

interface OverviewRow {
  athlete_id: string
  last_journal_date: string | null
  journal_count_7d: number
  journal_dates_30d: string[] | null
  last_flow_at: string | null
  avg_confidence_3: number | null
  avg_anxiety_3: number | null
  latest_mpi: number | null
  baseline_mpi: number | null
}

function computeFlags(o: OverviewRow): string[] {
  const flags: string[] = []
  const week = 7 * 24 * 60 * 60 * 1000
  const journalRecent = o.last_journal_date && Date.now() - new Date(o.last_journal_date).getTime() < week
  const flowRecent = o.last_flow_at && Date.now() - new Date(o.last_flow_at).getTime() < week
  if (!journalRecent && !flowRecent) flags.push('inactive_7d')
  if (o.avg_confidence_3 !== null && o.avg_confidence_3 <= 4) flags.push('low_confidence')
  if (o.avg_anxiety_3 !== null && o.avg_anxiety_3 >= 7) flags.push('high_anxiety')
  if (o.latest_mpi !== null && o.baseline_mpi !== null && o.latest_mpi <= o.baseline_mpi - 5) flags.push('mpi_drop')
  return flags
}

export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()

  let athleteIds: string[] = []

  if (auth.role === 'coach') {
    const { data: links } = await admin
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_id', auth.userId)
    athleteIds = (links ?? []).map((l: any) => l.athlete_id)
  }

  if (auth.role === 'coach' && athleteIds.length === 0) {
    return NextResponse.json([])
  }

  let query = admin
    .from('profiles')
    .select('*, journal_entries(count)')
    .order('created_at', { ascending: false })

  if (auth.role === 'coach') {
    query = query.in('id', athleteIds)
  }

  const [{ data: profiles, error }, overviewRes] = await Promise.all([
    query,
    admin.rpc('get_coach_athlete_overview', {
      p_coach_id: auth.role === 'coach' ? auth.userId : null,
    }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The RPC only exists after migration v13 — degrade gracefully without it.
  const overviewMap = new Map<string, OverviewRow>(
    ((overviewRes.data as OverviewRow[]) ?? []).map(o => [o.athlete_id, o])
  )

  const athletes = (profiles ?? []).map((p: any) => {
    const o = overviewMap.get(p.id)
    return {
      ...p,
      entry_count: p.journal_entries?.[0]?.count ?? 0,
      journal_entries: undefined,
      overview: o
        ? {
            last_journal_date: o.last_journal_date,
            last_flow_at: o.last_flow_at,
            journal_count_7d: o.journal_count_7d,
            streak: calcStreak(o.journal_dates_30d ?? []),
            avg_confidence_3: o.avg_confidence_3,
            avg_anxiety_3: o.avg_anxiety_3,
            latest_mpi: o.latest_mpi,
            baseline_mpi: o.baseline_mpi,
            flags: computeFlags(o),
          }
        : null,
    }
  })

  return NextResponse.json(athletes)
}
