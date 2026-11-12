import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { calcStreak } from '@/lib/streaks'
import { latestOf } from '@/lib/last-seen'
import { chunk, fetchAll } from '@/lib/fetch-all'

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

function computeFlags(o: OverviewRow, lastSeenAt: string | null): string[] {
  const flags: string[] = []
  const week = 7 * 24 * 60 * 60 * 1000
  const latest = latestOf(o.last_journal_date, o.last_flow_at, lastSeenAt)
  if (!latest || Date.now() - new Date(latest).getTime() >= week) flags.push('inactive_7d')
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

  const readProfiles = (ids?: string[]) => fetchAll(async (from, to) => {
    let q = admin.from('profiles').select('*, journal_entries(count)')
    if (ids) q = q.in('id', ids)
    return q
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
  })

  let profileLists: any[][]
  let overviewRows: any[]
  try {
    [profileLists, overviewRows] = await Promise.all([
      auth.role === 'coach'
        ? Promise.all(chunk(athleteIds, 100).map(ids => readProfiles(ids)))
        : readProfiles().then(list => [list]),
      // Streak and MPI extras are optional: the roster still loads without them.
      fetchAll<any>(async (from, to) => admin
        .rpc('get_coach_athlete_overview', {
          p_coach_id: auth.role === 'coach' ? auth.userId : null,
        })
        .order('athlete_id', { ascending: true })
        .range(from, to)).catch(() => []),
    ])
  } catch (e: any) {
    return dbError({ message: e?.message })
  }

  const profiles = profileLists.flat().sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.id.localeCompare(b.id))

  // The RPC only exists after migration v13 — degrade gracefully without it.
  const overviewMap = new Map<string, OverviewRow>(
    (overviewRows as OverviewRow[]).map(o => [o.athlete_id, o])
  )

  const athletes = (profiles ?? []).map((p: any) => {
    const o = overviewMap.get(p.id)
    return {
      ...p,
      entry_count: p.journal_entries?.[0]?.count ?? 0,
      journal_entries: undefined,
      status: !p.onboarded_at && p.invited_by ? 'invited' : 'active',
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
            flags: computeFlags(o, p.last_seen_at ?? null),
          }
        : null,
    }
  })

  // Most recently used first; never-used (invited) athletes last.
  athletes.sort((a: any, b: any) => (b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0) - (a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0))

  return NextResponse.json(athletes)
}
