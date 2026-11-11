import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyLockedApiUser } from '@/lib/api-auth'
import { AGE_BLOCK_COOKIE, isUnder13, validBirth } from '@/lib/age'
import { deleteUserCompletely } from '@/lib/account-delete'
import { recordBirth } from '@/lib/consent'

export async function POST(req: Request) {
  const auth = await verifyLockedApiUser('member')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const birth = validBirth(body.year, body.month)
  if (!birth) return NextResponse.json({ error: 'Pick a valid month and year.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('birth_year').eq('id', auth.userId).single()
  if (profile?.birth_year != null) {
    return NextResponse.json({ error: 'Your birthday is already saved. Email daniel@mindfit.academy to change it.' }, { status: 409 })
  }

  // MindFit is 13 and older. Nothing is kept for a younger child: the
  // account that was just created is removed.
  if (isUnder13({ birth_year: birth.year, birth_month: birth.month })) {
    try {
      await deleteUserCompletely(auth.userId)
    } catch (e: any) {
      console.error('under-13 account removal failed:', e?.message)
      return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
    }
    const res = NextResponse.json({ status: 'too_young' })
    res.cookies.set(AGE_BLOCK_COOKIE, '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
    return res
  }

  try {
    const status = await recordBirth(admin, auth.userId, birth)
    return NextResponse.json({ status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Could not save your birthday.' }, { status: 500 })
  }
}
