import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import { deleteUserCompletely, isLastAdmin } from '@/lib/account-delete'

// Self-service "delete my account and all my data".
export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  if (body.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 })
  if (auth.role === 'admin' && await isLastAdmin(auth.userId)) {
    return NextResponse.json({ error: 'You are the only admin. Make someone else an admin first.' }, { status: 400 })
  }

  try {
    const result = await deleteUserCompletely(auth.userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('Account deletion failed:', e?.message)
    return NextResponse.json({ error: 'Could not delete your account. Please contact support.' }, { status: 500 })
  }
}
