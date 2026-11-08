import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, optionalString, requireString } from '@/lib/validate'
import { insertBlocks, loadPrograms } from '@/lib/program-store'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') === 'true'

  const admin = createAdminClient()
  let query = admin.from('training_programs').select('id').eq('user_id', auth.userId)
  if (activeOnly) query = query.eq('is_active', true)
  const { data: ids, error } = await query
  if (error) return dbError(error)

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
    if (error) return dbError(error)
  }

  if (Array.isArray(body.blocks)) {
    const { error: delErr } = await admin.from('program_blocks').delete().eq('program_id', id)
    if (delErr) return dbError(delErr)
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

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
