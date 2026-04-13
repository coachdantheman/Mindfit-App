import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('food_entries')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('entry_date', date)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (!body.food_name?.trim()) return NextResponse.json({ error: 'Food name required' }, { status: 400 })

  const protein_g = body.protein_g || 0
  const carbs_g = body.carbs_g || 0
  const fat_g = body.fat_g || 0
  const calculatedCal = Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9)
  const calories = body.calories || calculatedCal || 0

  let warning: string | undefined
  if (body.calories && calculatedCal > 0) {
    const diff = Math.abs(body.calories - calculatedCal) / calculatedCal
    if (diff > 0.1) {
      warning = `Entered ${body.calories} cal but macros add up to ${calculatedCal} cal`
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('food_entries')
    .insert({
      user_id: auth.userId,
      entry_date: body.entry_date || new Date().toISOString().split('T')[0],
      meal_name: body.meal_name || 'Snack',
      food_name: body.food_name.trim(),
      calories,
      protein_g,
      carbs_g,
      fat_g,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, warning }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin
    .from('food_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
