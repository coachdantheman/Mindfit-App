import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

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
  const mode = body.mode || 'absolute'
  let calories = body.calories || 2000
  let protein_g = body.protein_g || 150
  let carbs_g = body.carbs_g || 250
  let fat_g = body.fat_g || 65
  const protein_pct = body.protein_pct ?? 30
  const carbs_pct = body.carbs_pct ?? 40
  const fat_pct = body.fat_pct ?? 30

  if (mode === 'percentage') {
    if (protein_pct + carbs_pct + fat_pct !== 100) {
      return NextResponse.json({ error: 'Macro percentages must sum to 100' }, { status: 400 })
    }
    protein_g = Math.round((calories * protein_pct / 100) / 4)
    carbs_g = Math.round((calories * carbs_pct / 100) / 4)
    fat_g = Math.round((calories * fat_pct / 100) / 9)
  }

  const admin = createAdminClient()
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
