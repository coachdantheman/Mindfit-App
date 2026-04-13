import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') === 'true'

  const admin = createAdminClient()
  let query = admin
    .from('training_programs')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (activeOnly) query = query.eq('is_active', true)

  const { data: programs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch blocks and workouts for each program
  const programIds = (programs || []).map(p => p.id)
  if (programIds.length === 0) return NextResponse.json([])

  const [blocksRes, workoutsRes] = await Promise.all([
    admin.from('program_blocks').select('*').in('program_id', programIds).order('sort_order'),
    admin.from('program_workouts').select('*').in('program_id', programIds).order('week_number').order('day_of_week'),
  ])

  const blocks = blocksRes.data || []
  const workouts = workoutsRes.data || []

  const result = (programs || []).map(p => ({
    ...p,
    blocks: blocks
      .filter(b => b.program_id === p.id)
      .map(b => ({
        ...b,
        workouts: workouts.filter(w => w.block_id === b.id),
      })),
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  // Deactivate any existing active programs
  await admin
    .from('training_programs')
    .update({ is_active: false })
    .eq('user_id', auth.userId)
    .eq('is_active', true)

  // Create program
  const { data: program, error: pErr } = await admin
    .from('training_programs')
    .insert({
      user_id: auth.userId,
      created_by: auth.userId,
      title: body.title,
      sport: body.sport || null,
      goals: body.goals || [],
      description: body.description || null,
      duration_weeks: body.duration_weeks || 4,
      is_active: true,
      source: body.source || 'ai',
    })
    .select()
    .single()

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // Create blocks
  if (body.blocks?.length) {
    for (const block of body.blocks) {
      const { data: blockData, error: bErr } = await admin
        .from('program_blocks')
        .insert({
          program_id: program.id,
          name: block.name,
          week_start: block.week_start,
          week_end: block.week_end,
          focus: block.focus || null,
          sort_order: block.sort_order ?? 0,
        })
        .select()
        .single()

      if (bErr) continue

      // Create workouts for this block
      if (block.workouts?.length) {
        const workoutRows = block.workouts.map((w: any, i: number) => ({
          block_id: blockData.id,
          program_id: program.id,
          day_of_week: w.day_of_week,
          week_number: w.week_number,
          name: w.name,
          description: w.description || null,
          exercises: w.exercises || [],
          sort_order: i,
        }))
        await admin.from('program_workouts').insert(workoutRows)
      }
    }
  }

  // Fetch full program with nested data
  const { data: full } = await admin
    .from('training_programs')
    .select('*')
    .eq('id', program.id)
    .single()

  return NextResponse.json(full, { status: 201 })
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
