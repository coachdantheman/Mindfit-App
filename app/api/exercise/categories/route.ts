import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
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

  if (error) return dbError(error)

  const categories = (data ?? []).map((c: any) => ({
    ...c,
    workout_count: c.workouts?.[0]?.count ?? 0,
    workouts: undefined,
  }))

  return NextResponse.json(categories)
}
