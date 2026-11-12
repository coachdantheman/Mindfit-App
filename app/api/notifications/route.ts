import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isPlainObject, isUUID } from '@/lib/validate'

// In-app inbox: latest 50 plus the unread count for the bell.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const [{ data, error }, { count }] = await Promise.all([
    admin.from('notifications').select('id, type, title, body, url, created_at, read_at')
      .eq('user_id', auth.userId).order('created_at', { ascending: false }).limit(50),
    admin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId).is('read_at', null),
  ])
  if (error) return dbError(error)
  return NextResponse.json({ items: data ?? [], unread: count ?? 0 })
}

// Mark read: { ids: [...] } or {} for all.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  let q = createAdminClient().from('notifications').update({ read_at: new Date().toISOString() })
    .eq('user_id', auth.userId).is('read_at', null)
  if (isPlainObject(body) && Array.isArray(body.ids)) q = q.in('id', body.ids.filter(isUUID).slice(0, 100))
  const { error } = await q
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
