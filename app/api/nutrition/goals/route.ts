import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber } from '@/lib/validate'
import { macrosFromCalories } from '@/lib/nutrition'

const GOAL_TYPES = ['gain', 'lose', 'maintain']
const ACTIVITY_LEVELS = ['light', 'moderate', 'high']

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data || {
    calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65,
    mode: 'absolute', protein_pct: 30, carbs_pct: 40, fat_pct: 30,
    goal_type: null, activity_level: null, current_weight_lb: null, target_weight_lb: null,
    quiz_completed_at: null,
  })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  // Fields omitted from the payload fall back to the saved row, not
  // hardcoded defaults — otherwise saving in one mode silently resets
  // the other mode's values.
  const { data: existing } = await admin
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', auth.userId)
    .maybeSingle()

  const mode = body.mode || existing?.mode || 'absolute'
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
  const hasQuiz = GOAL_TYPES.includes(body.goal_type) && ACTIVITY_LEVELS.includes(body.activity_level)
  if (hasQuiz) {
    const cur = clampNumber(body.current_weight_lb, 50, 500)
    const target = clampNumber(body.target_weight_lb, 50, 500)
    if (cur == null || target == null) {
      return NextResponse.json({ error: 'Weights must be between 50 and 500 lb' }, { status: 400 })
    }
    Object.assign(quiz, {
      goal_type: body.goal_type,
      activity_level: body.activity_level,
      current_weight_lb: cur,
      target_weight_lb: target,
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
