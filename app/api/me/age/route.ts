import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { validBirth } from '@/lib/age'
import { recordBirth } from '@/lib/consent'

export async function POST(req: Request) {
  const auth = await verifyApiUser('member')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const birth = validBirth(body.year, body.month)
  if (!birth) return NextResponse.json({ error: 'Pick a valid month and year.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('birth_year').eq('id', auth.userId).single()
  if (profile?.birth_year != null) {
    return NextResponse.json({ error: 'Your birthday is already saved. Email daniel@mindfit.academy to change it.' }, { status: 409 })
  }

  try {
    const status = await recordBirth(admin, auth.userId, birth)
    return NextResponse.json({ status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Could not save your birthday.' }, { status: 500 })
  }
}
