import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isUUID } from '@/lib/validate'

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  if (!isUUID(params.id)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('foods')
    .delete()
    .eq('id', params.id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
