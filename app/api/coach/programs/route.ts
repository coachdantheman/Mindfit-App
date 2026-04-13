import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()

  const { data: programs } = await admin
    .from('training_programs')
    .select('*')
    .eq('created_by', auth.userId)
    .eq('source', 'coach')
    .order('created_at', { ascending: false })

  if (!programs) return NextResponse.json([])

  // Load blocks and workouts for each program
  const result = await Promise.all(
    programs.map(async (p) => {
      const { data: blocks } = await admin
        .from('program_blocks')
        .select('*')
        .eq('program_id', p.id)
        .order('sort_order')
      const { data: workouts } = await admin
        .from('program_workouts')
        .select('*')
        .eq('program_id', p.id)
        .order('sort_order')

      const { data: assignments } = await admin
        .from('coach_program_assignments')
        .select('athlete_id')
        .eq('program_id', p.id)

      return {
        ...p,
        athlete_count: assignments?.length || 0,
        blocks: (blocks || []).map(b => ({
          ...b,
          workouts: (workouts || []).filter(w => w.block_id === b.id),
        })),
      }
    })
  )

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { title, description, label, sport, duration_weeks, blocks } = body

  if (!title || !blocks?.length) {
    return NextResponse.json({ error: 'Title and at least one block required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create the program
  const { data: program, error: progErr } = await admin
    .from('training_programs')
    .insert({
      user_id: auth.userId,
      created_by: auth.userId,
      title,
      description: description || null,
      sport: sport || null,
      goals: [],
      duration_weeks: duration_weeks || 4,
      is_active: false,
      source: 'coach',
    })
    .select()
    .single()

  if (progErr || !program) {
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }

  // Create blocks and workouts
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]
    const { data: blk } = await admin
      .from('program_blocks')
      .insert({
        program_id: program.id,
        name: block.name || `Phase ${bi + 1}`,
        week_start: block.week_start || bi * 4 + 1,
        week_end: block.week_end || (bi + 1) * 4,
        focus: block.focus || null,
        sort_order: bi,
      })
      .select()
      .single()

    if (blk && block.workouts) {
      for (let wi = 0; wi < block.workouts.length; wi++) {
        const w = block.workouts[wi]
        await admin.from('program_workouts').insert({
          block_id: blk.id,
          program_id: program.id,
          day_of_week: w.day_of_week || 1,
          week_number: w.week_number || 1,
          name: w.name || 'Workout',
          description: w.description || null,
          exercises: w.exercises || [],
          sort_order: wi,
        })
      }
    }
  }

  // Assign to all athletes
  const { data: athleteLinks } = await admin
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', auth.userId)

  if (athleteLinks && athleteLinks.length > 0) {
    const assignments = athleteLinks.map(l => ({
      program_id: program.id,
      athlete_id: l.athlete_id,
      coach_id: auth.userId,
      label: label || title,
    }))
    await admin.from('coach_program_assignments').insert(assignments)
  }

  return NextResponse.json({ ...program, athlete_count: athleteLinks?.length || 0 }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()

  await admin
    .from('training_programs')
    .delete()
    .eq('id', id)
    .eq('created_by', auth.userId)

  return NextResponse.json({ success: true })
}
