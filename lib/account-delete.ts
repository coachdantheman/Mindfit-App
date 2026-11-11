import { createAdminClient } from '@/lib/supabase-server'
import { pushGhlEvent } from '@/lib/ghl'

const PHOTO_BUCKET = 'progress-photos'

// Removes everything the app holds for a user. Storage objects first
// (no cascade covers them), then the auth user, which cascades through
// profiles into every per-user table.
export async function deleteUserCompletely(userId: string): Promise<{ photosRemoved: number }> {
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('email, full_name, consent_status').eq('id', userId).maybeSingle()

  // Everything under <userId>/ in the bucket, not just paths still listed in
  // progress_photos: deleted weigh-ins and re-uploads leave objects behind.
  const { data: photos } = await admin.from('progress_photos').select('storage_path').eq('user_id', userId)
  const paths = new Set((photos ?? []).map(p => p.storage_path).filter(Boolean))
  for (const p of await listUserPhotoObjects(userId)) paths.add(p)
  const photosRemoved = await removePhotoObjects([...paths])

  if (profile?.email) {
    const email = profile.email.toLowerCase()
    await Promise.all([
      admin.from('pending_links').delete().or(`requester_id.eq.${userId},email.eq.${email}`),
      admin.from('approved_emails').delete().eq('email', email),
    ])
    if (profile.consent_status === 'not_required') void pushGhlEvent({ email, name: profile.full_name }, 'account_deleted')
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  return { photosRemoved }
}

// Objects live at <userId>/<weighInId>/<slot>.<ext>.
export async function listUserPhotoObjects(userId: string, weighInId?: string): Promise<string[]> {
  const bucket = createAdminClient().storage.from(PHOTO_BUCKET)
  const folders = weighInId
    ? [weighInId]
    : ((await bucket.list(userId, { limit: 1000 })).data ?? []).map(f => f.name)
  const out: string[] = []
  for (const folder of folders) {
    const { data } = await bucket.list(`${userId}/${folder}`, { limit: 100 })
    for (const f of data ?? []) out.push(`${userId}/${folder}/${f.name}`)
  }
  return out
}

export async function removePhotoObjects(paths: string[]): Promise<number> {
  const bucket = createAdminClient().storage.from(PHOTO_BUCKET)
  let removed = 0
  for (let i = 0; i < paths.length; i += 100) {
    const { data, error } = await bucket.remove(paths.slice(i, i + 100))
    if (error) console.error('progress photo cleanup failed:', error.message)
    else removed += data?.length ?? 0
  }
  return removed
}

export async function isLastAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id').eq('role', 'admin')
  const admins = (data ?? []).map(r => r.id)
  return admins.length <= 1 && admins.includes(userId)
}
