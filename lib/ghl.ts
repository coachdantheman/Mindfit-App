import { createAdminClient } from '@/lib/supabase-server'
import { isAdult } from '@/lib/age'

type GhlProfile = { role?: string | null; birth_year?: number | null; birth_month?: number | null }

// Only adults go to the contact system: coaches, parents and admins, plus
// athletes who are 18 or older. Athletes under 18 are never sent.
export function ghlEligible(p: GhlProfile, now = new Date()): boolean {
  return (p.role != null && p.role !== 'member') || isAdult(p, now)
}

// Pushes contacts to the GoHighLevel inbound webhook (a GHL workflow with
// an Inbound Webhook trigger + Create/Update Contact action, which upserts
// by email). No-ops when GHL_WEBHOOK_URL is unset.

async function postToGhl(payload: { email: string; name?: string; event: string }) {
  const url = process.env.GHL_WEBHOOK_URL
  if (!url) return false
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 400 * 3 ** (attempt - 1)))
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'mindfit-app' }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) return true
      lastError = new Error(`GHL webhook responded ${res.status}`)
      if (res.status < 500 && res.status !== 429) break
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

// One-time signup sync for adults only (see ghlEligible). Claim-first so concurrent renders can't double-send;
// the claim is rolled back on failure so the next request retries.
export async function maybeSyncToGhl(userId: string): Promise<void> {
  if (!process.env.GHL_WEBHOOK_URL) return
  const admin = createAdminClient()

  const { data: who } = await admin.from('profiles').select('role, birth_year, birth_month').eq('id', userId).maybeSingle()
  if (!who || !ghlEligible(who)) return

  const { data: claimed } = await admin
    .from('profiles')
    .update({ ghl_synced_at: new Date().toISOString() })
    .eq('id', userId)
    .is('ghl_synced_at', null)
    .eq('consent_status', 'not_required')
    .select('email, full_name')
    .maybeSingle()
  if (!claimed?.email) return

  try {
    await postToGhl({
      email: claimed.email,
      name: claimed.full_name ?? undefined,
      event: 'signup',
    })
  } catch (err) {
    console.error('ghl sync failed, will retry on next request:', err)
    await admin.from('profiles').update({ ghl_synced_at: null }).eq('id', userId)
  }
}

// Unconditional update send (e.g. onboarding adds the name after the
// signup event already fired). GHL upserts the contact by email.
export async function pushGhlEvent(
  profile: { email: string; name?: string | null },
  event: string
): Promise<void> {
  try {
    await postToGhl({ email: profile.email, name: profile.name ?? undefined, event })
  } catch (err) {
    console.error(`ghl event ${event} failed:`, err)
  }
}
