import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { sendCoachInviteEmail } from '@/lib/email'
import { extractEmails, extractNames, MAX_BULK } from '@/lib/links'
import { createInvitedAccount, signInLinkFor } from '@/lib/invites'
import type { ClaimResult } from '@/types'

// Admin invite: one email or a pasted roster. Every new address gets an
// athlete account and an email with a one-click sign-in link.
export async function POST(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const text: string = typeof body.text === 'string' ? body.text : ''
  const emails = extractEmails(text)
  const names = extractNames(text)
  if (emails.length === 0) return NextResponse.json({ error: 'No email addresses found.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('full_name').eq('id', auth.userId).single()

  const results: ClaimResult[] = []
  for (let i = 0; i < emails.length && i < MAX_BULK; i += 10) {
    const chunk = emails.slice(i, i + 10)
    const settled = await Promise.all(chunk.map(async (email): Promise<ClaimResult> => {
      if (email === auth.email.toLowerCase()) return { email, status: 'invalid', message: 'That is your own email.' }
      try {
        const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
        if (existing) return { email, status: 'exists' }

        const full_name = names.get(email) ?? null
        const created = await createInvitedAccount(admin, { email, fullName: full_name, invitedBy: auth.userId, notes: 'admin invite' })
        if ('error' in created) return { email, status: 'error', message: created.error }

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
