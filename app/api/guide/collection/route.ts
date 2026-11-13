import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { isPlainObject } from '@/lib/validate'
import { isGuideKey } from '@/lib/guide-characters'
import { loadCollection } from '@/lib/guide-unlocks'

// GET /api/guide/collection — the characters this athlete owns, awarding any newly earned
export async function GET() {
  const auth = await verifyApiUser('member', 'admin')
  if (auth instanceof NextResponse) return auth
  try {
    return NextResponse.json(await loadCollection(createAdminClient(), auth.userId))
  } catch (error) {
    return dbError(error as { message?: string })
  }
}

// POST /api/guide/collection { seen: [...] } — the athlete has been told about these
export async function POST(req: Request) {
  const auth = await verifyApiUser('member', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  const keys = isPlainObject(body) && Array.isArray(body.seen) ? body.seen.filter(isGuideKey).slice(0, 30) : []
  if (!keys.length) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { error } = await createAdminClient().from('guide_unlocks').update({ seen: true }).eq('user_id', auth.userId).in('key', keys)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
