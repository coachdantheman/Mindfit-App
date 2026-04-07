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

  if (sorted.length < 10) {
    const defaults = [
      { food_name: 'Grilled Chicken Breast', meal_name: 'Lunch', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, count: 0 },
      { food_name: 'Scrambled Eggs (3)', meal_name: 'Breakfast', calories: 220, protein_g: 18, carbs_g: 2, fat_g: 15, count: 0 },
      { food_name: 'Oatmeal with Banana', meal_name: 'Breakfast', calories: 270, protein_g: 7, carbs_g: 50, fat_g: 4, count: 0 },
      { food_name: 'Protein Shake', meal_name: 'Snack', calories: 160, protein_g: 30, carbs_g: 5, fat_g: 2, count: 0 },
      { food_name: 'Rice & Chicken Bowl', meal_name: 'Lunch', calories: 450, protein_g: 35, carbs_g: 50, fat_g: 8, count: 0 },
      { food_name: 'Salmon Fillet', meal_name: 'Dinner', calories: 280, protein_g: 34, carbs_g: 0, fat_g: 16, count: 0 },
      { food_name: 'Sweet Potato (medium)', meal_name: 'Lunch', calories: 103, protein_g: 2, carbs_g: 24, fat_g: 0, count: 0 },
      { food_name: 'Greek Yogurt with Honey', meal_name: 'Snack', calories: 180, protein_g: 15, carbs_g: 20, fat_g: 5, count: 0 },
      { food_name: 'Banana & Peanut Butter', meal_name: 'Snack', calories: 290, protein_g: 8, carbs_g: 34, fat_g: 16, count: 0 },
      { food_name: 'Turkey Sandwich', meal_name: 'Lunch', calories: 350, protein_g: 28, carbs_g: 35, fat_g: 10, count: 0 },
      { food_name: 'Pasta with Meat Sauce', meal_name: 'Dinner', calories: 480, protein_g: 25, carbs_g: 60, fat_g: 14, count: 0 },
      { food_name: 'Overnight Oats', meal_name: 'Breakfast', calories: 310, protein_g: 12, carbs_g: 45, fat_g: 9, count: 0 },
    ]
    const existing = new Set(sorted.map(s => s.food_name.toLowerCase()))
    for (const d of defaults) {
      if (sorted.length >= 10) break
      if (!existing.has(d.food_name.toLowerCase())) sorted.push(d)
    }
  }

  return NextResponse.json(sorted)
}
