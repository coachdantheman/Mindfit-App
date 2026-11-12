import type { SupabaseClient } from '@supabase/supabase-js'
import { consentFlags } from '@/lib/consent-flags'

const EMAIL_IN_TEXT = /[^\s@,;"'<>()[\]]+@[^\s@,;"'<>()[\]]+\.[^\s@,;"'<>()[\]]+/g
export const MAX_BULK = 200

// Pulls every email out of free text: one per line, comma-separated,
// CSV rows, "Name <a@b.com>". Lower-cased and de-duplicated.
export function extractEmails(text: string): string[] {
  const seen = new Set<string>()
  for (const m of text.match(EMAIL_IN_TEXT) ?? []) {
    const e = m.toLowerCase().replace(/^[.\-]+|[.\-]+$/g, '')
    if (e && !seen.has(e)) seen.add(e)
    if (seen.size >= MAX_BULK) break
  }
  return [...seen]
}

// "Jordan Lee, jordan@x.com" or "jordan@x.com,Jordan Lee" -> name per email.
export function extractNames(text: string): Map<string, string> {
  const names = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const emails = line.match(EMAIL_IN_TEXT)
    if (!emails || emails.length !== 1) continue
    const rest = line.replace(emails[0], '').replace(/[<>"']/g, '').split(/[,;\t]/).map(s => s.trim()).filter(Boolean)
    const name = rest.find(s => /^[A-Za-z][A-Za-z' .-]{1,60}$/.test(s))
    if (name) names.set(emails[0].toLowerCase(), name)
  }
  return names
}

export type LinkKind = 'coach' | 'parent'
export type LinkOutcome = 'linked' | 'already_linked' | 'requested' | 'invited' | 'already_invited' | 'blocked'

// Link requester -> email holder if they have an account, otherwise queue
// it for the signup trigger. Coach: requester is the coach, the email is
// the athlete, and an existing athlete gets a request to accept (v33) —
// a coach never sees an existing account's data without the athlete's OK.
// Parent: requester is the athlete, the email is the parent; an existing
// parent account gets a request to accept (v50).
export async function linkOrQueue(
  admin: SupabaseClient,
  { email, requesterId, kind, teamId = null, direct = false }: { email: string; requesterId: string; kind: LinkKind; teamId?: string | null; direct?: boolean }
): Promise<{ outcome: LinkOutcome; userId: string | null }> {
  // An under-13 athlete's parent is linked through the consent flow
  // (grantConsent); letting the child add more "parents" would bypass the
  // parent's choice about who sees their data.
  if (kind === 'parent' && (await consentFlags(admin, requesterId)).under13) {
    return { outcome: 'blocked', userId: null }
  }

  const { data: profile } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle()

  if (profile) {
    if (kind === 'parent' && (profile.role === 'coach' || profile.role === 'admin')) {
      return { outcome: 'blocked', userId: profile.id }
    }
    if (kind === 'coach' && (await consentFlags(admin, profile.id)).coachesBlocked) {
      return { outcome: 'blocked', userId: profile.id }
    }
    if (kind === 'coach') {
      const { data: link } = await admin.from('coach_athletes').select('id')
        .eq('coach_id', requesterId).eq('athlete_id', profile.id).maybeSingle()
      if (link) return { outcome: 'already_linked', userId: profile.id }
      const { error } = await admin.from('coach_link_requests')
        .upsert({ coach_id: requesterId, athlete_id: profile.id, team_id: teamId }, { onConflict: 'coach_id,athlete_id' })
      if (error) throw error
      return { outcome: 'requested', userId: profile.id }
    }
    // The parent already acted (signed the consent form): link straight away.
    if (direct) {
      const { error } = await admin.from('parent_athletes').insert({ parent_id: profile.id, athlete_id: requesterId })
      if (error && error.code !== '23505') throw error
      return { outcome: error ? 'already_linked' : 'linked', userId: profile.id }
    }
    // Parent with an account: they accept in the app before seeing anything (v50).
    const { data: link } = await admin.from('parent_athletes').select('id')
      .eq('parent_id', profile.id).eq('athlete_id', requesterId).maybeSingle()
    if (link) return { outcome: 'already_linked', userId: profile.id }
    const { error } = await admin.from('parent_link_requests')
      .upsert({ parent_id: profile.id, athlete_id: requesterId }, { onConflict: 'parent_id,athlete_id' })
    if (error) throw error
    return { outcome: 'requested', userId: profile.id }
  }

  const { error } = await admin.from('pending_links').insert({ email, requester_id: requesterId, kind })
  if (error && error.code !== '23505') throw error
  return { outcome: error ? 'already_invited' : 'invited', userId: null }
}
