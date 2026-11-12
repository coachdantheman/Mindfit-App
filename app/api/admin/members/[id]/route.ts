import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { deleteUserCompletely } from '@/lib/account-delete'
import { isUUID } from '@/lib/validate'

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth
  if (!isUUID(params.id)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  if (params.id === auth.userId) return NextResponse.json({ error: 'Delete your own account from Settings.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('role').eq('id', params.id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'admin') return NextResponse.json({ error: 'Admins cannot delete other admins.' }, { status: 403 })

  try {
    const result = await deleteUserCompletely(params.id)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Delete failed' }, { status: 500 })
  }
}
