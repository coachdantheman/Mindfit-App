import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate, isPlainObject, isUUID, oneOf } from '@/lib/validate'
import { MEALS } from '@/lib/nutrition'

// Log every item of a saved meal to a date + meal slot.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.saved_meal_id) || !isISODate(body.entry_date) || !oneOf(body.meal_name, MEALS)) {
    return NextResponse.json({ error: 'saved_meal_id, entry_date and meal_name required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: meal } = await admin.from('saved_meals').select('id').eq('id', body.saved_meal_id).eq('user_id', auth.userId).maybeSingle()
  if (!meal) return NextResponse.json({ error: 'Saved meal not found.' }, { status: 404 })

  const { data: items, error: readErr } = await admin
    .from('saved_meal_items')
    .select('food_id, food_name, serving_size, servings, calories, protein_g, carbs_g, fat_g')
    .eq('saved_meal_id', meal.id)
    .order('sort_order', { ascending: true })
  if (readErr) return dbError(readErr)
  if (!items || items.length === 0) return NextResponse.json({ error: 'This saved meal has no items.' }, { status: 400 })

  const { data, error } = await admin
    .from('food_entries')
    .insert(items.map(i => ({ ...i, user_id: auth.userId, entry_date: body.entry_date, meal_name: body.meal_name })))
    .select()
  if (error) return dbError(error)
  return NextResponse.json({ inserted: data }, { status: 201 })
}
