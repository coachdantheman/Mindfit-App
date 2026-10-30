import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { sendCoachInviteEmail } from '@/lib/email'
import { extractEmails, extractNames, linkOrQueue, MAX_BULK } from '@/lib/links'
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
        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name, invited_by: auth.userId },
        })
        if (error || !created.user) return { email, status: 'error', message: error?.message ?? 'Could not create account.' }

        await admin.from('coach_athletes').insert({ coach_id: auth.userId, athlete_id: created.user.id })
        await admin.from('pending_links').delete().eq('email', email)
        await admin.from('approved_emails').upsert(
          { email, added_by: auth.userId, notes: 'bulk add', full_name, registered: true },
          { onConflict: 'email', ignoreDuplicates: true }
        )
        void sendCoachInviteEmail(email, me?.full_name, full_name)
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
