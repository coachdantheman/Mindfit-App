import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate } from '@/lib/validate'
import { MEALS } from '@/lib/nutrition'

// Copy one meal (or the whole day) from one date to another.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (!isISODate(body.from_date) || !isISODate(body.to_date)) {
    return NextResponse.json({ error: 'from_date and to_date required' }, { status: 400 })
  }
  const meal = (MEALS as readonly string[]).includes(body.meal_name) ? body.meal_name : null

  const admin = createAdminClient()
  let query = admin
    .from('food_entries')
    .select('meal_name, food_name, food_id, servings, serving_size, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', auth.userId)
    .eq('entry_date', body.from_date)
    .order('created_at', { ascending: true })
  if (meal) query = query.eq('meal_name', meal)

  const { data: source, error: readErr } = await query
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!source || source.length === 0) {
    return NextResponse.json({ error: 'Nothing logged on that day.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('food_entries')
    .insert(source.map(r => ({ ...r, user_id: auth.userId, entry_date: body.to_date })))
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data }, { status: 201 })
}
