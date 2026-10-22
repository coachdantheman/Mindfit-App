import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, optionalString, requireString } from '@/lib/validate'

const CATEGORIES = ['protein', 'carb', 'fruit_veg', 'dairy', 'snack', 'drink', 'fast_food', 'meal', 'supplement', 'other']

// Global curated foods plus the user's own. The client caches the whole
// list and searches locally, so there is no server-side query param.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('foods')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${auth.userId}`)
    .order('name', { ascending: true })
    .limit(1500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const name = requireString(body.name, 120)
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('foods')
    .insert({
      user_id: auth.userId,
      name,
      brand: optionalString(body.brand, 80),
      category: CATEGORIES.includes(body.category) ? body.category : 'other',
      serving_size: requireString(body.serving_size, 60) ?? '1 serving',
      serving_grams: body.serving_grams != null ? clampNumber(body.serving_grams, 0, 5000) : null,
      calories: Math.round(clampNumber(body.calories ?? 0, 0, 5000) ?? 0),
      protein_g: clampNumber(body.protein_g ?? 0, 0, 500) ?? 0,
      carbs_g: clampNumber(body.carbs_g ?? 0, 0, 500) ?? 0,
      fat_g: clampNumber(body.fat_g ?? 0, 0, 500) ?? 0,
      source: body.source === 'ai' ? 'ai' : 'user',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
