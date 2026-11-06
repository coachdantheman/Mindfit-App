import type { SupabaseClient } from '@supabase/supabase-js'
import { clampNumber, optionalString } from '@/lib/validate'

type Admin = SupabaseClient

export async function loadPrograms(admin: Admin, programIds: string[]) {
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
export async function insertBlocks(admin: Admin, programId: string, blocks: any[]): Promise<string | null> {
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

