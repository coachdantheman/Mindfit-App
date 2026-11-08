import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_workouts')
    .select('id, name, category, exercises, times_done, last_done_at')
    .eq('user_id', auth.userId)
    .order('last_done_at', { ascending: false })
    .limit(100)

  if (error) return dbError(error)
  return NextResponse.json(data)
}
