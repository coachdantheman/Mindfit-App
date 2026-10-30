import type { SupabaseClient } from '@supabase/supabase-js'

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
export type LinkOutcome = 'linked' | 'already_linked' | 'invited' | 'already_invited'

// Link requester -> email holder now if they have an account, otherwise
// queue it for the signup trigger. Coach: requester is the coach, the
// email is the athlete. Parent: requester is the athlete, the email is
// the parent.
export async function linkOrQueue(
  admin: SupabaseClient,
  { email, requesterId, kind }: { email: string; requesterId: string; kind: LinkKind }
): Promise<{ outcome: LinkOutcome; userId: string | null }> {
  const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()

  if (profile) {
    const row = kind === 'coach'
      ? { coach_id: requesterId, athlete_id: profile.id }
      : { parent_id: profile.id, athlete_id: requesterId }
    const { error } = await admin.from(kind === 'coach' ? 'coach_athletes' : 'parent_athletes').insert(row)
    if (error && error.code !== '23505') throw error
    return { outcome: error ? 'already_linked' : 'linked', userId: profile.id }
  }

  const { error } = await admin.from('pending_links').insert({ email, requester_id: requesterId, kind })
  if (error && error.code !== '23505') throw error
  return { outcome: error ? 'already_invited' : 'invited', userId: null }
}
