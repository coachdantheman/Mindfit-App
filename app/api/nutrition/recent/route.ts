import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import type { RecentFood } from '@/types'

// Last 30 distinct foods the user logged, newest first, with the
// serving they used last time so one tap re-logs it.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('food_entries')
    .select('food_name, food_id, serving_size, servings, calories, protein_g, carbs_g, fat_g, entry_date')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(150)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seen = new Set<string>()
  const recent: RecentFood[] = []
  for (const e of data ?? []) {
    const key = e.food_name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const servings = Number(e.servings) || 1
    recent.push({
      food_name: e.food_name,
      food_id: e.food_id,
      serving_size: e.serving_size,
      servings,
      // per-serving macros so the client can rescale
      calories: Math.round(e.calories / servings),
      protein_g: Math.round((Number(e.protein_g) / servings) * 10) / 10,
      carbs_g: Math.round((Number(e.carbs_g) / servings) * 10) / 10,
      fat_g: Math.round((Number(e.fat_g) / servings) * 10) / 10,
      last_logged: e.entry_date,
    })
    if (recent.length >= 30) break
  }
  return NextResponse.json(recent)
}
