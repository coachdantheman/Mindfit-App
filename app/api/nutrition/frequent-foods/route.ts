import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('food_entries')
    .select('food_name, meal_name, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = new Map<string, { food_name: string; meal_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; count: number }>()
  for (const e of data ?? []) {
    const key = e.food_name.toLowerCase()
    if (map.has(key)) {
      map.get(key)!.count++
    } else {
      map.set(key, { food_name: e.food_name, meal_name: e.meal_name, calories: e.calories, protein_g: Number(e.protein_g), carbs_g: Number(e.carbs_g), fat_g: Number(e.fat_g), count: 1 })
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10)
  return NextResponse.json(sorted)
}
