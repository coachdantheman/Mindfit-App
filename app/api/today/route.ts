import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { isISODate } from '@/lib/validate'
import { MPI_DIMENSIONS } from '@/lib/mpi'
import { DAILY_FOCUS, MPI_TO_NEED, NEED_LABELS, NEEDS, type Need } from '@/lib/quiz'

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000)
}

const DIM_COLS = MPI_DIMENSIONS.map(d => d.key).join(', ')

// Quiz need first; otherwise the lowest MPI dimension of the latest assessment.
function focusNeed(quizNeed: string | null | undefined, weekly: Record<string, number | null> | null): { need: Need; from: 'quiz' | 'mpi' } | null {
  if (quizNeed && (NEEDS as string[]).includes(quizNeed)) return { need: quizNeed as Need, from: 'quiz' }
  let low: { key: string; value: number } | null = null
  for (const d of MPI_DIMENSIONS) {
    const v = weekly?.[d.key]
    if (typeof v === 'number' && (!low || v < low.value)) low = { key: d.key, value: v }
  }
  const need = low ? MPI_TO_NEED[low.key] : undefined
  return need ? { need, from: 'mpi' } : null
}

// GET /api/today?date=YYYY-MM-DD — the Today card: check-in, pillars, one affirmation
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const date = new URL(req.url).searchParams.get('date')
  if (!isISODate(date)) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 })

  // The athlete's local day as UTC instants, for tables stamped with a time.
  const params = new URL(req.url).searchParams
  const instant = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null)
  const dayStart = instant(params.get('from')) ?? `${date}T00:00:00Z`
  const dayEnd = instant(params.get('to')) ?? `${shiftDate(date, 1)}T00:00:00Z`
  const uid = auth.userId
  const night = shiftDate(date, -1)
  const exists = { head: true, count: 'exact' as const }
  const admin = createAdminClient()

  const [journal, sleep, gratitude, visualization, flow, workout, practice, food, recovery, affirmations, quizResult, weeklyResult, recentJournal, routineRows] = await Promise.all([
    admin.from('journal_entries')
      .select('objective, objective_result, action_step_1, strength_1, weakness, rating_motivation, rating_focus, rating_confidence, rating_anxiety')
      .eq('user_id', uid).eq('entry_date', date).maybeSingle(),
    admin.from('sleep_entries')
      .select('hours_slept, sleep_quality, bedtime, wake_time, notes')
      .eq('user_id', uid).eq('entry_date', night).maybeSingle(),
    admin.from('gratitude_entries').select('id', exists).eq('user_id', uid).eq('entry_date', date).limit(1),
    admin.from('visualization_entries').select('id', exists).eq('user_id', uid).eq('entry_date', date).limit(1),
    admin.from('flow_logs').select('id', exists).eq('user_id', uid)
      .gte('logged_at', dayStart).lt('logged_at', dayEnd).limit(1),
    admin.from('workout_logs').select('id', exists).eq('user_id', uid).eq('log_date', date).limit(1),
    admin.from('practice_logs').select('id', exists).eq('user_id', uid).eq('log_date', date).limit(1),
    admin.from('food_entries').select('id', exists).eq('user_id', uid).eq('entry_date', date).limit(1),
    admin.from('recovery_entries').select('id', exists).eq('user_id', uid).eq('entry_date', date).limit(1),
    admin.from('affirmations').select('text').eq('user_id', uid).eq('is_active', true).order('sort_order', { ascending: true }),
    admin.from('quiz_results').select('top_need').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('weekly_assessments').select(DIM_COLS).eq('user_id', uid).order('week_date', { ascending: false }).limit(1).maybeSingle(),
    admin.from('journal_entries')
      .select('rating_motivation, rating_focus, rating_confidence, rating_anxiety')
      .eq('user_id', uid).lt('entry_date', date).gte('entry_date', shiftDate(date, -14)).order('entry_date', { ascending: false }).limit(3),
    admin.from('routine_logs').select('kind').eq('user_id', uid).eq('day', date),
  ])

  const failed = [journal, sleep, gratitude, visualization, flow, workout, practice, food, recovery, affirmations, quizResult, weeklyResult, recentJournal, routineRows].find(r => r.error)
  if (failed?.error) return dbError(failed.error)

  const j = journal.data
  const s = sleep.data
  const list = affirmations.data ?? []
  const earlier = recentJournal.data ?? []
  const avg = (key: 'rating_motivation' | 'rating_focus' | 'rating_confidence' | 'rating_anxiety') =>
    Math.round((earlier.reduce((sum, e) => sum + e[key], 0) / earlier.length) * 10) / 10
  const recent = earlier.length ? {
    motivation: avg('rating_motivation'),
    focus: avg('rating_focus'),
    confidence: avg('rating_confidence'),
    anxiety: avg('rating_anxiety'),
  } : null
  const kinds = new Set((routineRows.data ?? []).map(r => r.kind))
  const picked = focusNeed(quizResult.data?.top_need, weeklyResult.data as Record<string, number | null> | null)
  const focus = picked ? {
    need: picked.need,
    label: NEED_LABELS[picked.need],
    action: DAILY_FOCUS[picked.need][dayOfYear(date) % 5],
    from: picked.from,
  } : null

  return NextResponse.json({
    journal: j ? {
      objective: j.objective,
      rating_motivation: j.rating_motivation,
      rating_focus: j.rating_focus,
      rating_confidence: j.rating_confidence,
      rating_anxiety: j.rating_anxiety,
      quick: !j.action_step_1?.trim() && !j.strength_1?.trim() && !j.weakness?.trim(),
      objective_result: j.objective_result ?? null,
    } : null,
    sleep: s ? {
      hours_slept: s.hours_slept,
      sleep_quality: s.sleep_quality,
      bedtime: s.bedtime,
      wake_time: s.wake_time,
      notes: s.notes,
    } : null,
    pillars: {
      mind: !!j || (gratitude.count ?? 0) > 0 || (visualization.count ?? 0) > 0 || (flow.count ?? 0) > 0,
      body: (workout.count ?? 0) > 0 || (practice.count ?? 0) > 0,
      fuel: (food.count ?? 0) > 0,
      rest: !!s || (recovery.count ?? 0) > 0,
    },
    affirmation: list.length ? list[dayOfYear(date) % list.length].text : null,
    focus,
    recent,
    routines: { morning: kinds.has('morning'), night: kinds.has('night') },
  })
}
