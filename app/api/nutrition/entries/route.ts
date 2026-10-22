import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, optionalString, requireString } from '@/lib/validate'
import { MEALS, caloriesFromMacros, groupEntriesByDay, localDateISO, scaleFood, shiftDate } from '@/lib/nutrition'

const MAX_SPAN_DAYS = 190

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const days = searchParams.get('days')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const summary = searchParams.get('summary') === '1'

  const admin = createAdminClient()
  let query = admin
    .from('food_entries')
    .select(summary ? 'entry_date, calories, protein_g, carbs_g, fat_g' : '*')
    .eq('user_id', auth.userId)

  if (date) {
    query = query.eq('entry_date', date).order('created_at', { ascending: true })
  } else if (isISODate(from) && isISODate(to)) {
    query = query.gte('entry_date', from).lte('entry_date', to)
      .order('entry_date', { ascending: false }).order('created_at', { ascending: true })
      .limit(summary ? 6000 : 2000)
  } else if (days) {
    const n = clampNumber(days, 1, MAX_SPAN_DAYS) ?? 30
    query = query
      .gte('entry_date', shiftDate(localDateISO(new Date()), -n))
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(summary ? 6000 : 2000)
  } else {
    // Default: today only (preserves existing behaviour for the Nutrition tab)
    query = query.eq('entry_date', localDateISO(new Date())).order('created_at', { ascending: true })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (summary) return NextResponse.json(groupEntriesByDay(data as never))
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const food_name = requireString(body.food_name, 120)
  if (!food_name) return NextResponse.json({ error: 'Food name required' }, { status: 400 })
  const meal_name = (MEALS as readonly string[]).includes(body.meal_name) ? body.meal_name : 'Snack'
  const entry_date = isISODate(body.entry_date) ? body.entry_date : localDateISO(new Date())
  const servings = clampNumber(body.servings ?? 1, 0.1, 50) ?? 1

  const admin = createAdminClient()
  let food_id: string | null = null
  let serving_size = optionalString(body.serving_size, 60)
  let macros = {
    calories: clampNumber(body.calories ?? 0, 0, 20000) ?? 0,
    protein_g: clampNumber(body.protein_g ?? 0, 0, 2000) ?? 0,
    carbs_g: clampNumber(body.carbs_g ?? 0, 0, 2000) ?? 0,
    fat_g: clampNumber(body.fat_g ?? 0, 0, 2000) ?? 0,
  }

  if (typeof body.food_id === 'string' && body.food_id) {
    const { data: food } = await admin
      .from('foods')
      .select('id, serving_size, calories, protein_g, carbs_g, fat_g, user_id')
      .eq('id', body.food_id)
      .maybeSingle()
    if (food && (food.user_id === null || food.user_id === auth.userId)) {
      food_id = food.id
      serving_size = serving_size ?? food.serving_size
      if (body.calories == null && body.protein_g == null) macros = scaleFood(food, servings)
    }
  }

  const calculatedCal = caloriesFromMacros(macros)
  if (!macros.calories) macros.calories = calculatedCal

  let warning: string | undefined
  if (body.calories && calculatedCal > 0 && Math.abs(macros.calories - calculatedCal) / calculatedCal > 0.1) {
    warning = `Entered ${macros.calories} cal but macros add up to ${calculatedCal} cal`
  }

  const { data, error } = await admin
    .from('food_entries')
    .insert({ user_id: auth.userId, entry_date, meal_name, food_name, food_id, servings, serving_size, ...macros })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, warning }, { status: 201 })
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('food_entries')
    .select('*')
    .eq('id', body.id)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if ((MEALS as readonly string[]).includes(body.meal_name)) updates.meal_name = body.meal_name
  const food_name = optionalString(body.food_name, 120)
  if (food_name) updates.food_name = food_name

  if (body.servings != null) {
    const servings = clampNumber(body.servings, 0.1, 50) ?? existing.servings
    updates.servings = servings
    let perServing = null
    if (existing.food_id) {
      const { data: food } = await admin.from('foods').select('calories, protein_g, carbs_g, fat_g').eq('id', existing.food_id).maybeSingle()
      perServing = food
    }
    const scaled = perServing
      ? scaleFood(perServing, servings)
      : scaleFood(existing, servings / Number(existing.servings || 1))
    Object.assign(updates, scaled)
  }

  for (const k of ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const) {
    if (body[k] != null) updates[k] = clampNumber(body[k], 0, 20000) ?? existing[k]
  }

  const { data, error } = await admin
    .from('food_entries')
    .update(updates)
    .eq('id', body.id)
    .eq('user_id', auth.userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin
    .from('food_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
