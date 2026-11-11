import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyLockedApiUser } from '@/lib/api-auth'
import { AGE_BLOCK_COOKIE, isUnder13, validBirth } from '@/lib/age'
import { deleteUserCompletely } from '@/lib/account-delete'
import { recordBirth } from '@/lib/consent'
import { MPI_DIMENSIONS } from '@/lib/mpi'
import { clampNumber, isISODate, optionalString } from '@/lib/validate'
import { pushGhlEvent, ghlEligible } from '@/lib/ghl'

// Saves everything from the pre-account /start flow right after signup.
// Runs as a locked user because the birthday is not saved yet (v31 lock).
export async function POST(req: Request) {
  const auth = await verifyLockedApiUser('member')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('profiles').select('birth_year, onboarded_at').eq('id', auth.userId).single()
  // An account that already finished onboarding keeps what it has.
  if (existing?.onboarded_at) return NextResponse.json({ status: 'existing' })

  if (existing?.birth_year == null) {
    const birth = validBirth(body.year, body.month)
    if (!birth) return NextResponse.json({ error: 'Pick a valid month and year.' }, { status: 400 })
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
      await recordBirth(admin, auth.userId, birth)
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Could not save your birthday.' }, { status: 500 })
    }
  }

  const scores: Record<string, number> = {}
  for (const d of MPI_DIMENSIONS) {
    const v = clampNumber(body.scores?.[d.key], 1, 10)
    if (v === null) return NextResponse.json({ error: 'All ten scores must be numbers between 1 and 10.' }, { status: 400 })
    scores[d.key] = v
  }
  if (!isISODate(body.week_date)) return NextResponse.json({ error: 'A valid week date is required.' }, { status: 400 })

  const { error: wErr } = await admin.from('weekly_assessments').upsert({
    user_id: auth.userId,
    week_date: body.week_date,
    ...scores,
    assessment_type: 'baseline',
  }, { onConflict: 'user_id,week_date,assessment_type' })
  if (wErr) {
    console.error('baseline save failed:', wErr.message)
    return NextResponse.json({ error: 'Could not save your score. Try again.' }, { status: 500 })
  }

  const update: Record<string, string> = { onboarded_at: new Date().toISOString() }
  const name = optionalString(body.name, 120)
  const sport = optionalString(body.sport, 60)
  if (name) update.full_name = name
  if (sport) update.primary_sport = sport

  const { data: profile, error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', auth.userId)
    .select('email, full_name, consent_status, role, birth_year, birth_month')
    .maybeSingle()
  if (error) {
    console.error('onboarding profile save failed:', error.message)
    return NextResponse.json({ error: 'Could not finish setup. Try again.' }, { status: 500 })
  }

  if (profile?.email && profile.consent_status === 'not_required' && ghlEligible(profile)) {
    void pushGhlEvent({ email: profile.email, name: profile.full_name }, 'onboarding_complete')
  }

  return NextResponse.json({ status: 'ok' })
}
