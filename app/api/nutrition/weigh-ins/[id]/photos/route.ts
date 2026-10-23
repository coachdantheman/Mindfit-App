import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { PHOTO_SLOTS, PhotoSlot } from '@/lib/images'

export const maxDuration = 30

const BUCKET = 'progress-photos'
const SIGNED_TTL = 60 * 60
const MAX_BYTES = 8 * 1024 * 1024
const MIME = ['image/jpeg', 'image/png', 'image/webp']

async function ownWeighIn(admin: ReturnType<typeof createAdminClient>, id: string, userId: string) {
  const { data } = await admin.from('weigh_ins').select('id').eq('id', id).eq('user_id', userId).maybeSingle()
  return !!data
}

async function signed(admin: ReturnType<typeof createAdminClient>, rows: { id: string; slot: string; storage_path: string }[]) {
  const out = []
  for (const r of rows) {
    const { data } = await admin.storage.from(BUCKET).createSignedUrl(r.storage_path, SIGNED_TTL)
    if (data?.signedUrl) out.push({ id: r.id, slot: r.slot, url: data.signedUrl })
  }
  return out
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('progress_photos')
    .select('id, slot, storage_path')
    .eq('weigh_in_id', params.id)
    .eq('user_id', auth.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(await signed(admin, data ?? []))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const form = await req.formData()
  const slot = form.get('slot')
  const file = form.get('file')
  if (typeof slot !== 'string' || !(PHOTO_SLOTS as readonly string[]).includes(slot)) {
    return NextResponse.json({ error: 'slot must be front, side or back' }, { status: 400 })
  }
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: 'No photo received' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Photo is too large (8 MB max)' }, { status: 413 })
  if (!MIME.includes(file.type)) return NextResponse.json({ error: 'Use a JPEG, PNG or WebP image' }, { status: 415 })

  const admin = createAdminClient()
  if (!(await ownWeighIn(admin, params.id, auth.userId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${auth.userId}/${params.id}/${slot}.${ext}`
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data, error } = await admin
    .from('progress_photos')
    .upsert({ user_id: auth.userId, weigh_in_id: params.id, slot: slot as PhotoSlot, storage_path: path }, { onConflict: 'weigh_in_id,slot' })
    .select('id, slot, storage_path')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [photo] = await signed(admin, [data])
  return NextResponse.json(photo, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const slot = new URL(req.url).searchParams.get('slot')
  if (!slot) return NextResponse.json({ error: 'slot required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('progress_photos')
    .select('id, storage_path')
    .eq('weigh_in_id', params.id)
    .eq('user_id', auth.userId)
    .eq('slot', slot)
    .maybeSingle()
  if (!row) return NextResponse.json({ ok: true })

  await admin.storage.from(BUCKET).remove([row.storage_path])
  const { error } = await admin.from('progress_photos').delete().eq('id', row.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
