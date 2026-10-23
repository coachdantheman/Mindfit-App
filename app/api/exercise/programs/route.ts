import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, optionalString, requireString } from '@/lib/validate'

type Admin = ReturnType<typeof createAdminClient>

async function loadPrograms(admin: Admin, programIds: string[]) {
  if (programIds.length === 0) return []
  const [programsRes, blocksRes, workoutsRes] = await Promise.all([
    admin.from('training_programs').select('*').in('id', programIds).order('created_at', { ascending: false }),
    admin.from('program_blocks').select('*').in('program_id', programIds).order('sort_order'),
    admin.from('program_workouts').select('*').in('program_id', programIds).order('week_number').order('day_of_week').order('sort_order'),
  ])
  const blocks = blocksRes.data || []
  const workouts = workoutsRes.data || []
  return (programsRes.data || []).map(p => ({
    ...p,
    blocks: blocks
      .filter(b => b.program_id === p.id)
      .map(b => ({ ...b, workouts: workouts.filter(w => w.block_id === b.id) })),
  }))
}

// Inserts blocks + workouts; returns an error message on the first failure.
async function insertBlocks(admin: Admin, programId: string, blocks: any[]): Promise<string | null> {
  for (const [bi, block] of blocks.entries()) {
    const { data: blockData, error: bErr } = await admin
      .from('program_blocks')
      .insert({
        program_id: programId,
        name: optionalString(block.name, 80) ?? `Phase ${bi + 1}`,
        week_start: clampNumber(block.week_start, 1, 52) ?? 1,
        week_end: clampNumber(block.week_end, 1, 52) ?? 1,
        focus: optionalString(block.focus, 200),
        sort_order: block.sort_order ?? bi,
      })
      .select()
      .single()
    if (bErr || !blockData) return bErr?.message ?? 'block insert failed'

    const workouts: any[] = Array.isArray(block.workouts) ? block.workouts : []
    if (workouts.length === 0) continue
    const rows = workouts.map((w: any, i: number) => ({
      block_id: blockData.id,
      program_id: programId,
      day_of_week: clampNumber(w.day_of_week, 1, 7) ?? 1,
      week_number: clampNumber(w.week_number, 1, 52) ?? 1,
      name: optionalString(w.name, 80) ?? 'Workout',
      description: optionalString(w.description, 300),
      exercises: Array.isArray(w.exercises) ? w.exercises.slice(0, 40) : [],
      sort_order: i,
    }))
    const { error: wErr } = await admin.from('program_workouts').insert(rows)
    if (wErr) return wErr.message
  }
  return null
}

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') === 'true'

  const admin = createAdminClient()
  let query = admin.from('training_programs').select('id').eq('user_id', auth.userId)
  if (activeOnly) query = query.eq('is_active', true)
  const { data: ids, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = await loadPrograms(admin, (ids || []).map(p => p.id))
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const title = requireString(body.title, 120)
  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  const admin = createAdminClient()

  await admin
    .from('training_programs')
    .update({ is_active: false })
    .eq('user_id', auth.userId)
    .eq('is_active', true)

  const { data: program, error: pErr } = await admin
    .from('training_programs')
    .insert({
      user_id: auth.userId,
      created_by: auth.userId,
      title,
      sport: optionalString(body.sport, 60),
      goals: Array.isArray(body.goals) ? body.goals.slice(0, 10) : [],
      description: optionalString(body.description, 600),
      duration_weeks: clampNumber(body.duration_weeks, 1, 52) ?? 4,
      is_active: true,
      source: body.source === 'self' || body.source === 'ai' ? body.source : 'ai',
      start_date: isISODate(body.start_date) ? body.start_date : new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (pErr || !program) return NextResponse.json({ error: pErr?.message ?? 'insert failed' }, { status: 500 })

  const blocks: any[] = Array.isArray(body.blocks) ? body.blocks : []
  const failure = await insertBlocks(admin, program.id, blocks)
  if (failure) {
    await admin.from('training_programs').delete().eq('id', program.id)
    console.error('program insert failed, rolled back:', failure)
    return NextResponse.json({ error: "Couldn't save the plan. Nothing was saved — try again." }, { status: 500 })
  }

  const [full] = await loadPrograms(admin, [program.id])
  return NextResponse.json(full, { status: 201 })
}

// Edit title / dates / goals and, when `blocks` is sent, replace the whole
// schedule. Old workout_logs keep their name/date; program_workout_id is
// ON DELETE SET NULL.
export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : null
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: owned } = await admin
    .from('training_programs')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) {
    const t = requireString(body.title, 120)
    if (!t) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    patch.title = t
  }
  if (body.description !== undefined) patch.description = optionalString(body.description, 600)
  if (body.sport !== undefined) patch.sport = optionalString(body.sport, 60)
  if (Array.isArray(body.goals)) patch.goals = body.goals.slice(0, 10)
  if (body.duration_weeks !== undefined) patch.duration_weeks = clampNumber(body.duration_weeks, 1, 52) ?? 4
  if (body.start_date !== undefined) {
    if (!isISODate(body.start_date)) return NextResponse.json({ error: 'start_date must be YYYY-MM-DD' }, { status: 400 })
    patch.start_date = body.start_date
  }
  if (body.is_active === true) {
    await admin.from('training_programs').update({ is_active: false }).eq('user_id', auth.userId).eq('is_active', true)
    patch.is_active = true
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('training_programs').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Array.isArray(body.blocks)) {
    const { error: delErr } = await admin.from('program_blocks').delete().eq('program_id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    const failure = await insertBlocks(admin, id, body.blocks)
    if (failure) {
      console.error('program block replace failed:', failure)
      return NextResponse.json({ error: "Couldn't save the schedule. Re-open the plan and try again." }, { status: 500 })
    }
  }

  const [full] = await loadPrograms(admin, [id])
  return NextResponse.json(full)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('training_programs')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
