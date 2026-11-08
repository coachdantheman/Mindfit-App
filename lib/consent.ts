import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { linkOrQueue } from '@/lib/links'
import { deleteUserCompletely } from '@/lib/account-delete'
import { CONSENT_WINDOW_DAYS, isUnder13, type ConsentStatus } from '@/lib/age'
export { consentFlags } from '@/lib/consent-flags'

// Bump when the parent notice text changes; stored with every consent.
export const NOTICE_VERSION = '2026-11-07'

export interface ConsentChoices {
  shareCoaches: boolean
  ai: boolean
  leaderboard: boolean
}

interface HeldLinks { coaches: string[]; teams: string[] }

export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

// Coaches and teams are third parties under COPPA: their links come off
// while consent is pending and go back only if the parent allows it.
async function holdLinks(admin: SupabaseClient, athleteId: string): Promise<void> {
  const [{ data: coaches }, { data: teams }, { data: profile }] = await Promise.all([
    admin.from('coach_athletes').select('coach_id').eq('athlete_id', athleteId),
    admin.from('team_members').select('team_id').eq('athlete_id', athleteId),
    admin.from('profiles').select('consent_held_links').eq('id', athleteId).single(),
  ])
  const prev = (profile?.consent_held_links ?? { coaches: [], teams: [] }) as HeldLinks
  const held: HeldLinks = {
    coaches: [...new Set([...prev.coaches, ...(coaches ?? []).map(r => r.coach_id)])],
    teams: [...new Set([...prev.teams, ...(teams ?? []).map(r => r.team_id)])],
  }
  const { error } = await admin.from('profiles').update({ consent_held_links: held }).eq('id', athleteId)
  if (error) throw error
  await Promise.all([
    admin.from('coach_athletes').delete().eq('athlete_id', athleteId),
    admin.from('team_members').delete().eq('athlete_id', athleteId),
  ])
}

async function restoreLinks(admin: SupabaseClient, athleteId: string, held: HeldLinks): Promise<void> {
  if (held.teams.length) {
    await admin.from('team_members').upsert(
      held.teams.map(team_id => ({ team_id, athlete_id: athleteId })),
      { onConflict: 'team_id,athlete_id', ignoreDuplicates: true }
    )
  }
  if (held.coaches.length) {
    await admin.from('coach_athletes').upsert(
      held.coaches.map(coach_id => ({ coach_id, athlete_id: athleteId })),
      { onConflict: 'coach_id,athlete_id', ignoreDuplicates: true }
    )
  }
}

// Saves the birth month/year once. Under 13 locks the account until a
// parent consents. Returns the resulting status.
export async function recordBirth(
  admin: SupabaseClient,
  athleteId: string,
  birth: { year: number; month: number }
): Promise<ConsentStatus> {
  const under13 = isUnder13({ birth_year: birth.year, birth_month: birth.month })
  const update: Record<string, unknown> = { birth_year: birth.year, birth_month: birth.month }
  if (under13) {
    Object.assign(update, {
      consent_status: 'pending',
      consent_requested_at: new Date().toISOString(),
      consent_share_coaches: false,
      consent_ai: false,
      consent_leaderboard: false,
      leaderboard_visible: false,
    })
  }
  const { error } = await admin.from('profiles').update(update).eq('id', athleteId).is('birth_year', null)
  if (error) throw error
  if (under13) await holdLinks(admin, athleteId)
  return under13 ? 'pending' : 'not_required'
}

// New request supersedes any earlier one for this athlete. Returns the raw
// token for the email link; only its hash is stored.
export async function createConsentRequest(
  admin: SupabaseClient,
  athleteId: string,
  parentEmail: string
): Promise<string> {
  await admin.from('parental_consents').update({ status: 'superseded' }).eq('athlete_id', athleteId).eq('status', 'pending')
  const token = newToken()
  const { error } = await admin.from('parental_consents').insert({
    athlete_id: athleteId,
    parent_email: parentEmail,
    token_hash: hashToken(token),
    notice_version: NOTICE_VERSION,
  })
  if (error) throw error
  return token
}

export async function findConsentByToken(admin: SupabaseClient, token: string) {
  if (!token || token.length > 100) return null
  const { data } = await admin
    .from('parental_consents')
    .select('*, athlete:profiles!parental_consents_athlete_id_fkey(id, full_name, email, consent_status, consent_share_coaches, consent_ai, consent_leaderboard, consent_held_links)')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  return data ?? null
}

// Parent consented (first time or changing choices later).
export async function grantConsent(
  admin: SupabaseClient,
  consent: { id: string; athlete_id: string; parent_email: string },
  choices: ConsentChoices,
  meta: { parentName: string; relationship: 'parent' | 'legal_guardian'; ip: string | null; userAgent: string | null }
): Promise<void> {
  const { data: profile } = await admin
    .from('profiles').select('consent_status, consent_held_links').eq('id', consent.athlete_id).single()
  if (!profile) throw new Error('Athlete not found')

  const { error: cErr } = await admin.from('parental_consents').update({
    status: 'granted',
    decided_at: new Date().toISOString(),
    parent_name: meta.parentName,
    relationship: meta.relationship,
    share_coaches: choices.shareCoaches,
    ai_features: choices.ai,
    leaderboard: choices.leaderboard,
    ip: meta.ip,
    user_agent: meta.userAgent?.slice(0, 300) ?? null,
  }).eq('id', consent.id)
  if (cErr) throw cErr

  const held = (profile.consent_held_links ?? { coaches: [], teams: [] }) as HeldLinks
  if (choices.shareCoaches) {
    await restoreLinks(admin, consent.athlete_id, held)
  } else {
    await holdLinks(admin, consent.athlete_id)
  }

  const { error: pErr } = await admin.from('profiles').update({
    consent_status: 'granted',
    consent_share_coaches: choices.shareCoaches,
    consent_ai: choices.ai,
    consent_leaderboard: choices.leaderboard,
    leaderboard_visible: choices.leaderboard,
    consent_held_links: choices.shareCoaches ? { coaches: [], teams: [] } : undefined,
  }).eq('id', consent.athlete_id)
  if (pErr) throw pErr

  if (profile.consent_status !== 'granted') {
    await linkOrQueue(admin, { email: consent.parent_email.toLowerCase(), requesterId: consent.athlete_id, kind: 'parent' }).catch(e => {
      console.error('parent link after consent failed:', e?.message)
    })
  }
}

// Pending accounts with no consent after the window are deleted, along
// with the parent email collected to ask for consent.
export async function purgeExpiredConsents(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - CONSENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await admin
    .from('profiles').select('id').eq('consent_status', 'pending').lt('consent_requested_at', cutoff)
  let removed = 0
  for (const row of data ?? []) {
    try { await deleteUserCompletely(row.id); removed++ } catch (e: any) { console.error('consent purge failed:', row.id, e?.message) }
  }
  return removed
}
