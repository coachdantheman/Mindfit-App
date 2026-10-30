import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { requireString, optionalString } from '@/lib/validate'

const ITEM_COLS = 'id, saved_meal_id, food_id, food_name, serving_size, servings, calories, protein_g, carbs_g, fat_g, sort_order'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data: meals, error } = await admin
    .from('saved_meals')
    .select('id, name, default_meal_name, auto_saved, created_at')
    .eq('user_id', auth.userId)
    .order('auto_saved', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!meals || meals.length === 0) return NextResponse.json([])

  const { data: items, error: itemErr } = await admin
    .from('saved_meal_items')
    .select(ITEM_COLS)
    .in('saved_meal_id', meals.map(m => m.id))
    .order('sort_order', { ascending: true })
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  return NextResponse.json(meals.map(m => ({
    ...m,
    items: (items ?? []).filter(i => i.saved_meal_id === m.id).map(({ saved_meal_id: _omit, ...rest }) => rest),
  })))
}

type Item = { food_id: string | null; food_name: string; servings: number }
const fingerprint = (items: Item[]) =>
  items.map(i => `${i.food_id ?? i.food_name.toLowerCase()}|${Number(i.servings)}`).sort().join(';')

// Save a set of logged food_entries as a named meal. With `auto: true` the
// app is saving on the athlete's behalf: the name defaults to the slot and
// date, and a meal with the same items is not saved twice.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const auto = body.auto === true
  const mealName = optionalString(body.meal_name, 40)
  const name = requireString(body.name, 80) ?? (auto && mealName ? `${mealName} · ${optionalString(body.entry_date, 10) ?? ''}`.trim() : null)
  const ids: string[] = Array.isArray(body.entry_ids) ? body.entry_ids.filter((x: unknown) => typeof x === 'string').slice(0, 40) : []
  if (!name || ids.length === 0) return NextResponse.json({ error: 'name and entry_ids required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: entries, error: readErr } = await admin
    .from('food_entries')
    .select('food_id, food_name, serving_size, servings, calories, protein_g, carbs_g, fat_g, created_at')
    .eq('user_id', auth.userId)
    .in('id', ids)
    .order('created_at', { ascending: true })
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!entries || entries.length === 0) return NextResponse.json({ error: 'No entries found.' }, { status: 400 })

  if (auto) {
    const { data: existing } = await admin
      .from('saved_meals')
      .select('id, saved_meal_items(food_id, food_name, servings)')
      .eq('user_id', auth.userId)
    const fp = fingerprint(entries)
    const dupe = (existing ?? []).find((m: any) => fingerprint(m.saved_meal_items ?? []) === fp)
    if (dupe) return NextResponse.json({ duplicate: true, id: dupe.id })
  }

  const { data: meal, error } = await admin
    .from('saved_meals')
    .insert({ user_id: auth.userId, name, default_meal_name: mealName, auto_saved: auto })
    .select('id, name, default_meal_name, auto_saved, created_at')
    .single()
  if (error || !meal) return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })

  const { data: items, error: itemErr } = await admin
    .from('saved_meal_items')
    .insert(entries.map(({ created_at: _c, ...e }, i) => ({ ...e, saved_meal_id: meal.id, sort_order: i })))
    .select(ITEM_COLS)
  if (itemErr) {
    await admin.from('saved_meals').delete().eq('id', meal.id)
    return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json({ ...meal, items: (items ?? []).map(({ saved_meal_id: _omit, ...rest }) => rest) }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('saved_meals').delete().eq('id', id).eq('user_id', auth.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
