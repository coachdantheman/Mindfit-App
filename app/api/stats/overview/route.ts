import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { loadOverview } from '@/lib/overview-server'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  return NextResponse.json(await loadOverview(createAdminClient(), auth.userId))
}
