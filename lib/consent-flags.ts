import type { SupabaseClient } from '@supabase/supabase-js'
import { isUnder13, type ConsentStatus } from '@/lib/age'

// What an athlete under 13 may do, per their parent's choices. Kept apart
// from lib/consent.ts so lib/links.ts and lib/teams.ts can import it.
export async function consentFlags(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from('profiles')
    .select('role, birth_year, birth_month, consent_status, consent_share_coaches, consent_ai, consent_leaderboard')
    .eq('id', userId)
    .maybeSingle()
  const under13 = !!data && data.role === 'member' && isUnder13(data)
  const status = (data?.consent_status ?? 'not_required') as ConsentStatus
  return {
    under13,
    status,
    coachesBlocked: status === 'pending' || (under13 && !data?.consent_share_coaches),
    aiBlocked: status === 'pending' || (under13 && !data?.consent_ai),
    leaderboardBlocked: status === 'pending' || (under13 && !data?.consent_leaderboard),
    photosBlocked: under13 || status === 'pending',
  }
}
