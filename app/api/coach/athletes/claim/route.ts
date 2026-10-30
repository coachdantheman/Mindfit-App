import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { sendCoachInviteEmail } from '@/lib/email'
import { extractEmails, extractNames, linkOrQueue, MAX_BULK } from '@/lib/links'
import { createInvitedAccount, signInLinkFor } from '@/lib/invites'
import type { ClaimResult } from '@/types'

// Bulk add: every email becomes an athlete linked to this coach right now.
// Accounts that don't exist are created (the athlete claims them at first
// sign-in); existing ones are linked in place.
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const text: string = typeof body.text === 'string' ? body.text : Array.isArray(body.emails) ? body.emails.join('\n') : ''
  const emails = extractEmails(text)
  const names = extractNames(text)
  if (emails.length === 0) return NextResponse.json({ error: 'No email addresses found.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('full_name').eq('id', auth.userId).single()

  const results: ClaimResult[] = []
  const chunks: string[][] = []
  for (let i = 0; i < emails.length && i < MAX_BULK; i += 10) chunks.push(emails.slice(i, i + 10))

  for (const chunk of chunks) {
    const settled = await Promise.all(chunk.map(async (email): Promise<ClaimResult> => {
      if (email === auth.email.toLowerCase()) return { email, status: 'invalid', message: 'That is your own email.' }
      try {
        const { outcome, userId } = await linkOrQueue(admin, { email, requesterId: auth.userId, kind: 'coach' })
        if (userId) return { email, status: outcome === 'linked' ? 'linked' : 'already_linked' }

        const full_name = names.get(email) ?? null
        const created = await createInvitedAccount(admin, { email, fullName: full_name, invitedBy: auth.userId, notes: 'bulk add' })
        if ('error' in created) return { email, status: 'error', message: created.error }

        await admin.from('coach_athletes').insert({ coach_id: auth.userId, athlete_id: created.userId })
        const link = await signInLinkFor(admin, email)
        void sendCoachInviteEmail(email, me?.full_name, full_name, link)
        return { email, status: 'created' }
      } catch (e: any) {
        return { email, status: 'error', message: e?.message ?? 'Failed' }
      }
    }))
    results.push(...settled)
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})
  return NextResponse.json({ results, summary })
}
