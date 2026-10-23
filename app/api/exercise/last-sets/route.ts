import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { bestE1rm } from '@/lib/strength'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface LastSets {
  date: string
  workout_log_id: string | null
  sets: { set_number: number; reps: number | null; weight: number | null; rpe: number | null }[]
  best: number   // best e1RM across the fetched history (0 when none)
}

// Most recent session's sets per exercise. Keyed by exercise_id for linked
// exercises (`exercise_ids=a,b`) and by name for unlinked ones (`names=`).
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const ids = (searchParams.get('exercise_ids') ?? '').split(',').map(s => s.trim()).filter(s => UUID_RE.test(s)).slice(0, 40)
  const names = (searchParams.get('names') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 40)
  if (ids.length === 0 && names.length === 0) return NextResponse.json({})

  const admin = createAdminClient()
  const select = 'exercise_id, exercise_name, workout_log_id, set_number, reps, weight, rpe, created_at'
  const [byId, byName] = await Promise.all([
    ids.length
      ? admin.from('exercise_logs').select(select).eq('user_id', auth.userId).in('exercise_id', ids).order('created_at', { ascending: false }).limit(800)
      : Promise.resolve({ data: [] as any[] }),
    names.length
      ? admin.from('exercise_logs').select(select).eq('user_id', auth.userId).is('exercise_id', null).in('exercise_name', names).order('created_at', { ascending: false }).limit(800)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const out: Record<string, LastSets> = {}
  const history: Record<string, { reps: number | null; weight: number | null }[]> = {}
  const pick = (rows: any[], keyOf: (r: any) => string) => {
    for (const r of rows) {
      const key = keyOf(r)
      const weight = r.weight == null ? null : Number(r.weight)
      ;(history[key] ||= []).push({ reps: r.reps, weight })
      const sessionKey = r.workout_log_id ?? `day:${String(r.created_at).slice(0, 10)}`
      if (!out[key]) {
        out[key] = { date: String(r.created_at).slice(0, 10), workout_log_id: r.workout_log_id ?? null, sets: [], best: 0 }
      }
      const curKey = out[key].workout_log_id ?? `day:${out[key].date}`
      if (curKey !== sessionKey) continue
      out[key].sets.push({ set_number: r.set_number, reps: r.reps, weight, rpe: r.rpe })
    }
  }
  pick(byId.data ?? [], r => r.exercise_id)
  pick(byName.data ?? [], r => r.exercise_name)
  for (const [k, v] of Object.entries(out)) {
    v.sets.sort((a, b) => a.set_number - b.set_number)
    v.best = bestE1rm(history[k] ?? [])
  }

  return NextResponse.json(out)
}
