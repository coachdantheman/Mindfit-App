import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { VAULT } from '@/lib/data/quote-vault'
import { isPlainObject } from '@/lib/validate'

const KINDS = ['fav_quote', 'pin_person'] as const
type Kind = typeof KINDS[number]

const PERSON_KEYS = new Set(VAULT.map(p => p.key))
const QUOTE_IDS = new Set(VAULT.flatMap(p => p.quotes.map(q => q.id)))

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('vault_prefs')
    .select('kind, key')
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  const rows = data ?? []
  return NextResponse.json({
    favorites: rows.filter(r => r.kind === 'fav_quote').map(r => r.key),
    pinned: rows.filter(r => r.kind === 'pin_person').map(r => r.key),
  })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  let body: { kind?: unknown; key?: unknown; on?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const { kind, key, on } = body
  if (typeof kind !== 'string' || !(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }
  const validKey = typeof key === 'string' && (
    kind === 'pin_person' ? PERSON_KEYS.has(key) : QUOTE_IDS.has(key)
  )
  if (!validKey) return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  if (typeof on !== 'boolean') return NextResponse.json({ error: 'on must be boolean' }, { status: 400 })

  const admin = createAdminClient()
  const query = on
    ? admin.from('vault_prefs').upsert(
        { user_id: auth.userId, kind: kind as Kind, key },
        { onConflict: 'user_id,kind,key' },
      )
    : admin.from('vault_prefs').delete().eq('user_id', auth.userId).eq('kind', kind).eq('key', key)

  const { error } = await query
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
