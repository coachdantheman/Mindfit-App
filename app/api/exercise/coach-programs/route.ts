import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()

  // Get assignments for this athlete
  const { data: assignments } = await admin
    .from('coach_program_assignments')
    .select('program_id, label, coach_id')
    .eq('athlete_id', auth.userId)

  if (!assignments || assignments.length === 0) {
    return NextResponse.json([])
  }

  const programIds = assignments.map(a => a.program_id)

  // Fetch programs
  const { data: programs } = await admin
    .from('training_programs')
    .select('*')
    .in('id', programIds)

  if (!programs) return NextResponse.json([])

  // Fetch all blocks and workouts
  const { data: blocks } = await admin
    .from('program_blocks')
    .select('*')
    .in('program_id', programIds)
    .order('sort_order')

  const { data: workouts } = await admin
    .from('program_workouts')
    .select('*')
    .in('program_id', programIds)
    .order('sort_order')

  // Get coach names
  const coachIds = [...new Set(assignments.map(a => a.coach_id))]
  const { data: coaches } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', coachIds)

  const coachMap = new Map((coaches || []).map(c => [c.id, c.full_name || c.email]))

  // Assemble response
  const result = programs.map(p => {
    const assignment = assignments.find(a => a.program_id === p.id)
    const pBlocks = (blocks || []).filter(b => b.program_id === p.id)
    const pWorkouts = (workouts || []).filter(w => w.program_id === p.id)

    return {
      ...p,
      label: assignment?.label || p.title,
      coach_name: coachMap.get(assignment?.coach_id || '') || 'Coach',
      blocks: pBlocks.map(b => ({
        ...b,
        workouts: pWorkouts.filter(w => w.block_id === b.id),
      })),
    }
  })

  return NextResponse.json(result)
}
