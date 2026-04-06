import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('workout_categories')
    .select('*, workouts(count)')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const categories = (data ?? []).map((c: any) => ({
    ...c,
    workout_count: c.workouts?.[0]?.count ?? 0,
    workouts: undefined,
  }))

  return NextResponse.json(categories)
}
