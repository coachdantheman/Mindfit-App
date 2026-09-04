import { createAdminClient } from '@/lib/supabase-server'

// Pushes contacts to the GoHighLevel inbound webhook (a GHL workflow with
// an Inbound Webhook trigger + Create/Update Contact action, which upserts
// by email). No-ops when GHL_WEBHOOK_URL is unset.

async function postToGhl(payload: { email: string; name?: string; event: string }) {
  const url = process.env.GHL_WEBHOOK_URL
  if (!url) return false
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, source: 'mindfit-app' }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`GHL webhook responded ${res.status}`)
  return true
}

// One-time signup sync. Claim-first so concurrent renders can't double-send;
// the claim is rolled back on failure so the next request retries.
export async function maybeSyncToGhl(userId: string): Promise<void> {
  if (!process.env.GHL_WEBHOOK_URL) return
  const admin = createAdminClient()

  const { data: claimed } = await admin
    .from('profiles')
    .update({ ghl_synced_at: new Date().toISOString() })
    .eq('id', userId)
    .is('ghl_synced_at', null)
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
