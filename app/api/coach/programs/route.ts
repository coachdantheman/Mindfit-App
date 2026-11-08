import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { clampNumber, optionalString, requireString } from '@/lib/validate'
import { insertBlocks, loadPrograms } from '@/lib/program-store'
import { currentWeek, isoDayOfWeek } from '@/lib/programs'

// The coach's plan library: every plan they built, who it's assigned to,
// and how far each athlete is (plan workouts logged vs. scheduled so far).
export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data: ids } = await admin.from('training_programs').select('id')
    .eq('created_by', auth.userId).eq('source', 'coach')
  const programs = await loadPrograms(admin, (ids ?? []).map(p => p.id))
  if (programs.length === 0) return NextResponse.json([])

  const { data: assignments } = await admin.from('coach_program_assignments')
    .select('program_id, athlete_id, start_date, assigned_at').in('program_id', programs.map(p => p.id))
  const athleteIds = [...new Set((assignments ?? []).map(a => a.athlete_id))]
  const workoutIds = programs.flatMap(p => p.blocks.flatMap((b: any) => b.workouts.map((w: any) => w.id)))
  const [{ data: people }, { data: logs }] = await Promise.all([
    athleteIds.length ? admin.from('profiles').select('id, full_name, email').in('id', athleteIds) : Promise.resolve({ data: [] as any[] }),
    athleteIds.length && workoutIds.length
      ? admin.from('workout_logs').select('user_id, program_workout_id').in('user_id', athleteIds).in('program_workout_id', workoutIds)
      : Promise.resolve({ data: [] as any[] }),
  ])
  const person = new Map((people ?? []).map(p => [p.id, p]))
  const today = new Date()

  return NextResponse.json(programs.map(p => {
    const workouts = p.blocks.flatMap((b: any) => b.workouts) as { id: string; week_number: number; day_of_week: number }[]
    const mine = new Set(workouts.map(w => w.id))
    const athletes = (assignments ?? []).filter(a => a.program_id === p.id).map(a => {
      const start = a.start_date ?? String(a.assigned_at).slice(0, 10)
      const { week, status } = currentWeek(start, p.duration_weeks, today)
      const dow = isoDayOfWeek(today)
      const due = status === 'upcoming' ? 0 : status === 'complete' ? workouts.length
        : workouts.filter(w => w.week_number < week || (w.week_number === week && w.day_of_week <= dow)).length
      const done = new Set((logs ?? []).filter(l => l.user_id === a.athlete_id && mine.has(l.program_workout_id)).map(l => l.program_workout_id)).size
      const who = person.get(a.athlete_id)
      return { id: a.athlete_id, full_name: who?.full_name ?? null, email: who?.email ?? '', start_date: start, done, due, total: workouts.length }
    })
    return { ...p, athletes }
  }))
}

// Save a plan to the library. Assigning is a separate step.
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const body = await req.json().catch(() => ({}))

  // Duplicate an existing library plan.
  if (typeof body.duplicate_of === 'string') {
    const [src] = await loadPrograms(admin, [body.duplicate_of])
    if (!src || src.created_by !== auth.userId) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    const { data: copy, error } = await admin.from('training_programs').insert({
      user_id: auth.userId, created_by: auth.userId, title: `${src.title} (copy)`.slice(0, 120),
      description: src.description, sport: src.sport, goals: src.goals ?? [], duration_weeks: src.duration_weeks,
      is_active: false, source: 'coach',
    }).select().single()
    if (error || !copy) return NextResponse.json({ error: error?.message ?? 'Copy failed' }, { status: 500 })
    const failure = await insertBlocks(admin, copy.id, src.blocks)
    if (failure) { await admin.from('training_programs').delete().eq('id', copy.id); return NextResponse.json({ error: failure }, { status: 500 }) }
    const [full] = await loadPrograms(admin, [copy.id])
    return NextResponse.json({ ...full, athletes: [] }, { status: 201 })
  }

  const title = requireString(body.title, 120)
  if (!title) return NextResponse.json({ error: 'Give the plan a name.' }, { status: 400 })
  const blocks: any[] = Array.isArray(body.blocks) ? body.blocks : []
  if (blocks.length === 0) return NextResponse.json({ error: 'Add at least one training day.' }, { status: 400 })

  const { data: program, error } = await admin.from('training_programs').insert({
    user_id: auth.userId, created_by: auth.userId, title,
    description: optionalString(body.description, 600), sport: optionalString(body.sport, 60),
    goals: Array.isArray(body.goals) ? body.goals.slice(0, 10) : [],
    duration_weeks: clampNumber(body.duration_weeks, 1, 52) ?? 4, is_active: false, source: 'coach',
  }).select().single()
  if (error || !program) return NextResponse.json({ error: error?.message ?? 'Could not save the plan' }, { status: 500 })

  const failure = await insertBlocks(admin, program.id, blocks)
  if (failure) {
    await admin.from('training_programs').delete().eq('id', program.id)
    return NextResponse.json({ error: "Couldn't save the plan. Nothing was saved — try again." }, { status: 500 })
  }
  const [full] = await loadPrograms(admin, [program.id])
  return NextResponse.json({ ...full, athletes: [] }, { status: 201 })
}

// Edit a library plan. Every athlete it's assigned to sees the change.
export async function PUT(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data: owned } = await admin.from('training_programs').select('id').eq('id', body.id).eq('created_by', auth.userId).eq('source', 'coach').maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const title = requireString(body.title, 120)
  if (!title) return NextResponse.json({ error: 'Give the plan a name.' }, { status: 400 })
  const { error } = await admin.from('training_programs').update({
    title, description: optionalString(body.description, 600), sport: optionalString(body.sport, 60),
    goals: Array.isArray(body.goals) ? body.goals.slice(0, 10) : [],
    duration_weeks: clampNumber(body.duration_weeks, 1, 52) ?? 4,
  }).eq('id', body.id)
  if (error) return dbError(error)

  if (Array.isArray(body.blocks)) {
    await admin.from('program_blocks').delete().eq('program_id', body.id)
    const failure = await insertBlocks(admin, body.id, body.blocks)
    if (failure) return NextResponse.json({ error: "Couldn't save the schedule. Re-open the plan and try again." }, { status: 500 })
  }
  const [full] = await loadPrograms(admin, [body.id])
  return NextResponse.json(full)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await req.json().catch(() => ({}))
  const admin = createAdminClient()
  await admin.from('training_programs').delete().eq('id', id).eq('created_by', auth.userId).eq('source', 'coach')
  return NextResponse.json({ success: true })
}
