import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isPlainObject, isUUID } from '@/lib/validate'

// The athlete's favorite cue words (kind 'cue') and physical triggers
// (kind 'trigger') for the Attach step. Only favorited words are stored.
const KINDS = new Set(['cue', 'trigger'])

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flow_cue_words')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const word = typeof body.cue_word === 'string' ? body.cue_word.trim().slice(0, 40) : ''
  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : 'cue'
  if (!word) return NextResponse.json({ error: 'cue_word required' }, { status: 400 })

  const admin = createAdminClient()
  const { count } = await admin.from('flow_cue_words').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId)
  if ((count ?? 0) >= 60) return NextResponse.json({ error: 'You have 60 favorites. Remove one first.' }, { status: 400 })

  const { data, error } = await admin
    .from('flow_cue_words')
    .insert({ user_id: auth.userId, cue_word: word, kind, is_active: true })
    .select()
    .single()

  if (error) {
    // Case-insensitive duplicate (unique index on lower(cue_word)): return the existing row.
    if (error.code === '23505') {
      const { data: row } = await admin.from('flow_cue_words').select('*').eq('user_id', auth.userId).eq('kind', kind).ilike('cue_word', word.replace(/[\\%_]/g, '\\$&')).maybeSingle()
      if (row) return NextResponse.json(row)
    }
    return dbError(error)
  }
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('flow_cue_words').delete().eq('id', body.id).eq('user_id', auth.userId)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
