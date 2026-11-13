import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { isISODate, isPlainObject } from '@/lib/validate'

const KINDS = ['morning', 'night'] as const
type Kind = typeof KINDS[number]

function isKind(v: unknown): v is Kind {
  return typeof v === 'string' && (KINDS as readonly string[]).includes(v)
}

// GET /api/mindset/routine?day=YYYY-MM-DD — which routines are done that day
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const day = new URL(req.url).searchParams.get('day')
  if (!isISODate(day)) return NextResponse.json({ error: 'A valid day is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('routine_logs')
    .select('kind')
    .eq('user_id', auth.userId)
    .eq('day', day)

  if (error) return dbError(error)
  const kinds = new Set((data ?? []).map(r => r.kind))
  return NextResponse.json({ morning: kinds.has('morning'), night: kinds.has('night') })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isISODate(body.day) || !isKind(body.kind)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('routine_logs')
    .upsert({ user_id: auth.userId, day: body.day, kind: body.kind }, { onConflict: 'user_id,day,kind', ignoreDuplicates: true })

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const params = new URL(req.url).searchParams
  const day = params.get('day')
  const kind = params.get('kind')
  if (!isISODate(day) || !isKind(kind)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('routine_logs')
    .delete()
    .eq('user_id', auth.userId)
    .eq('day', day)
    .eq('kind', kind)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
