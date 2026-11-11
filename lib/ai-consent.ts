import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Null when the user has allowed AI features; otherwise a 403 for the client to answer with the consent sheet.
export async function requireAiConsent(admin: SupabaseClient, userId: string): Promise<NextResponse | null> {
  const { data } = await admin
    .from('profiles')
    .select('ai_consent_at')
    .eq('id', userId)
    .maybeSingle()
  if (data?.ai_consent_at) return null
  return NextResponse.json({ error: 'Allow AI features first.', needsAiConsent: true }, { status: 403 })
}
