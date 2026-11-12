import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isPlainObject, oneOf } from '@/lib/validate'
import { macrosFromCalories } from '@/lib/nutrition'

const GOAL_TYPES = ['gain', 'lose', 'maintain'] as const
const ACTIVITY_LEVELS = ['light', 'moderate', 'high'] as const

function inRange(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : NaN
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', auth.userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return dbError(error)
  }
  return NextResponse.json(data || {
    calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65,
    mode: 'absolute', protein_pct: 30, carbs_pct: 40, fat_pct: 30,
    goal_type: null, activity_level: null, current_weight_lb: null, target_weight_lb: null,
    height_in: null, age: null, sex: null, protein_level: null,
    quiz_completed_at: null,
  })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()

  // Fields omitted from the payload fall back to the saved row, not
  // hardcoded defaults — otherwise saving in one mode silently resets
  // the other mode's values.
  const { data: existing } = await admin
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', auth.userId)
    .maybeSingle()

  const mode = oneOf(body.mode, ['absolute', 'percentage'] as const) ?? existing?.mode ?? 'absolute'
  const calories = clampNumber(body.calories ?? existing?.calories ?? 2000, 0, 20000) ?? 2000
  let protein_g = clampNumber(body.protein_g ?? existing?.protein_g ?? 150, 0, 2000) ?? 150
  let carbs_g = clampNumber(body.carbs_g ?? existing?.carbs_g ?? 250, 0, 2000) ?? 250
  let fat_g = clampNumber(body.fat_g ?? existing?.fat_g ?? 65, 0, 2000) ?? 65
  const protein_pct = clampNumber(body.protein_pct ?? existing?.protein_pct ?? 30, 0, 100) ?? 30
  const carbs_pct = clampNumber(body.carbs_pct ?? existing?.carbs_pct ?? 40, 0, 100) ?? 40
  const fat_pct = clampNumber(body.fat_pct ?? existing?.fat_pct ?? 30, 0, 100) ?? 30

  if (mode === 'percentage') {
    if (protein_pct + carbs_pct + fat_pct !== 100) {
      return NextResponse.json({ error: 'Macro percentages must sum to 100' }, { status: 400 })
    }
    ;({ protein_g, carbs_g, fat_g } = macrosFromCalories(calories, { protein_pct, carbs_pct, fat_pct }))
  }

  const quiz: Record<string, unknown> = {}
  const goalType = oneOf(body.goal_type, GOAL_TYPES)
  const activityLevel = oneOf(body.activity_level, ACTIVITY_LEVELS)
  if (goalType && activityLevel) {
    const cur = clampNumber(body.current_weight_lb, 50, 500)
    const target = clampNumber(body.target_weight_lb, 50, 500)
    if (cur == null || target == null) {
      return NextResponse.json({ error: 'Weights must be between 50 and 500 lb' }, { status: 400 })
    }
    // Height, age and sex are used only as a set; a partial set is stored as nulls.
    const height = inRange(body.height_in, 36, 96)
    const age = inRange(body.age, 10, 100)
    const sex = body.sex === 'male' || body.sex === 'female' ? body.sex : null
    const bodyComplete = height != null && age != null && sex != null
    Object.assign(quiz, {
      goal_type: goalType,
      activity_level: activityLevel,
      current_weight_lb: cur,
      target_weight_lb: target,
      height_in: bodyComplete ? height : null,
      age: bodyComplete ? age : null,
      sex: bodyComplete ? sex : null,
      protein_level: body.protein_level === 'high' || body.protein_level === 'standard' ? body.protein_level : null,
      quiz_completed_at: new Date().toISOString(),
    })
  } else if (body.current_weight_lb != null) {
    quiz.current_weight_lb = clampNumber(body.current_weight_lb, 50, 500)
  }

  const { data, error } = await admin
    .from('nutrition_goals')
    .upsert({
      user_id: auth.userId,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      mode,
      protein_pct,
      carbs_pct,
      fat_pct,
      ...quiz,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
