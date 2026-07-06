import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber } from '@/lib/validate'

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
  let calories = clampNumber(body.calories ?? existing?.calories ?? 2000, 0, 20000) ?? 2000
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
    protein_g = Math.round((calories * protein_pct / 100) / 4)
    carbs_g = Math.round((calories * carbs_pct / 100) / 4)
    fat_g = Math.round((calories * fat_pct / 100) / 9)
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
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
